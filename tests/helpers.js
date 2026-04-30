// Test harness config must be set before the app (and its store) is required.
// A test file that needs different values sets them before requiring this.
process.env.STORAGE_TYPE = process.env.STORAGE_TYPE || 'memory';
if (process.env.RATE_LIMIT_ENABLED === undefined) {
  process.env.RATE_LIMIT_ENABLED = 'false';
}

const http = require('http');

/**
 * Boot the app on an ephemeral port and return its base URL.
 * @returns {Promise<{baseUrl: string, close: () => Promise<void>}>}
 */
async function startApp() {
  const { server } = require('../server/index');

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  return {
    baseUrl: `http://127.0.0.1:${port}`,
    close: () => new Promise(resolve => server.close(resolve))
  };
}

/**
 * Start a throwaway HTTP target that records what it receives.
 * @returns {Promise<{url: string, received: Array, close: () => Promise<void>}>}
 */
async function startTarget(handler) {
  const received = [];

  const server = http.createServer((req, res) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end', () => {
      received.push({
        url: req.url,
        method: req.method,
        headers: req.headers,
        body: Buffer.concat(chunks).toString('utf8')
      });

      if (handler) return handler(req, res);
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('ok');
    });
  });

  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();

  return {
    url: `http://127.0.0.1:${port}`,
    received,
    close: () => new Promise(resolve => server.close(resolve))
  };
}

async function createEndpoint(baseUrl) {
  const res = await fetch(`${baseUrl}/api/endpoints`, { method: 'POST' });
  return res.json();
}

async function lastRequest(baseUrl, endpointId) {
  const res = await fetch(`${baseUrl}/api/endpoints/${endpointId}`);
  const detail = await res.json();
  return detail.requests[0];
}

async function verify(baseUrl, endpointId, requestId, provider, secret) {
  const res = await fetch(
    `${baseUrl}/api/endpoints/${endpointId}/requests/${requestId}/verify`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ provider, secret })
    }
  );
  return res.json();
}

module.exports = { startApp, startTarget, createEndpoint, lastRequest, verify };
