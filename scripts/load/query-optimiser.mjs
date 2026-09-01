#!/usr/bin/env node
/**
 * Lecture 40.82 — Load-model-driven DB/query optimisation: verification runner.
 *
 * Dependency-free Node >= 18 script (uses the global `fetch`). It reads the
 * live `/load-model/optimiser` endpoint and prints the load-model-driven plan
 * selection plus the projected rows-per-second reduction versus the 40.80-style
 * baseline. Run it before and after an index/query change to confirm a measured
 * improvement (mirrors how `/load-model/baseline` confirms the request-side
 * SLOs).
 *
 *   node scripts/load/query-optimiser.mjs --base http://localhost:3000
 *
 * Env knob (mirrors src/core/db/query-optimizer/db-query-path.ts):
 *   any QP_* selectivity override
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

const json = async (path) => {
  const res = await fetch(base + path);
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json();
};

async function main() {
  const report = await json('/load-model/optimiser');

  console.log(`base     : ${base}`);
  console.log(`model    : ${report.modelVersion}, peak ${report.peakOpsPerSec} ops/sec`);
  console.log('');
  console.log('--- hot query paths (load-model-driven plan selection) ---');
  for (const p of report.paths) {
    console.log(
      `[${p.chosen.withinSlo ? 'PASS' : 'FAIL'}] ${p.name.padEnd(18)} ` +
        `${p.baseline.strategy.padEnd(9)}->${p.chosen.strategy.padEnd(9)} ` +
        `${p.baseline.rowsPerRequest}->${p.chosen.rowsPerRequest} rows/req ` +
        `(${(p.reduction * 100).toFixed(1)}% fewer)`,
    );
  }
  console.log('');
  console.log('--- totals (rows scanned / second) ---');
  console.log(`baseline : ${report.totals.baselineRowsPerSec}`);
  console.log(`optimised: ${report.totals.optimisedRowsPerSec}`);
  console.log(`reduction: ${(report.totals.reduction * 100).toFixed(1)}%`);
  console.log(`withinSLO: ${report.totals.allWithinSlo ? 'PASS' : 'FAIL'}`);
  console.log('');

  if (report.improved && report.totals.allWithinSlo) {
    console.log('Optimiser OK — improvement confirmed against the 40.80 baseline. Next: 40.83.');
  } else {
    console.log('No measured improvement — tune access paths / indexes and re-run.');
  }
  console.log('');

  // Lecture 40.83 — cache architecture decision table + read coverage.
  const cache = await json('/load-model/cache');
  console.log('--- cache architecture (40.83) ---');
  console.log(
    `cached  : ${cache.cacheable.map((d) => `${d.path}@${d.ttlSeconds}s`).join(', ')}`,
  );
  console.log(
    `skipped : ${cache.notCached.map((d) => d.path).join(', ')}`,
  );
  console.log(`coverage: ${(cache.readCoverage * 100).toFixed(1)}% of modelled read traffic cached`);
  console.log(`[${cache.readCoverage > 0 ? 'PASS' : 'FAIL'}] cache architecture covering hot reads`);
}

main().catch((e) => {
  console.error('query-optimiser failed:', e.message);
  console.error('Is the API running? Try `npm run start:dev` then re-run with --base http://localhost:3000');
  process.exit(1);
});
