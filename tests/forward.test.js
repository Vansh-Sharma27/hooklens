const test = require('node:test');
const assert = require('node:assert');

const { startApp, startTarget, createEndpoint, lastRequest } = require('./helpers');
const { buildForwardUrl } = require('../server/utils/forward');

let app;

test.before(async () => {
  app = await startApp();
});

test.after(async () => {
  await app.close();
});

async function captureOne(endpointId, path = '', body = '{"a":1}') {
  await fetch(`${app.baseUrl}/hook/${endpointId}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body
  });
  return lastRequest(app.baseUrl, endpointId);
}

async function forwardTo(endpointId, requestId, targetUrl) {
  const res = await fetch(
    `${app.baseUrl}/api/endpoints/${endpointId}/requests/${requestId}/forward`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUrl })
    }
  );
  return res.json();
}

test('buildForwardUrl keeps the target path', () => {
  const url = buildForwardUrl('/hook/abc123', 'http://example.com/api/webhooks/stripe');
  assert.strictEqual(url.toString(), 'http://example.com/api/webhooks/stripe');
});

test('buildForwardUrl carries the captured query string over', () => {
  const url = buildForwardUrl('/hook/abc123?foo=bar&n=2', 'http://example.com/api/hook');
  assert.strictEqual(url.pathname, '/api/hook');
  assert.strictEqual(url.searchParams.get('foo'), 'bar');
  assert.strictEqual(url.searchParams.get('n'), '2');
});

test('buildForwardUrl merges with a query already on the target', () => {
  const url = buildForwardUrl('/hook/abc123?foo=bar', 'http://example.com/api?token=xyz');
  assert.strictEqual(url.searchParams.get('token'), 'xyz');
  assert.strictEqual(url.searchParams.get('foo'), 'bar');
});

test('buildForwardUrl appends path segments beyond the endpoint id', () => {
  const url = buildForwardUrl('/hook/abc123/events/created', 'http://example.com/api');
  assert.strictEqual(url.pathname, '/api/events/created');
});

test('buildForwardUrl handles a target with a trailing slash', () => {
  const url = buildForwardUrl('/hook/abc123/extra', 'http://example.com/api/');
  assert.strictEqual(url.pathname, '/api/extra');
});

test('buildForwardUrl handles a target with no path', () => {
  const url = buildForwardUrl('/hook/abc123', 'http://example.com');
  assert.strictEqual(url.pathname, '/');
});

test('forwarding delivers to the configured target path', async () => {
  const endpoint = await createEndpoint(app.baseUrl);
  const target = await startTarget();

  try {
    const captured = await captureOne(endpoint.id);
    const result = await forwardTo(endpoint.id, captured.id, `${target.url}/api/webhooks/stripe`);

    assert.strictEqual(result.success, true, JSON.stringify(result));
    assert.strictEqual(target.received.length, 1);
    assert.strictEqual(target.received[0].url, '/api/webhooks/stripe');
  } finally {
    await target.close();
  }
});

test('forwarding preserves method and body', async () => {
  const endpoint = await createEndpoint(app.baseUrl);
  const target = await startTarget();

  try {
    const raw = JSON.stringify({ event: 'test', nested: { n: 1 } }, null, 2);
    const captured = await captureOne(endpoint.id, '', raw);
    await forwardTo(endpoint.id, captured.id, `${target.url}/receive`);

    assert.strictEqual(target.received[0].method, 'POST');
    assert.strictEqual(target.received[0].body, raw);
  } finally {
    await target.close();
  }
});

test('forwarding carries the captured query string to the target', async () => {
  const endpoint = await createEndpoint(app.baseUrl);
  const target = await startTarget();

  try {
    const captured = await captureOne(endpoint.id, '?source=stripe');
    await forwardTo(endpoint.id, captured.id, `${target.url}/api/hook`);

    assert.strictEqual(target.received[0].url, '/api/hook?source=stripe');
  } finally {
    await target.close();
  }
});

test('a non-http forwardUrl scheme is rejected at config time', async () => {
  const endpoint = await createEndpoint(app.baseUrl);

  const res = await fetch(`${app.baseUrl}/api/endpoints/${endpoint.id}/forwarding`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ forwardUrl: 'file:///etc/passwd' })
  });

  assert.strictEqual(res.status, 400);
  const payload = await res.json();
  assert.match(payload.error, /protocol/i);
});

test('forwarding to a non-http scheme fails rather than being attempted', async () => {
  const endpoint = await createEndpoint(app.baseUrl);
  const captured = await captureOne(endpoint.id);

  const result = await forwardTo(endpoint.id, captured.id, 'file:///etc/passwd');

  assert.strictEqual(result.success, false);
  assert.match(result.error, /protocol/i);
});

test('a failing target is reported, not thrown', async () => {
  const endpoint = await createEndpoint(app.baseUrl);
  const captured = await captureOne(endpoint.id);

  // Port 1 is not listening.
  const result = await forwardTo(endpoint.id, captured.id, 'http://127.0.0.1:1/nope');

  assert.strictEqual(result.success, false);
  assert.ok(result.error, 'expected an error message');
});
