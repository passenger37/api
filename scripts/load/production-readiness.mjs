#!/usr/bin/env node
/**
 * Lecture 40.99 — Backend Production Readiness Review (B2 40.89).
 *
 * Dependency-free Node >= 18 script (uses the global `fetch`). It reads the
 * live `/production-readiness` report from a running API instance and prints
 * the per-area checklist status, then exits 1 if any check has failed.
 *
 *   node scripts/load/production-readiness.mjs --base http://localhost:3000
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

const pad = (s, n) => s.padEnd(n);

async function main() {
  const report = await json('/production-readiness');

  console.log(`base      : ${base}`);
  console.log(`version   : ${report.version}`);
  console.log(`areas     : ${report.areas.length}`);
  console.log(`checks    : ${report.totalChecks}`);
  console.log(`passed    : ${report.passed}`);
  console.log(`failed    : ${report.failed}`);
  console.log(`n/a       : ${report.notApplicable}`);
  console.log(`manual    : ${report.manual}`);
  console.log('');

  for (const area of report.areas) {
    const icon =
      area.status === 'pass' ? '✓' : area.status === 'fail' ? '✗' : area.status === 'not-applicable' ? '—' : '~';
    console.log(`${icon} ${pad(area.name, 20)} ${pad(String(area.passed), 3)} pass / ${pad(String(area.failed), 3)} fail / ${pad(String(area.notApplicable), 3)} n/a`);

    for (const c of area.checks) {
      if (c.status === 'fail') {
        console.log(`    [FAIL] ${c.id}: ${c.description} — ${c.evidence}`);
      }
    }
  }

  console.log('');

  const verdict = report.overallReady ? 'PASS' : 'FAIL';
  console.log(`[${verdict}] Production readiness: ${report.passed}/${report.totalChecks} checks passed (${report.notApplicable} n/a).`);

  if (!report.overallReady) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('production-readiness failed:', e.message);
  console.error('Is the API running? Try `npm run start:dev` then re-run with --base http://localhost:3000');
  process.exit(1);
});