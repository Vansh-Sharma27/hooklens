const { spawn } = require('node:child_process');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

async function freePort() {
  return new Promise((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const { port } = probe.address();
      probe.close(() => resolve(port));
    });
  });
}

/**
 * Boot the real server in its own process so benchmark client work never shares
 * an event loop with the server under test. Rate limiting is disabled: the
 * default 100 req/min bucket would otherwise cap every run at that ceiling and
 * measure the limiter instead of the capture path.
 */
async function startServer({ storage = 'sqlite' } = {}) {
  const port = await freePort();
  const dbPath = path.join(os.tmpdir(), `hooklens-bench-${storage}-${Date.now()}.db`);

  const child = spawn(process.execPath, ['server/index.js'], {
    cwd: path.join(__dirname, '..', '..'),
    env: {
      ...process.env,
      PORT: String(port),
      STORAGE_TYPE: storage,
      DB_PATH: dbPath,
      RATE_LIMIT_ENABLED: 'false',
      NODE_ENV: 'production'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  child.stdout.resume();
  child.stderr.resume();

  const baseUrl = `http://127.0.0.1:${port}`;
  await waitForReady(baseUrl);

  return {
    baseUrl,
    storage,
    stop: async () => {
      child.kill();
      await new Promise(resolve => child.once('exit', resolve));
      for (const suffix of ['', '-wal', '-shm']) {
        try {
          fs.unlinkSync(dbPath + suffix);
        } catch {
          // benchmark scratch database, absence is fine
        }
      }
    }
  };
}

async function waitForReady(baseUrl, attempts = 60) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(`${baseUrl}/api/endpoints`, { method: 'POST' });
      if (res.ok) return;
    } catch {
      // not listening yet
    }
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`server at ${baseUrl} did not become ready`);
}

async function createEndpoint(baseUrl) {
  return (await fetch(`${baseUrl}/api/endpoints`, { method: 'POST' })).json();
}

module.exports = { startServer, createEndpoint, freePort };
