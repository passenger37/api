import * as path from 'node:path';
import { auditSourceTree } from '../../src/core/security/security-source-audit';
import { SECURITY_AREAS } from '../../src/core/security/security-checklist';

const root = path.resolve(__dirname, '..', '..');
const verdicts = auditSourceTree(root);

const areaStatus = SECURITY_AREAS.map((area) => {
  const controls = verdicts.filter((v) => v.area === area);
  const failed = controls.filter((v) => v.status === 'failed').length;
  return { area, total: controls.length, failed };
});

console.log('Nexus API — 40.96 Backend Security Audit (source controls)\n');
for (const row of areaStatus) {
  const marker = row.failed > 0 ? 'FAIL' : 'pass';
  console.log(
    `  [${marker}] ${row.area.padEnd(14)} ${row.failed}/${row.total} failing`,
  );
}

const failed = verdicts.filter((v) => v.status === 'failed');
if (failed.length > 0) {
  console.log('\nFailed controls:');
  for (const v of failed) {
    console.log(`  - ${v.id} (${v.area}): ${v.evidence[0] ?? 'n/a'}`);
    for (const violation of v.violations) console.log(`      ${violation}`);
  }
  console.log(
    `\nFAILED: ${failed.length} control(s) out of ${verdicts.length}`,
  );
  process.exitCode = 1;
} else {
  console.log(
    `\nPASSED: ${verdicts.length}/${verdicts.length} source controls`,
  );
}
