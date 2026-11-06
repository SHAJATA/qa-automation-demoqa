#!/usr/bin/env node
// Runs the DemoQA Postman collection with Newman and records results in the same format as the UI suite:
//   reports/execution/execution-<RunID>.csv (+ .meta.json) and a sanitized reports/evidence/<RunID>/api-results.json.
// Newman's raw summary (auth headers, request bodies) is kept in memory only and never written to disk.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { parseCsv } from './build-report.mjs';

const require = createRequire(import.meta.url);
const newman = require('newman');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// API_COLLECTION lets a labelled verification run use a modified copy without touching the real collection.
const COLLECTION = process.env.API_COLLECTION || path.join(ROOT, 'postman', 'DemoQA-Interview-Demo.postman_collection.json');
const ENVIRONMENT = path.join(ROOT, 'postman', 'DemoQA-Interview-Demo.postman_environment.template.json');
const runId = process.env.RUN_ID || 'API-' + new Date().toLocaleString('sv-SE').replace(/\D/g, '').replace(/^(\d{8})/, '$1-');

// Remove anything secret-shaped before it reaches a report: JWTs, bearer values, and the generated password format.
const scrub = s => String(s ?? '')
  .replace(/eyJ[\w-]+\.[\w-]+\.[\w-]+/g, '<redacted-jwt>')
  .replace(/Bearer\s+\S+/gi, 'Bearer <redacted>')
  .replace(/Qa![a-z0-9]{1,12}7Z/g, '<redacted-password>');
const q = v => `"${String(v ?? '').replace(/"/g, '""')}"`;

const cases = new Map(parseCsv(fs.readFileSync(path.join(ROOT, 'test-cases', 'test-cases.csv'), 'utf8')).map(c => [c['Test Case ID'], c]));
const startedAt = new Date();

newman.run({
  collection: COLLECTION,
  environment: ENVIRONMENT,
  reporters: ['cli'],
  delayRequest: 300,        // low-volume, polite pacing against the public demo site
  timeoutRequest: 30_000,
}, (err, summary) => {
  if (err) { console.error('Newman could not run:', scrub(err.message)); process.exit(2); }
  const run = summary.run;
  const perCase = new Map();   // caseId -> { assertions: [], durationMs, requests: Set }
  const requests = [];
  const ensure = id => perCase.get(id) ?? perCase.set(id, { assertions: [], durationMs: 0, requests: new Set() }).get(id);

  const declaredCases = item => (item.request.description?.content ?? item.request.description ?? '').match(/Cases:\s*([^\n]+)/)?.[1].split(/,\s*/) ?? [];
  // Newman leaves requests skipped by pm.execution.skipRequest() out of run.executions entirely, so walk the collection
  // to report every designed case, including those whose request never ran.
  const executedIds = new Set(run.executions.map(ex => ex.item.id));
  summary.collection.forEachItem(item => {
    if (executedIds.has(item.id)) return;
    for (const id of declaredCases(item)) ensure(id).requests.add(item.name);
    requests.push({ name: item.name, method: item.request.method, url: item.request.url.getPath(), status: 'skipped (prerequisite not met)', responseTimeMs: 0, assertions: [] });
  });

  for (const ex of run.executions) {
    const name = ex.item.name;
    const declared = declaredCases(ex.item);
    const skipped = !ex.response;
    const ms = ex.response?.responseTime ?? 0;
    for (const id of declared) { const c = ensure(id); c.requests.add(name); c.durationMs += ms; }
    const assertions = (ex.assertions ?? []).map(a => ({ name: a.assertion, passed: !a.error && !a.skipped, error: a.error ? scrub(a.error.message) : '' }));
    for (const a of assertions) { const id = a.name.match(/^(API-[A-Z]+-\d+)/)?.[1]; if (id) ensure(id).assertions.push(a); }
    requests.push({
      name, method: ex.request.method,
      // Keep the path but mask the per-run user id; no headers or bodies are recorded.
      url: scrub(ex.request.url.toString().replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/g, '{userId}')),
      status: skipped ? 'skipped (prerequisite not met)' : ex.response.code, responseTimeMs: ms, assertions,
    });
  }

  const header = ['Run ID', 'Test Case ID', 'Test Name', 'Module', 'Tool', 'Status', 'Duration (ms)', 'Retry Count', 'Error', 'Screenshot Path', 'Trace Path'];
  const rows = [...perCase].sort(([a], [b]) => a.localeCompare(b)).map(([id, c]) => {
    const failed = c.assertions.filter(a => !a.passed);
    // No assertions ran for this case = its request(s) were skipped by a prerequisite guard: reported as skipped, not executed.
    const status = !c.assertions.length ? 'skipped' : failed.length ? 'failed' : 'passed';
    const error = failed.map(a => `${a.name}: ${a.error}`).join(' | ') || (status === 'skipped' ? `Not run: request(s) ${[...c.requests].join(', ')} skipped because a prerequisite failed` : '');
    const def = cases.get(id);
    return [runId, id, `${id} ${def?.['Test Name'] ?? ''}`.trim(), def?.Module ?? 'API', 'Newman (API)', status, c.durationMs, 0, error.slice(0, 1000), '', ''];
  });

  const execDir = path.join(ROOT, 'reports', 'execution');
  const evidenceDir = path.join(ROOT, 'reports', 'evidence', runId);
  fs.mkdirSync(execDir, { recursive: true }); fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(execDir, `execution-${runId}.csv`), [header, ...rows].map(r => r.map(q).join(',')).join('\n') + '\n');
  fs.writeFileSync(path.join(evidenceDir, 'api-results.json'), JSON.stringify({ runId, collection: summary.collection.name, requests }, null, 2) + '\n');

  const stats = run.stats;
  const meta = {
    runId, purpose: process.env.RUN_PURPOSE || 'normal', layer: 'API', timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    tool: `Newman ${require('newman/package.json').version}`, playwrightVersion: null, workers: 1, projects: ['API'], retries: 0,
    baseURL: summary.environment.values.one('baseUrl')?.value ?? null, command: 'node scripts/run-api.mjs',
    collection: summary.collection.name, htmlReport: null, evidenceDir: `reports/evidence/${runId}`, apiEvidence: `reports/evidence/${runId}/api-results.json`,
    requests: { total: stats.requests.total, failed: stats.requests.failed, executed: requests.filter(r => typeof r.status === 'number').length, skipped: requests.filter(r => typeof r.status !== 'number').length },
    assertions: { total: stats.assertions.total, failed: stats.assertions.failed },
    startTime: new Date(run.timings.started || startedAt).toISOString(), wallClockMs: Math.round((run.timings.completed || Date.now()) - (run.timings.started || startedAt.getTime())),
    status: run.failures.length ? 'failed' : 'passed',
  };
  fs.writeFileSync(path.join(execDir, `execution-${runId}.meta.json`), JSON.stringify(meta, null, 2) + '\n');

  const count = s => rows.filter(r => r[5] === s).length;
  console.log(`\nRun ${runId}: requests ${meta.requests.executed} executed / ${meta.requests.skipped} skipped; assertions ${meta.assertions.total} (${meta.assertions.failed} failed); cases passed ${count('passed')}, failed ${count('failed')}, skipped ${count('skipped')}`);
  console.log(`Execution CSV: reports/execution/execution-${runId}.csv  |  API evidence: ${meta.apiEvidence}`);
  process.exit(run.failures.length ? 1 : 0);
});
