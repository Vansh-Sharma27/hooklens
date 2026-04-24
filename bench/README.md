# Benchmarks

Load and latency harness for the capture path. No dependencies beyond what the
server already uses.

```bash
node bench/store.js      # persistence cost, no HTTP
node bench/capture.js    # capture latency under offered load
node bench/fanout.js     # webhook accepted -> dashboard notified
```

## What is measured

The capture path, split so each segment can be attributed separately:

```text
sender -> rate limit -> body parse -> store.getEndpoint -> parseRequest
       -> store.addRequest -> ws broadcast -> [forward] -> [delay] -> response
                                   |
                                   +-> subscribed dashboards
```

| Script | Segment | Question it answers |
|---|---|---|
| `store.js` | persistence | How much synchronous work does one capture cost? |
| `capture.js` | sender-visible | What does the webhook provider see, and where does it saturate? |
| `fanout.js` | freshness | How long until the developer sees the request? |

## Method

- **Open loop.** `capture.js` issues requests on a fixed schedule rather than
  waiting for each to complete. A closed loop stops offering load exactly when
  the server slows down, so it cannot observe queueing delay — the coordinated
  omission problem. Reported latency therefore includes queue wait.
- **Percentiles from raw samples**, nearest-rank. Percentiles are never averaged
  across steps or runs; that hides the tail.
- **Saturation is defined as achieved RPS falling below 85% of offered.** Past
  that point latency describes backlog depth, not work done, so the sweep stops.
- **Rate limiting is disabled** in benchmark runs. The default 100 req/min bucket
  would otherwise cap every result at that ceiling and measure the limiter.
- **Server runs in a separate process** so client load never shares an event loop
  with the server under test.
- `store.js` measures at the `MAX_REQUESTS_PER_ENDPOINT` ceiling, which is the
  steady state for any endpoint receiving real traffic.

## Interpreting results

`better-sqlite3` is synchronous. Every store call blocks the event loop for its
full duration, so per-op cost in `store.js` is a hard ceiling on concurrent
capture throughput, not just a per-request tax. Compare `--storage memory`
against `--storage sqlite` to separate persistence cost from everything else.

## Baseline

Recorded on Node v22.18.0, win32, 16 cpus, 1KB JSON bodies. Numbers are
machine-specific; re-record before drawing conclusions elsewhere.

| Measurement | memory | sqlite |
|---|---|---|
| `addRequest` p50 / p99 | ~0.00 / 0.00 ms | 1.0 / 5.9 ms (max 204) |
| `getEndpoint` p50 | ~0.00 ms | 0.7 ms |
| Store work per capture | negligible | ~2.15 ms |
| Capture p50 @ 100/s | 2.4 ms | 4.7 ms |
| Capture p50 / p95 @ 250/s | 3.0 / 7.1 ms | 41.6 / 74.2 ms |
| Saturation point | > 2000/s | ~220 req/s |

Fanout (sqlite) was flat across subscriber counts, no loss:

| Subscribers | p50 | p99 |
|---|---|---|
| 1 | 2.9 ms | 9.4 ms |
| 10 | 2.6 ms | 5.1 ms |
| 50 | 2.5 ms | 4.7 ms |

The 204 ms `addRequest` outlier is consistent with a WAL checkpoint. Because the
driver is synchronous, a stall of that length blocks every other connection for
its duration.
