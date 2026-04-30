// Must be set before helpers requires the app; the limiter reads env at load.
process.env.RATE_LIMIT_ENABLED = 'true';
process.env.HOOK_RATE_LIMIT_MAX = '5';

const test = require('node:test');
const assert = require('node:assert');

const { startApp, createEndpoint } = require('./helpers');

let app;

test.before(async () => {
  app = await startApp();
});

test.after(async () => {
  await app.close();
});

const send = (endpointId) =>
  fetch(`${app.baseUrl}/hook/${endpointId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{"n":1}'
  });

test('capture is limited per endpoint, not globally', async () => {
  const a = await createEndpoint(app.baseUrl);
  const b = await createEndpoint(app.baseUrl);

  const statusesA = [];
  for (let i = 0; i < 6; i += 1) {
    statusesA.push((await send(a.id)).status);
  }

  assert.deepStrictEqual(
    statusesA,
    [200, 200, 200, 200, 200, 429],
    'endpoint should accept exactly its own budget then reject'
  );

  // A second endpoint must be unaffected by the first exhausting its budget.
  const statusB = (await send(b.id)).status;
  assert.strictEqual(statusB, 200, 'a busy endpoint must not starve another');
});

test('a rate limited response is JSON, matching every other error', async () => {
  const endpoint = await createEndpoint(app.baseUrl);

  let res;
  for (let i = 0; i < 6; i += 1) {
    res = await send(endpoint.id);
  }

  assert.strictEqual(res.status, 429);
  assert.match(res.headers.get('content-type') || '', /application\/json/);

  const payload = await res.json();
  assert.strictEqual(payload.error, 'Too many requests');
});

test('the API budget is separate from the capture budget', async () => {
  const endpoint = await createEndpoint(app.baseUrl);

  for (let i = 0; i < 6; i += 1) {
    await send(endpoint.id);
  }

  // Capture is exhausted for this endpoint; the API must still respond.
  const res = await fetch(`${app.baseUrl}/api/endpoints/${endpoint.id}`);
  assert.strictEqual(res.status, 200);
});

test('static assets are not charged against the API budget', async () => {
  // Loading the dashboard fetches several files; none should consume API budget.
  for (let i = 0; i < 20; i += 1) {
    const res = await fetch(`${app.baseUrl}/static/js/app.js`);
    assert.strictEqual(res.status, 200);
  }

  const res = await fetch(`${app.baseUrl}/api/endpoints`, { method: 'POST' });
  assert.strictEqual(res.status, 200);
});
