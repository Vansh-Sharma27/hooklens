const test = require('node:test');
const assert = require('node:assert');

const { startApp, createEndpoint, lastRequest } = require('./helpers');
const { MAX_BODY_SIZE } = require('../server/config/constants');

let app;

test.before(async () => {
  app = await startApp();
});

test.after(async () => {
  await app.close();
});

test('a body within the limit is captured', async () => {
  const endpoint = await createEndpoint(app.baseUrl);
  const body = 'x'.repeat(1024);

  const res = await fetch(`${app.baseUrl}/hook/${endpoint.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body
  });

  assert.strictEqual(res.status, 200);

  const captured = await lastRequest(app.baseUrl, endpoint.id);
  assert.strictEqual(captured.bodySize, 1024);
});

test('a body over MAX_BODY_SIZE is rejected with 413', async () => {
  const endpoint = await createEndpoint(app.baseUrl);
  const body = 'x'.repeat(MAX_BODY_SIZE + 1024);

  const res = await fetch(`${app.baseUrl}/hook/${endpoint.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body
  });

  assert.strictEqual(res.status, 413);

  const payload = await res.json();
  assert.strictEqual(payload.error, 'Payload too large');
});

test('an oversized body is not stored', async () => {
  const endpoint = await createEndpoint(app.baseUrl);

  await fetch(`${app.baseUrl}/hook/${endpoint.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain' },
    body: 'x'.repeat(MAX_BODY_SIZE + 1024)
  }).catch(() => {
    // The server closes the connection on rejection; a transport error here is
    // an acceptable outcome, the assertion below is what matters.
  });

  const detail = await (await fetch(`${app.baseUrl}/api/endpoints/${endpoint.id}`)).json();
  assert.strictEqual(detail.requestCount, 0);
});

test('an oversized body declared via content-length is rejected before streaming', async () => {
  const endpoint = await createEndpoint(app.baseUrl);

  // Declares an oversized length without sending the bytes.
  const res = await fetch(`${app.baseUrl}/hook/${endpoint.id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/plain',
      'Content-Length': String(MAX_BODY_SIZE * 4)
    },
    body: 'x'.repeat(16),
    duplex: 'half'
  }).catch(() => null);

  // Either a clean 413 or a refused upload is correct; silently accepting is not.
  if (res) {
    assert.strictEqual(res.status, 413);
  }

  const detail = await (await fetch(`${app.baseUrl}/api/endpoints/${endpoint.id}`)).json();
  assert.strictEqual(detail.requestCount, 0);
});
