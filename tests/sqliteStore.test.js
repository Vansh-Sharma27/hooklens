// Exercises the SQLite backend directly. The HTTP tests run against the
// in-memory store, so without this the persistence layer is untested.
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

process.env.STORAGE_TYPE = 'sqlite';
process.env.DB_PATH = path.join(os.tmpdir(), `hooklens-test-${process.pid}.db`);

const test = require('node:test');
const assert = require('node:assert');

const store = require('../server/store');
const { MAX_REQUESTS_PER_ENDPOINT } = require('../server/config/constants');

test.after(() => {
  for (const suffix of ['', '-wal', '-shm']) {
    try {
      fs.unlinkSync(process.env.DB_PATH + suffix);
    } catch {
      // test scratch database
    }
  }
});

// requests.id is a primary key and the database is shared across tests in this
// file, so ids come from a sequence while `n` carries the per-test ordering.
let sequence = 0;

function makeRequest(index) {
  const body = JSON.stringify({ n: index });
  sequence += 1;

  return {
    id: `r${String(sequence).padStart(6, '0')}`,
    timestamp: Date.now() + index,
    method: 'POST',
    path: '/hook/test',
    headers: { 'content-type': 'application/json' },
    query: {},
    body,
    bodySize: Buffer.byteLength(body),
    contentType: 'application/json',
    isJson: true,
    parsedBody: { n: index },
    ip: '127.0.0.1',
    userAgent: 'test'
  };
}

test('an endpoint round-trips with its default config', () => {
  const created = store.createEndpoint();
  const loaded = store.getEndpoint(created.id);

  assert.strictEqual(loaded.id, created.id);
  assert.strictEqual(loaded.config.statusCode, 200);
  assert.strictEqual(loaded.config.responseBody, 'OK');
  assert.strictEqual(loaded.config.forwardUrl, null);
  assert.strictEqual(loaded.config.autoForward, false);
  assert.deepStrictEqual(loaded.requests, []);
});

test('requests are stored and returned newest first', () => {
  const endpoint = store.createEndpoint();

  store.addRequest(endpoint.id, makeRequest(1));
  store.addRequest(endpoint.id, makeRequest(2));
  store.addRequest(endpoint.id, makeRequest(3));

  const loaded = store.getEndpoint(endpoint.id);

  assert.strictEqual(loaded.requests.length, 3);
  assert.deepStrictEqual(
    loaded.requests.map(r => r.parsedBody.n),
    [3, 2, 1]
  );
});

test('addRequest rejects an unknown endpoint', () => {
  assert.strictEqual(store.addRequest('does-not-exist', makeRequest(1)), null);
});

test('requests are capped at MAX_REQUESTS_PER_ENDPOINT, oldest evicted', () => {
  const endpoint = store.createEndpoint();
  const total = MAX_REQUESTS_PER_ENDPOINT + 10;

  for (let i = 0; i < total; i += 1) {
    store.addRequest(endpoint.id, makeRequest(i));
  }

  const loaded = store.getEndpoint(endpoint.id);

  assert.strictEqual(loaded.requests.length, MAX_REQUESTS_PER_ENDPOINT);
  assert.strictEqual(loaded.requests[0].parsedBody.n, total - 1, 'newest retained');
  assert.strictEqual(
    loaded.requests.at(-1).parsedBody.n,
    total - MAX_REQUESTS_PER_ENDPOINT,
    'oldest evicted'
  );
});

test('config updates merge rather than replace', () => {
  const endpoint = store.createEndpoint();

  store.updateConfig(endpoint.id, { statusCode: 404 });
  const afterFirst = store.getEndpoint(endpoint.id).config;

  assert.strictEqual(afterFirst.statusCode, 404);
  assert.strictEqual(afterFirst.responseBody, 'OK', 'untouched field preserved');

  store.updateConfig(endpoint.id, { forwardUrl: 'http://example.com/x', autoForward: true });
  const afterSecond = store.getEndpoint(endpoint.id).config;

  assert.strictEqual(afterSecond.statusCode, 404, 'earlier update preserved');
  assert.strictEqual(afterSecond.forwardUrl, 'http://example.com/x');
  assert.strictEqual(afterSecond.autoForward, true);
});

test('updateConfig rejects an unknown endpoint', () => {
  assert.strictEqual(store.updateConfig('does-not-exist', { statusCode: 500 }), null);
});

test('clearRequests reports how many it removed', () => {
  const endpoint = store.createEndpoint();

  store.addRequest(endpoint.id, makeRequest(1));
  store.addRequest(endpoint.id, makeRequest(2));

  assert.strictEqual(store.clearRequests(endpoint.id), 2);
  assert.strictEqual(store.getEndpoint(endpoint.id).requests.length, 0);
  assert.strictEqual(store.clearRequests(endpoint.id), 0, 'clearing again removes nothing');
  assert.strictEqual(store.clearRequests('does-not-exist'), null);
});

test('deleting an endpoint removes its requests', () => {
  const endpoint = store.createEndpoint();
  store.addRequest(endpoint.id, makeRequest(1));

  assert.strictEqual(store.deleteEndpoint(endpoint.id), true);
  assert.strictEqual(store.getEndpoint(endpoint.id), null);
  assert.strictEqual(store.deleteEndpoint(endpoint.id), false);
});

test('an expired endpoint is not returned', () => {
  const endpoint = store.createEndpoint();
  store.updateConfig(endpoint.id, {});

  // Force expiry directly; TTL is 7 days so waiting is not an option.
  store.db.prepare('UPDATE endpoints SET expires_at = ? WHERE id = ?')
    .run(Date.now() - 1000, endpoint.id);

  assert.strictEqual(store.getEndpoint(endpoint.id), null);
});

test('getStats counts endpoints and requests', () => {
  const before = store.getStats();
  const endpoint = store.createEndpoint();
  store.addRequest(endpoint.id, makeRequest(1));

  const after = store.getStats();

  assert.strictEqual(after.endpointCount, before.endpointCount + 1);
  assert.strictEqual(after.totalRequests, before.totalRequests + 1);
});
