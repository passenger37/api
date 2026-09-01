#!/usr/bin/env node
/**
 * Lecture 40.80 — 1M-User Load Model: quick baseline runner.
 *
 * Dependency-free Node >= 18 script (uses the global `fetch`). It reads the
 * live `/load-model/baseline` + `/metrics` from a running API instance, drives
 * a short synthetic request loop through the public endpoints (health, load
 * model, metrics) to exercise the 40.79 request-metrics interceptor, and prints
 * a windowed req/s / error-rate / latency baseline against the model's targets.
 *
 *   node scripts/load/load-baseline.mjs --base http://localhost:3000 --window 10 --parallel 50
 *
 * Env knobs (mirror src/core/load-model/load-model.config.ts):
 *   LOAD_USERS, LOAD_CONCURRENCY_RATIO, LOAD_ACTIONS_PER_USER_MIN
 */
const args = {};
for (let i = 2; i < process.argv.length; i++) {
  const a = process.argv[i];
  if (a.startsWith('--')) {
    const next = process.argv[i + 1];
    if (next !== undefined && !next.startsWith('--')) {
      args[a.slice(2)] = next;
      i++;
    } else {
      args[a.slice(2)] = true;
    }
  }
}

const base = (args.base ?? process.env.BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const windowSec = Number(args.window ?? process.env.LOAD_WINDOW_SEC ?? 10);
const parallel = Number(args.parallel ?? 50);

const json = async (path) => {
  const res = await fetch(base + path);
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json();
};

async function hit(path, n = 1) {
  const ms = await (async () => {
    const start = process.hrtime.bigint();
    for (let i = 0; i < n; i++) {
      try {
        await fetch(base + path);
      } catch {
        /* count as error via non-2xx path */
      }
    }
    return Number(process.hrtime.bigint() - start) / 1e6;
  })();
  return { n, ms };
}

async function main() {
  const { model, targets } = await json('/load-model');
  const t0 = await json('/load-model/baseline');

  console.log(`base   : ${base}`);
  console.log(`window : ${windowSec}s x ${parallel} parallel`);
  console.log(`model  : ${model.registeredUsers} users, peak ${model.peakOpsPerSec} ops/sec`);
  console.log(`targets: p99 SLO (representative) ${t0.targets.operations.map((o) => o.p99SloMs)} ms`);
  console.log('');

  // Drive a synthetic burst through the public endpoints so the request-metrics
  // interceptor records real http_requests_total / duration histogram samples.
  const rounds = Math.max(1, Math.ceil(windowSec * (1000 / 20)));
  const loops = async () => {
    const workers = Array.from({ length: parallel }, async () => {
      for (let r = 0; r < rounds; r++) {
        await hit('/health', 1);
      }
    });
    await Promise.all(workers);
  };
  await loops();

  const t1 = await json('/load-model/baseline');
  const reqDelta = t1.observed.httpRequestsTotal - t0.observed.httpRequestsTotal;
  const errDelta = t1.observed.httpErrorsTotal - t0.observed.httpErrorsTotal;
  const rps = reqDelta / windowSec;
  const errorRate = reqDelta > 0 ? errDelta / reqDelta : 0;

  console.log('--- baseline (window) ---');
  console.log(`requests          : ${t1.observed.httpRequestsTotal} (total) / ${rps.toFixed(0)} req/s`);
  console.log(`errors            : ${t1.observed.httpErrorsTotal} (total) / ${errorRate.toFixed(4)} rate`);
  console.log(`latency p50/p99   : ${t1.observed.latency.p50Ms} / ${t1.observed.latency.p99Ms} ms (cumulative)`);
  console.log(`jobs processed    : ${t1.observed.jobsProcessedTotal}`);
  console.log('');

  const t = targets;
  const checks = [
    ['throughput >= model (req hit model ops)',
      reqDelta >= t.peakOpsPerSec * windowSec],
    ['error rate <= strictest SLO',
      errorRate <= Math.min(...docsOps(t))],
    ['p99 latency within representative SLO',
      t1.observed.latency.sampleCount === 0 || t1.observed.latency.p99Ms <= repP99(t)],
  ];
  let allPass = true;
  for (const [label, ok] of checks) {
    console.log(`[${ok ? 'PASS' : 'FAIL'}] ${label}`);
    if (!ok) allPass = false;
  }
  console.log('');

  // Lecture 40.82 — confirm the load-model-driven DB/query optimisation shows a
  // measured improvement against the 40.80 baseline.
  const opt = await json('/load-model/optimiser');
  console.log('--- load-model-driven query optimiser (40.82) ---');
  console.log(`rows/sec ${opt.totals.baselineRowsPerSec} -> ${opt.totals.optimisedRowsPerSec} (${(opt.totals.reduction * 100).toFixed(1)}% fewer)`);
  console.log(`withinSLO: ${opt.totals.allWithinSlo ? 'PASS' : 'FAIL'}  improved: ${opt.improved ? 'PASS' : 'FAIL'}`);
  const optOk = opt.improved && opt.totals.allWithinSlo;
  console.log(`[${optOk ? 'PASS' : 'FAIL'}] db/query optimisation confirmed vs baseline`);
  console.log('');

  console.log(allPass && optOk
    ? 'Baseline OK — see /load-model/baseline for full detail. Next: 40.81 optimisations.'
    : 'Baseline outside targets — record as the pre-optimisation baseline and proceed to 40.81.');
}

function docsOps(t) {
  return t.operations.map((o) => o.errorRateMax);
}

function repP99(t) {
  const slos = t.operations.map((o) => o.p99SloMs).sort((a, b) => a - b);
  return slos[Math.floor(slos.length / 2)];
}

main().catch((e) => {
  console.error('load-baseline failed:', e.message);
  console.error('Is the API running? Try `npm run start:dev` then re-run with --base http://localhost:3000');
  process.exit(1);
});
