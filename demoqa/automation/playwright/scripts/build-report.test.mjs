// Self-check for the counting rules: node --test scripts/
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, groupInstances, countRun, categorize } from './build-report.mjs';

const H = '"Run ID","Test Case ID","Test Name","Module","Tool","Status","Duration (ms)","Retry Count","Error","Screenshot Path","Trace Path"';
const row = (id, status, ms, retry, err = '') => `"R1","${id}","${id} t","M","Playwright (chromium)","${status}","${ms}","${retry}","${err.replace(/"/g, '""')}","",""`;

test('retries group into one instance; flaky, failed and skipped are counted once each', () => {
  const rows = parseCsv([H, row('A', 'passed', 100, 0), row('B', 'failed', 200, 0, 'boom, "quoted"\nline2'), row('B', 'flaky', 150, 1),
    row('C', 'failed', 300, 0), row('C', 'timedOut', 310, 1), row('D', 'skipped', 0, 0)].join('\n'));
  const inst = groupInstances(rows);
  assert.equal(inst.length, 4);
  assert.equal(inst.find(i => i.caseId === 'B').attempts[0].error, 'boom, "quoted"\nline2');
  const c = countRun(inst, [{ caseId: 'E' }]);
  assert.deepEqual([c.executed, c.passed, c.flaky, c.failed, c.skipped, c.notRun, c.attempts, c.totalAttemptMs], [3, 1, 1, 1, 1, 1, 6, 1060]);
  assert.equal(c.passRate, 2 / 3);
  assert.equal(c.firstAttemptPassRate, 1 / 3);
});

test('categories are inferred, unmatched names stay uncategorized', () => {
  assert.equal(categorize('Email with 2-character TLD is accepted (boundary)'), 'Boundary');
  assert.equal(categorize('Correcting an invalid email clears the error on resubmit'), 'Error recovery');
  assert.equal(categorize('Something new'), 'Uncategorized');
});

test('inventory case-ID ranges match only IDs inside the range', async () => {
  const { caseIdMatcher } = await import('./build-report.mjs');
  const m = caseIdMatcher('API-AC-001..API-AC-007; API-CT-002');
  assert.equal(m('API-AC-005'), true);
  assert.equal(m('API-AC-101'), false);
  assert.equal(m('API-CT-002'), true);
  assert.equal(m('UI-AC-001'), false);
});
