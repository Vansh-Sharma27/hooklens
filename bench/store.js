/**
 * Segment C - persistence cost, isolated from HTTP.
 *
 * better-sqlite3 is synchronous, so every store call runs on the event loop and
 * blocks all other connections for its duration. This measures each store
 * operation directly to show what the capture path pays per webhook before any
 * network cost is added.
 *
 * Usage: node bench/store.js [--storage sqlite|memory|both] [--iterations 2000]
 */
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

const { summarize, formatRow, formatHeader } = require('./lib/stats');

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag, fallback) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : fallback;
  };
  return {
    storage: get('--storage', 'both'),
    iterations: Number(get('--iterations', 2000))
  };
}

function makeRequest(index) {
  const body = JSON.stringify({ n: index, pad: 'x'.repeat(512) });
  return {
    id: `req${index.toString(36).padStart(8, '0')}`,
    timestamp: Date.now(),
    method: 'POST',
    path: '/hook/bench',
    headers: { 'content-type': 'application/json', 'user-agent': 'bench' },
    query: {},
    body,
    bodySize: Buffer.byteLength(body),
    contentType: 'application/json',
    isJson: true,
    parsedBody: { n: index },
    ip: '127.0.0.1',
    userAgent: 'bench'
  };
}

function timed(fn) {
  const start = performance.now();
  fn();
  return performance.now() - start;
}

function runBackend(storage, iterations) {
  const dbPath = path.join(os.tmpdir(), `hooklens-storebench-${Date.now()}.db`);

  process.env.STORAGE_TYPE = storage;
  process.env.DB_PATH = dbPath;

  // Each backend needs a clean module registry so the store singleton is rebuilt.
  for (const key of Object.keys(require.cache)) {
    if (key.includes(`${path.sep}server${path.sep}`)) delete require.cache[key];
  }

  const store = require('../server/store');
  const endpoint = store.createEndpoint();

  const addSamples = [];
  const getSamples = [];

  for (let i = 0; i < iterations; i += 1) {
    const request = makeRequest(i);
    addSamples.push(timed(() => store.addRequest(endpoint.id, request)));
  }

  // Read cost once the endpoint is at its MAX_REQUESTS_PER_ENDPOINT ceiling,
  // which is the steady state for any endpoint receiving real traffic.
  for (let i = 0; i < Math.min(iterations, 500); i += 1) {
    getSamples.push(timed(() => store.getEndpoint(endpoint.id)));
  }

  console.log(`\nstorage=${storage}  iterations=${iterations}`);
  console.log(formatHeader('operation', ['ops/sec']));

  const add = summarize(addSamples);
  const get = summarize(getSamples);

  console.log(formatRow('addRequest', add, { 'ops/sec': (1000 / add.mean).toFixed(0) }));
  console.log(formatRow('getEndpoint', get, { 'ops/sec': (1000 / get.mean).toFixed(0) }));

  const perCapture = add.mean + get.mean;
  console.log(
    `  per captured webhook: ~${perCapture.toFixed(2)}ms of synchronous store work ` +
      `(ceiling ~${(1000 / perCapture).toFixed(0)} captures/sec on one event loop)`
  );

  if (storage === 'sqlite') {
    for (const suffix of ['', '-wal', '-shm']) {
      try {
        fs.unlinkSync(dbPath + suffix);
      } catch {
        // scratch database
      }
    }
  }
}

const { storage, iterations } = parseArgs();
const backends = storage === 'both' ? ['memory', 'sqlite'] : [storage];

console.log('HookLens store benchmark (no HTTP)');
console.log(`node ${process.version}  ${process.platform}`);

for (const backend of backends) {
  runBackend(backend, iterations);
}
