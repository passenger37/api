#!/usr/bin/env node
/**
 * Lecture 40.98 — 1M-User Capacity Planning (B2 40.88): capacity-plan runner.
 *
 * Dependency-free Node >= 18 script (uses the global `fetch`). It reads the
 * live `/capacity-model` report from a running API instance and prints the nine
 * capacity estimates (registered/DAU/concurrent users, msgs/user/day, msgs/sec,
 * database storage, media storage, Redis memory, network bandwidth) alongside
 * the usage assumptions that produced them, then checks the derived message
 * rate against the 40.80 load model's message budget.
 *
 *   node scripts/load/capacity.mjs --base http://localhost:3000
 *
 * Env knobs (mirror src/core/capacity-model/capacity-model.config.ts via
 * CAPACITY_* overrides on the server): CAPACITY_DAU_RATIO, CAPACITY_CONCURRENT_RATIO,
 * CAPACITY_MESSAGES_PER_USER_PER_DAY, ...
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

const fmt = (v, unit, sub) =>
  sub
    ? `${Number(v).toLocaleString()} ${unit}`
    : `${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${unit}`;

async function main() {
  const report = await json('/capacity-model');
  console.log(`base     : ${base}`);
  console.log(`model    : capacity-model v${report.modelVersion}`);
  console.log('');

  console.log('--- assumptions (from expected product usage, CAPACITY_* tunable) ---');
  for (const a of report.assumptions) {
    console.log(`  ${a.label.padEnd(32)} ${fmt(a.value, a.unit)}\n      ${a.rationale}`);
  }
  console.log('');

  console.log('--- estimates (B2 40.88) ---');
  const estRows = report.estimates.map((e) => `${e.label.padEnd(52)} = ${fmt(e.value, e.unit)}`);
  for (const row of estRows) console.log(`  ${row}`);
  console.log('');

  console.log('--- workload + load-model consistency ---');
  console.log(`daily messages     : ${report.workload.dailyMessages.toLocaleString()}`);
  console.log(`messages/sec (avg) : ${report.workload.averageMessagesPerSec.toFixed(1)}`);
  console.log(`messages/sec (peak): ${report.workload.peakMessagesPerSec.toFixed(1)}`);
  console.log(`load-model budget  : ${report.loadModelMessageRps} msg/s (message.create @ 20% of peak ops)`);
  const ok = report.consistentWithLoadModel;
  console.log(`[${ok ? 'PASS' : 'FAIL'}] capacity msg/s fits inside the 40.80 load-model message budget.`);
  console.log('');

  console.log(ok
    ? 'Capacity plan OK — full breakdown served from /capacity-model. Next: 40.99 production readiness.'
    : 'Capacity estimate exceeds the load-model message budget — revisit CAPACITY_* usage assumptions.');
}

main().catch((e) => {
  console.error('capacity failed:', e.message);
  console.error('Is the API running? Try `npm run start:dev` then re-run with --base http://localhost:3000');
  process.exit(1);
});