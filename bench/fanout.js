/**
 * Segment B/D - freshness: webhook accepted to dashboard notified.
 *
 * This is the number a developer actually feels. It is measured as the delta
 * between issuing the POST and the corresponding NEW_REQUEST frame arriving at
 * a subscribed WebSocket client, swept across subscriber counts to expose the
 * cost of serialising and writing to every subscriber inside broadcast().
 *
 * Usage: node bench/fanout.js [--storage sqlite|memory] [--subscribers 1,10,50]
 */
const WebSocket = require('ws');

const { startServer, createEndpoint } = require('./lib/server');
const { summarize, formatRow, formatHeader, sleep } = require('./lib/stats');

const SAMPLES = 200;

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag, fallback) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : fallback;
  };
  return {
    storage: get('--storage', 'sqlite'),
    subscribers: get('--subscribers', '1,10,50').split(',').map(Number)
  };
}

function connect(baseUrl, endpointId) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${baseUrl.replace('http', 'ws')}/ws`);
    ws.on('open', () => {
      ws.send(JSON.stringify({ type: 'SUBSCRIBE', endpointId }));
      resolve(ws);
    });
    ws.on('error', reject);
  });
}

async function measure(baseUrl, endpointId, subscriberCount) {
  const sockets = [];
  for (let i = 0; i < subscriberCount; i += 1) {
    sockets.push(await connect(baseUrl, endpointId));
  }
  await sleep(150);

  // Only the first socket is timed; the rest exist to create fanout work.
  const observer = sockets[0];
  const arrivals = new Map();

  observer.on('message', raw => {
    const message = JSON.parse(raw);
    if (message.type !== 'NEW_REQUEST') return;
    const marker = message.data?.parsedBody?.marker;
    if (marker !== undefined) arrivals.set(marker, performance.now());
  });

  const latencies = [];
  const url = `${baseUrl}/hook/${endpointId}`;

  for (let i = 0; i < SAMPLES; i += 1) {
    const sentAt = performance.now();
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ marker: i })
    });

    // Wait for this marker to surface on the socket.
    const deadline = performance.now() + 2000;
    while (!arrivals.has(i) && performance.now() < deadline) {
      await sleep(1);
    }

    if (arrivals.has(i)) latencies.push(arrivals.get(i) - sentAt);
  }

  for (const ws of sockets) ws.close();
  await sleep(100);

  return { latencies, delivered: latencies.length };
}

(async () => {
  const { storage, subscribers } = parseArgs();
  const server = await startServer({ storage });

  try {
    console.log('HookLens fanout / freshness benchmark');
    console.log(`storage=${storage}  samples=${SAMPLES} per step\n`);
    console.log(formatHeader('subscribers', ['delivered', 'lost']));

    for (const count of subscribers) {
      const endpoint = await createEndpoint(server.baseUrl);
      const { latencies, delivered } = await measure(server.baseUrl, endpoint.id, count);

      console.log(
        formatRow(String(count), summarize(latencies), {
          delivered,
          lost: SAMPLES - delivered
        })
      );
    }
  } finally {
    await server.stop();
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
