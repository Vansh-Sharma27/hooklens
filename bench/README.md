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
| `addRequest` p50 / p99 / max | ~0.00 / 0.00 / 0.6 ms | 0.2 / 1.3 / 10.8 ms |
| `getEndpoint` p50 | ~0.00 ms | 0.5 ms |
| Store work per capture | negligible | ~0.84 ms |
| Capture p50 @ 100/s | 2.4 ms | 4.3 ms |
| Capture p50 / p95 @ 250/s | 3.0 / 7.1 ms | 6.1 / 16.6 ms |
| Saturation point | > 2000/s | ~300 req/s |

Fanout (sqlite) was flat across subscriber counts, no loss:

| Subscribers | p50 | p99 |
|---|---|---|
| 1 | 2.9 ms | 9.4 ms |
| 10 | 2.6 ms | 5.1 ms |
| 50 | 2.5 ms | 4.7 ms |

### Variance

`store.js` is stable: it runs thousands of iterations with no network involved.

`capture.js` is not. On a desktop with other processes running, the 250/s step
has been seen anywhere between 6 ms and 59 ms at p50 across consecutive runs of
identical code. Run it at least twice and treat a single run as indicative
rather than conclusive. The saturation point is the more stable signal and has
held at roughly 300 req/s across runs.

### Prior baseline

Before the store was optimised, `addRequest` cost 1.0 ms at p50 and 5.9 ms at
p99 with a 204 ms maximum, store work totalled ~2.15 ms per capture, and the
capture path saturated near 220 req/s. The cost was an endpoint existence check
that loaded and deserialised up to `MAX_REQUESTS_PER_ENDPOINT` rows, plus SQL
recompiled on every call.

The remaining ceiling is structural: better-sqlite3 is synchronous, so store
time is time no other connection can use.
