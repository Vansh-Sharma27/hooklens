/**
 * Percentiles are computed with the nearest-rank method over the raw sample
 * set. Never average percentiles across runs or windows - that understates the
 * tail, which is the only part of the distribution these benchmarks exist to
 * measure.
 */
function percentile(sortedValues, p) {
  if (sortedValues.length === 0) return NaN;
  const rank = Math.ceil((p / 100) * sortedValues.length);
  return sortedValues[Math.min(rank, sortedValues.length) - 1];
}

function summarize(samples) {
  const sorted = [...samples].sort((a, b) => a - b);

  return {
    count: sorted.length,
    min: sorted[0],
    p50: percentile(sorted, 50),
    p95: percentile(sorted, 95),
    p99: percentile(sorted, 99),
    max: sorted[sorted.length - 1],
    mean: sorted.reduce((sum, v) => sum + v, 0) / (sorted.length || 1)
  };
}

const ms = value => (Number.isFinite(value) ? value.toFixed(1) : '-');

function formatRow(label, stats, extra = {}) {
  return [
    String(label).padEnd(12),
    String(stats.count).padStart(7),
    ms(stats.p50).padStart(8),
    ms(stats.p95).padStart(8),
    ms(stats.p99).padStart(8),
    ms(stats.max).padStart(9),
    ...Object.values(extra).map(v => String(v).padStart(10))
  ].join(' ');
}

function formatHeader(firstColumn, extraColumns = []) {
  return [
    String(firstColumn).padEnd(12),
    'n'.padStart(7),
    'p50 ms'.padStart(8),
    'p95 ms'.padStart(8),
    'p99 ms'.padStart(8),
    'max ms'.padStart(9),
    ...extraColumns.map(c => String(c).padStart(10))
  ].join(' ');
}

/**
 * Open-loop load generator: requests are issued on a fixed schedule regardless
 * of whether earlier ones have completed. A closed-loop generator (await each
 * request, then send the next) cannot observe queueing delay because it stops
 * offering load exactly when the server slows down - the coordinated omission
 * problem. Latency here therefore includes time spent waiting to be served.
 */
async function openLoop({ rps, durationMs, issue }) {
  const intervalMs = 1000 / rps;
  const started = performance.now();
  const pending = [];
  const latencies = [];
  const errors = [];
  let scheduled = 0;
  let peakInFlight = 0;
  let inFlight = 0;

  while (performance.now() - started < durationMs) {
    const due = started + scheduled * intervalMs;
    const wait = due - performance.now();
    if (wait > 0) await sleep(wait);

    scheduled += 1;
    inFlight += 1;
    peakInFlight = Math.max(peakInFlight, inFlight);

    const sentAt = performance.now();
    const task = issue()
      .then(() => {
        latencies.push(performance.now() - sentAt);
      })
      .catch(err => {
        errors.push(err.message || String(err));
      })
      .finally(() => {
        inFlight -= 1;
      });

    pending.push(task);
  }

  await Promise.all(pending);
  const elapsedMs = performance.now() - started;

  return {
    latencies,
    errors,
    peakInFlight,
    offeredRps: rps,
    achievedRps: (latencies.length / elapsedMs) * 1000,
    elapsedMs
  };
}

const sleep = msValue => new Promise(resolve => setTimeout(resolve, msValue));

module.exports = { percentile, summarize, formatRow, formatHeader, openLoop, sleep };
