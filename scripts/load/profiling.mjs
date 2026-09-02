#!/usr/bin/env node
/**
 * Lecture 40.97 — Performance Profiling: "measure before optimizing" runner.
 *
 * Dependency-free Node >= 18 script (uses the global `fetch`). It calls the
 * live `/profiling` endpoints on a running API instance, runs a fresh
 * profiling session across the study list (CPU / memory / event-loop latency /
 * PostgreSQL / Redis / network / WebSocket throughput), prints a per-area
 * budget table, and reports the delta of the latest session vs the baseline.
 * Exits 1 when any area is degraded or an HTTP call fails, so it can gate.
 *
 *   node scripts/load/profiling.mjs --base http://localhost:3001 --samples 20
 *
 * Env knobs (mirror src/core/profiling/profiling.config.ts):
 *   PROFILE_<AREA>_BUDGET, PROFILE_SAMPLES, PROFILE_WS_MESSAGES,
 *   PROFILE_DATA_DIR
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

const base = (args.base ?? process.env.BASE_URL ?? 'http://localhost:3001').replace(/\/$/, '');
const samples = Number(args.samples ?? 20);

const json = async (path) => {
  const res = await fetch(base + path);
  if (!res.ok) throw new Error(`${path} -> HTTP ${res.status}`);
  return res.json();
};

const statusMark = (s) => (s === 'degraded' ? 'FAIL' : s === 'unavailable' ? 'SKIP' : 'PASS');

main().catch((e) => {
  console.error('profiling failed:', e.message);
  console.error('Is the API running? Try `npm run start:dev` then re-run with --base http://localhost:3001');
  process.exit(1);
});

async function main() {
  const before = await json('/profiling/latest');
  const deltaBefore = await json('/profiling/delta');

  console.log(`base   : ${base}`);
  console.log(`samples: ${samples}`);
  console.log(`baseline: ${before?.id ?? '(none yet — first session becomes baseline)'}`);
  console.log('');

  const session = await json(`/profiling/session?window=${samples}`);
  const delta = await json('/profiling/delta');

  console.log('--- profiling session ---');
  const header = ['area', 'status', 'n', 'p50', 'p95', 'budget', 'p95', 'note'].join('|');
  console.log(header);
  let degraded = 0;
  for (const area of session.areas) {
    const p95 = area.p95 === null ? '-' : `${area.p95} ${area.unit}`;
    const p50 = area.p50 === null ? '-' : `${area.p50} ${area.unit}`;
    const budget = `${area.budget} ${area.unit}`;
    console.log(
      [area.area, statusMark(area.status), area.count, p50, p95, budget, '', area.note.split(';')[0]].join(' | '),
    );
    if (area.status === 'degraded') degraded++;
  }
  console.log(`overall : ${session.overall} (${session.sampleCount} samples/area)`);
  console.log('');

  const haveBaseline = (delta.rows ?? []).length > 0;
  console.log('--- delta vs baseline ---');
  for (const row of delta.rows) {
    const change = row.changePct === null ? '-' : `${row.changePct > 0 ? '+' : ''}${row.changePct}%`;
    console.log(
      `[${statusMark(row.currentStatus)}] ${row.area.padEnd(10)} baseline p95=${row.baselineP95 ?? '-'} ${row.unit}  current p95=${row.currentP95 ?? '-'} ${row.unit}  ${change}  ${row.verdict}`,
    );
  }
  if (!haveBaseline) console.log('no baseline yet — first session recorded as baseline');
  console.log('');

  const routes = await json('/profiling/routes');
  if ((routes ?? []).length > 0) {
    console.log('--- per-route HTTP latency deep dive ---');
    for (const r of routes.slice(0, 10)) {
      console.log(
        `${r.method.padEnd(6)} ${String(r.route).padEnd(40)} n=${String(r.requests).padEnd(6)} p50=${r.p50Ms ?? '-'}ms p95=${r.p95Ms ?? '-'}ms p99=${r.p99Ms ?? '-'}ms`,
      );
    }
  }

  console.log(degraded === 0
    ? 'Profiling OK — record as measured baseline and do not optimise on intuition.'
    : `PROFILING DEGRADED (${degraded} area(s) over budget) — measure again before any change.`);
  process.exitCode = degraded === 0 ? 0 : 1;
}