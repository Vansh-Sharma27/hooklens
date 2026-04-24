/**
 * Segment A - capture latency: what the webhook sender experiences.
 *
 * Sweeps offered load against a single endpoint and reports the tail. The knee
 * is where achieved RPS stops tracking offered RPS; past that point the server
 * is saturated and latency figures describe queueing, not work.
 *
 * Usage: node bench/capture.js [--storage sqlite|memory|both] [--body 1024]
 */
const { startServer, createEndpoint } = require('./lib/server');
const { summarize, formatRow, formatHeader, openLoop } = require('./lib/stats');

const RPS_STEPS = [50, 100, 250, 500, 1000, 2000];
const DURATION_MS = 3000;
const WARMUP_REQUESTS = 200;

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (flag, fallback) => {
    const i = args.indexOf(flag);
    return i >= 0 ? args[i + 1] : fallback;
  };
  return {
    storage: get('--storage', 'both'),
    bodySize: Number(get('--body', 1024))
  };
}

async function runBackend(storage, bodySize) {
  const server = await startServer({ storage });

  try {
    const endpoint = await createEndpoint(server.baseUrl);
    const url = `${server.baseUrl}/hook/${endpoint.id}`;
    const payload = JSON.stringify({ pad: 'x'.repeat(Math.max(0, bodySize - 12)) });

    const post = () =>
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      }).then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
      });

    for (let i = 0; i < WARMUP_REQUESTS; i += 1) await post();

    console.log(`\nstorage=${storage}  body=${bodySize}B  duration=${DURATION_MS}ms per step`);
    console.log(formatHeader('offered', ['achieved', 'inflight', 'errors']));

    for (const rps of RPS_STEPS) {
      const result = await openLoop({ rps, durationMs: DURATION_MS, issue: post });
      const stats = summarize(result.latencies);

      console.log(
        formatRow(`${rps}/s`, stats, {
          achieved: result.achievedRps.toFixed(0),
          inflight: result.peakInFlight,
          errors: result.errors.length
        })
      );

      // Stop climbing once the server can no longer absorb the offered rate;
      // further steps only measure how deep the backlog grows.
      if (result.achievedRps < rps * 0.85) {
        console.log(`  saturated at ~${result.achievedRps.toFixed(0)} req/s`);
        break;
      }
    }
  } finally {
    await server.stop();
  }
}

(async () => {
  const { storage, bodySize } = parseArgs();
  const backends = storage === 'both' ? ['memory', 'sqlite'] : [storage];

  console.log('HookLens capture-path benchmark');
  console.log(`node ${process.version}  ${process.platform}  ${require('os').cpus().length} cpus`);

  for (const backend of backends) {
    await runBackend(backend, bodySize);
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});
