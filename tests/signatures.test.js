const test = require('node:test');
const assert = require('node:assert');
const crypto = require('node:crypto');

const { startApp, createEndpoint, lastRequest, verify } = require('./helpers');

let app;

test.before(async () => {
  app = await startApp();
});

test.after(async () => {
  await app.close();
});

test('captured body is byte-identical to what was sent', async () => {
  const endpoint = await createEndpoint(app.baseUrl);

  // Pretty-printed JSON: whitespace is part of the signed payload.
  const raw = JSON.stringify({ action: 'opened', number: 7 }, null, 2);

  await fetch(`${app.baseUrl}/hook/${endpoint.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: raw
  });

  const captured = await lastRequest(app.baseUrl, endpoint.id);

  assert.strictEqual(captured.body, raw);
  assert.strictEqual(captured.bodySize, Buffer.byteLength(raw, 'utf8'));
});

test('bodySize reports bytes on the wire, not characters', async () => {
  const endpoint = await createEndpoint(app.baseUrl);
  const raw = JSON.stringify({ city: 'दिल्ली', emoji: '🚀' });

  await fetch(`${app.baseUrl}/hook/${endpoint.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: raw
  });

  const captured = await lastRequest(app.baseUrl, endpoint.id);

  assert.strictEqual(captured.body, raw);
  assert.strictEqual(captured.bodySize, Buffer.byteLength(raw, 'utf8'));
  assert.ok(captured.bodySize > raw.length, 'multibyte payload must exceed char count');
});

test('GitHub signature over pretty-printed JSON verifies', async () => {
  const endpoint = await createEndpoint(app.baseUrl);
  const secret = "It's a Secret to Everybody";
  const raw = JSON.stringify({ action: 'opened', sender: { login: 'octocat' } }, null, 2);
  const signature = 'sha256=' + crypto.createHmac('sha256', secret).update(raw, 'utf8').digest('hex');

  await fetch(`${app.baseUrl}/hook/${endpoint.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': signature },
    body: raw
  });

  const captured = await lastRequest(app.baseUrl, endpoint.id);
  const result = await verify(app.baseUrl, endpoint.id, captured.id, 'github', secret);

  assert.strictEqual(result.valid, true, `expected valid, got ${JSON.stringify(result)}`);
});

test('GitHub signature with a wrong secret is rejected', async () => {
  const endpoint = await createEndpoint(app.baseUrl);
  const raw = JSON.stringify({ action: 'closed' });
  const signature = 'sha256=' + crypto.createHmac('sha256', 'right', 'utf8').update(raw).digest('hex');

  await fetch(`${app.baseUrl}/hook/${endpoint.id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': signature },
    body: raw
  });

  const captured = await lastRequest(app.baseUrl, endpoint.id);
  const result = await verify(app.baseUrl, endpoint.id, captured.id, 'github', 'wrong');

  assert.strictEqual(result.valid, false);
});

test('Stripe signature over compact JSON verifies', async () => {
  const endpoint = await createEndpoint(app.baseUrl);
  const secret = 'whsec_test';
  const raw = JSON.stringify({ id: 'evt_1', type: 'charge.succeeded' });
  const timestamp = Math.floor(Date.now() / 1000);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${raw}`, 'utf8')
    .digest('hex');

  await fetch(`${app.baseUrl}/hook/${endpoint.id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Stripe-Signature': `t=${timestamp},v1=${signature}`
    },
    body: raw
  });

  const captured = await lastRequest(app.baseUrl, endpoint.id);
  const result = await verify(app.baseUrl, endpoint.id, captured.id, 'stripe', secret);

  assert.strictEqual(result.valid, true, `expected valid, got ${JSON.stringify(result)}`);
});

test('Slack signature over a form-encoded body verifies', async () => {
  const endpoint = await createEndpoint(app.baseUrl);
  const secret = 'slack_secret';
  const raw = 'token=abc&team_id=T1&text=hello+world';
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = 'v0=' + crypto
    .createHmac('sha256', secret)
    .update(`v0:${timestamp}:${raw}`, 'utf8')
    .digest('hex');

  await fetch(`${app.baseUrl}/hook/${endpoint.id}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'X-Slack-Signature': signature,
      'X-Slack-Request-Timestamp': timestamp
    },
    body: raw
  });

  const captured = await lastRequest(app.baseUrl, endpoint.id);

  // The form body must survive as sent, not as a re-serialised object.
  assert.strictEqual(captured.body, raw);

  const result = await verify(app.baseUrl, endpoint.id, captured.id, 'slack', secret);
  assert.strictEqual(result.valid, true, `expected valid, got ${JSON.stringify(result)}`);
});

test('Twilio signature verifies when content-type carries a charset', async () => {
  const endpoint = await createEndpoint(app.baseUrl);
  const secret = 'twilio_token';
  const raw = 'Body=hi&From=%2B15551234567';
  const url = `${app.baseUrl}/hook/${endpoint.id}`;

  const sorted = [...new URLSearchParams(raw).entries()].sort((a, b) => a[0].localeCompare(b[0]));
  let signatureBase = url;
  for (const [key, value] of sorted) signatureBase += key + value;
  const signature = crypto.createHmac('sha1', secret).update(signatureBase).digest('base64');

  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-Twilio-Signature': signature
    },
    body: raw
  });

  const captured = await lastRequest(app.baseUrl, endpoint.id);
  const result = await verify(app.baseUrl, endpoint.id, captured.id, 'twilio', secret);

  assert.strictEqual(result.valid, true, `expected valid, got ${JSON.stringify(result)}`);
});
