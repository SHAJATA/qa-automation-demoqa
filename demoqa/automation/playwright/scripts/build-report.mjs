#!/usr/bin/env node
// Builds reports/dashboard/index.html and reports/qa-summary.md from SAVED results only (never runs tests).
// Usage: node scripts/build-report.mjs [--run <RunID>]   (default: latest run)
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const NR = 'Not recorded';

// ---------- parsing ----------
export function parseCsv(text) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field); rows.push(row); row = []; field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header = [], ...body] = rows.filter(r => r.some(Boolean));
  return body.map(r => Object.fromEntries(header.map((h, i) => [h, r[i] ?? ''])));
}

// Playwright's HTML report embeds its data as a base64 zip. Read report.json via the zip central directory.
function readHtmlReport(file) {
  if (!fs.existsSync(file)) return null;
  const m = fs.readFileSync(file, 'utf8').match(/data:application\/zip;base64,([A-Za-z0-9+/=]+)/);
  if (!m) return null;
  const zip = Buffer.from(m[1], 'base64');
  const eocd = zip.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  let p = zip.readUInt32LE(eocd + 16);
  for (let n = zip.readUInt16LE(eocd + 10); n > 0; n--) {
    const method = zip.readUInt16LE(p + 10), size = zip.readUInt32LE(p + 20);
    const nameLen = zip.readUInt16LE(p + 28), extra = zip.readUInt16LE(p + 30), comment = zip.readUInt16LE(p + 32);
    const local = zip.readUInt32LE(p + 42), name = zip.toString('utf8', p + 46, p + 46 + nameLen);
    if (name === 'report.json') {
      const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const data = zip.subarray(start, start + size);
      return JSON.parse((method === 8 ? zlib.inflateRawSync(data) : data).toString('utf8'));
    }
    p += 46 + nameLen + extra + comment;
  }
  return null;
}

// ---------- derivation ----------
// Scenario categories are INFERRED by keyword from the reviewed test-case names (first match wins).
// No match = Uncategorized. Reviewed against UI-TB-001..012 on 2026-10-02.
const CATEGORY_RULES = [
  ['Boundary', /boundary/i],
  ['Error recovery', /clears the error|correcting/i],
  ['Negative validation', /rejected|flagged|invalid|cannot|does not|shows no|no result|not accepted|no options|not suggested/i],
  ['Initial state', /initially|at load|defaults to|starts at|starts disabled/i],
  ['Positive (happy path)', /^valid submission|accepted/i],
  ['Empty input', /empty form|all fields empty/i],
  ['Partial input', /-only|only the/i],
  ['Input rendering', /literal text|html-like/i],
];
export const categorize = name => CATEGORY_RULES.find(([, re]) => re.test(name))?.[0] ?? 'Uncategorized';

// Failure cause is only suggested when the recorded error itself is evidence; otherwise "Needs investigation".
const ENV_ERROR = /net::ERR_|ENOTFOUND|ECONNRESET|ECONNREFUSED|EAI_AGAIN|ERR_INTERNET_DISCONNECTED/;
const classify = attempts => attempts.some(a => ENV_ERROR.test(a.error))
  ? 'Suspected environment issue (network error recorded in log)' : 'Needs investigation';

export function groupInstances(rows) {
  const map = new Map();
  for (const r of rows) {
    const key = [r['Run ID'], r.Module, r['Test Name'], r.Tool].join('|');
    if (!map.has(key)) map.set(key, {
      key, runId: r['Run ID'], caseId: r['Test Case ID'], title: r['Test Name'], csvModule: r.Module, tool: r.Tool,
      browser: r.Tool.match(/\(([^)]+)\)/)?.[1] || NR, attempts: [],
    });
    map.get(key).attempts.push({
      retry: Number(r['Retry Count']), status: r.Status, durationMs: Number(r['Duration (ms)']) || 0,
      error: r.Error, screenshot: r['Screenshot Path'], trace: r['Trace Path'],
    });
  }
  return [...map.values()].map(i => {
    i.attempts.sort((a, b) => a.retry - b.retry);
    const last = i.attempts.at(-1);
    i.finalStatus = last.status;
    i.outcome = last.status === 'skipped' ? 'skipped'
      : ['passed', 'flaky'].includes(last.status) ? (i.attempts.length > 1 ? 'flaky' : 'passed')
      : last.status === 'interrupted' ? 'interrupted' : 'failed';
    i.durationMs = i.attempts.reduce((s, a) => s + a.durationMs, 0);
    return i;
  });
}

export function countRun(instances, notRun) {
  const by = o => instances.filter(i => i.outcome === o).length;
  const c = { passed: by('passed'), flaky: by('flaky'), failed: by('failed'), interrupted: by('interrupted'), skipped: by('skipped'), notRun: notRun.length };
  c.executed = c.passed + c.flaky + c.failed + c.interrupted; // skipped and not-run are NOT executed
  c.uniqueExecutedCases = new Set(instances.filter(i => i.outcome !== 'skipped').map(i => i.caseId)).size;
  c.attempts = instances.reduce((s, i) => s + i.attempts.length, 0);
  c.totalAttemptMs = instances.reduce((s, i) => s + i.durationMs, 0);
  c.passRate = c.executed ? (c.passed + c.flaky) / c.executed : null;
  c.firstAttemptPassRate = c.executed ? c.passed / c.executed : null;
  return c;
}

// ---------- load ----------
function loadCases() {
  const file = path.join(ROOT, 'test-cases', 'test-cases.csv');
  return fs.existsSync(file) ? parseCsv(fs.readFileSync(file, 'utf8')).map(c => ({
    caseId: c['Test Case ID'], requirementIds: c['Requirement ID'], title: c['Test Name'], module: c.Module,
    preconditions: c.Preconditions, testData: c['Test Data'], steps: c.Steps, expected: c['Expected Result'],
    priority: c.Priority || NR, automation: c['Automation Reference'], category: categorize(c['Test Name']),
  })) : [];
}

// Reads every test-cases/*observed-behavior*.md: OBS table rows, plus "- " bullets under any heading mentioning questions.
function loadObservations() {
  const dir = path.join(ROOT, 'test-cases');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /observed-behavior.*\.md$/.test(f)).sort() : [];
  const items = [], questions = [];
  for (const f of files) {
    const md = fs.readFileSync(path.join(dir, f), 'utf8');
    items.push(...[...md.matchAll(/^\|\s*(OBS-[A-Z]+-\d+)\s*\|\s*(.+?)\s*\|\s*$/gm)].map(m => ({ id: m[1], text: m[2].replace(/`|\*\*/g, ''), source: `test-cases/${f}` })));
    for (const block of md.split(/^#{2,3} /m).filter(b => /^[^\n]*question/i.test(b)))
      questions.push(...[...block.matchAll(/^- (.+)$/gm)].map(m => ({ text: m[1].replace(/`/g, ''), source: `test-cases/${f}` })));
  }
  return { source: files.map(f => `test-cases/${f}`).join(', ') || null, items, questions };
}

// Reviewed failure classifications. A row with a Run ID applies only to that run; a blank Run ID applies to every run.
function loadTriage() {
  const file = path.join(ROOT, 'test-cases', 'failure-triage.csv');
  return fs.existsSync(file) ? parseCsv(fs.readFileSync(file, 'utf8')) : [];
}
const findTriage = (triage, runId, caseId) =>
  triage.find(t => t['Run ID'] === runId && t['Test Case ID'] === caseId) ?? triage.find(t => !t['Run ID'] && t['Test Case ID'] === caseId);

function loadInventory() {
  const file = path.join(ROOT, 'test-cases', 'feature-inventory.csv');
  return fs.existsSync(file) ? parseCsv(fs.readFileSync(file, 'utf8')) : [];
}
// Expands an inventory 'Case IDs' cell such as "UI-CB-001..UI-CB-009; API-AC-101..API-AC-105" into a matcher.
export function caseIdMatcher(cell) {
  const parts = String(cell || '').split(/[;,]\s*/).filter(Boolean).map(p => p.trim());
  return id => parts.some(p => {
    const [a, b] = p.split('..');
    if (!b) return id === a;
    const m = s => s.match(/^(.*-)(\d+)$/);
    const [, pa, na] = m(a) ?? [], [, pb, nb] = m(b) ?? [], [, pi, ni] = m(id) ?? [];
    return pa && pa === pb && pi === pa && +ni >= +na && +ni <= +nb;
  });
}
const layerOf = caseId => (/^API-/.test(caseId) ? 'API' : /^UI-/.test(caseId) ? 'UI' : NR);

function configuredBrowsers() {
  const file = path.join(ROOT, 'playwright.config.ts');
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(l => !l.trim().startsWith('//'))
    .map(l => l.match(/^\s*name:\s*'([^']+)'/)?.[1]).filter(Boolean);
}

const exists = rel => !!rel && fs.existsSync(path.join(ROOT, rel));

function loadRuns(cases, triage, inventory) {
  const areaOf = new Map(inventory.map(f => [f.Feature, f.Category]));
  const dir = path.join(ROOT, 'reports', 'execution');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter(f => /^execution-.+\.csv$/.test(f)) : [];
  const claimedHtml = new Set();
  const runs = files.flatMap(f => {
    const rows = parseCsv(fs.readFileSync(path.join(dir, f), 'utf8'));
    return [...new Set(rows.map(r => r['Run ID']))].map(runId => ({ runId, csv: `reports/execution/${f}`, rows: rows.filter(r => r['Run ID'] === runId) }));
  });

  return runs.map(({ runId, csv, rows }) => {
    const metaFile = csv.replace(/\.csv$/, '.meta.json');
    const meta = exists(metaFile) ? JSON.parse(fs.readFileSync(path.join(ROOT, metaFile), 'utf8')) : null;
    const instances = groupInstances(rows);
    const caseById = new Map(cases.map(c => [c.caseId, c]));

    for (const i of instances) {
      const c = caseById.get(i.caseId);
      i.module = c?.module ?? i.csvModule;
      i.priority = c?.priority ?? NR;
      i.category = c?.category ?? 'Uncategorized';
      i.area = areaOf.get(i.module) ?? (layerOf(i.caseId) === 'API' ? 'Book Store Application' : NR);
      i.layer = layerOf(i.caseId);
      i.hasDefinition = !!c;
      for (const a of i.attempts) { a.screenshotExists = exists(a.screenshot); a.traceExists = exists(a.trace); }
      if (i.attempts.some(a => a.status !== 'passed' && a.status !== 'flaky' && a.status !== 'skipped')) {
        const t = findTriage(triage, runId, i.caseId);
        if ((meta?.purpose ?? 'normal') !== 'normal') i.cause = 'Intentional failure (reporting verification exercise)';
        else if (t) { i.cause = `${t.Classification} (reviewed ${t['Reviewed On']})`; i.causeEvidence = t.Evidence; }
        else i.cause = classify(i.attempts);
      }
    }

    // Not run: designed cases in the SAME modules and browsers as this run that have no execution record.
    const scopeModules = [...new Set(instances.filter(i => i.hasDefinition).map(i => i.module))];
    const browsers = [...new Set(instances.map(i => i.browser))];
    const ran = new Set(instances.map(i => `${i.caseId}|${i.browser}`));
    const notRun = cases.filter(c => scopeModules.includes(c.module)).flatMap(c => browsers
      .filter(b => !ran.has(`${c.caseId}|${b}`))
      .map(b => ({ caseId: c.caseId, title: c.title, module: c.module, browser: b, priority: c.priority, category: c.category, area: areaOf.get(c.module) ?? NR, layer: layerOf(c.caseId) })));

    // Run facts: prefer the run's own meta file; otherwise use the HTML report only if its tests verifiably match this CSV.
    let facts = { source: 'meta', ...meta }, htmlReport = null;
    if (meta) {
      htmlReport = { path: meta.htmlReport, exists: exists(meta.htmlReport), verified: true, note: 'Path recorded by this run.' };
    } else {
      facts = { source: 'none' };
      const legacy = 'reports/html/index.html';
      const rep = claimedHtml.has(legacy) ? null : readHtmlReport(path.join(ROOT, legacy));
      const tests = rep?.files?.flatMap(f => f.tests) ?? [];
      const single = instances.filter(i => i.attempts.length === 1);
      const match = rep && tests.length === instances.length && single.every(i =>
        tests.some(t => t.title === i.title && t.projectName === i.browser && Math.round(t.duration) === i.attempts[0].durationMs));
      if (match) {
        claimedHtml.add(legacy);
        facts = { source: 'html', startTime: new Date(rep.startTime).toISOString(), wallClockMs: Math.round(rep.duration), workers: rep.metadata?.actualWorkers, projects: rep.projectNames };
        htmlReport = { path: legacy, exists: true, verified: true, note: `Verified: all ${tests.length} tests in the HTML report match this CSV by title, browser and duration.` };
      } else {
        htmlReport = { path: null, exists: false, verified: false, note: rep ? 'An HTML report exists but does not match this run, so it is not linked.' : 'No HTML report saved for this run.' };
      }
    }

    const counts = countRun(instances, notRun);
    const executedCaseIds = [...new Set(instances.filter(i => i.outcome !== 'skipped').map(i => i.caseId))];
    return {
      runId, csv, purpose: meta?.purpose ?? 'normal', executedCaseIds, layers: [...new Set(instances.map(i => i.layer))], meta: facts, htmlReport, instances, notRun, counts, browsers, modules: scopeModules.length ? scopeModules : [...new Set(instances.map(i => i.module))],
      designedInScope: cases.filter(c => scopeModules.includes(c.module)).length,
    };
  }).sort((a, b) => (a.meta.startTime ?? a.runId).localeCompare(b.meta.startTime ?? b.runId));
}

// ---------- assessment (shared by dashboard and markdown) ----------
function assess(run, cases, obs, browsersConfigured, postman, inventory) {
  if (run.purpose !== 'normal') return { gaps: [], missingBrowsers: [], obsOnly: 0, lines: [
    `Reporting verification exercise (${run.purpose}): failures in this run were introduced on purpose to prove failure evidence is captured. They are not product results or defects.`] };
  const c = run.counts;
  const inScope = cases.filter(x => run.modules.includes(x.module));
  const obsOnly = inScope.filter(x => x.requirementIds && x.requirementIds.split(/[;,]\s*/).every(id => id.startsWith('OBS-'))).length;
  // Browser coverage only applies when the run contains UI tests.
  const missingBrowsers = run.instances.some(i => i.layer === 'UI') ? browsersConfigured.filter(b => !run.browsers.includes(b)) : [];
  const gaps = [];
  if (obsOnly) gaps.push(`${obsOnly} of ${inScope.length} designed cases trace only to observed behavior (OBS-*), not to approved requirements.`);
  if (missingBrowsers.length) gaps.push(`Configured browsers not executed in this run: ${missingBrowsers.join(', ')}.`);
  if (c.notRun) gaps.push(`${c.notRun} designed case instance(s) in this run's modules were designed but not run.`);
  const byStatus = s => inventory.filter(f => f['Coverage Status'] === s);
  for (const s of ['Not yet designed', 'Designed', 'Blocked', 'Excluded'])
    if (byStatus(s).length) gaps.push(`Feature inventory: ${byStatus(s).length} feature(s) ${s.toLowerCase()}: ${byStatus(s).map(f => f.Feature).join(', ')}.`);
  const untested = inventory.filter(f => f['Coverage Status'] === 'Automated' && !(run.featuresExecuted ?? run.modules).includes(f.Feature));
  if (untested.length) gaps.push(`Automated features not executed in this run: ${untested.map(f => f.Feature).join(', ')}.`);
  if (run.instances.some(i => !i.hasDefinition)) gaps.push('Some executed tests have no matching test-case definition.');
  const hasApi = run.instances.some(i => i.layer === 'API'), hasUi = run.instances.some(i => i.layer === 'UI');
  if (!hasApi) gaps.push(postman.latest ? `API layer is not part of this run; it ran separately in ${postman.latest.runId}.` : `API testing (Postman): Not Run. No API execution results exist.`);
  if (!hasUi) gaps.push('UI layer is not part of this run; see the UI runs (e.g. FULL-UI-*) for browser results.');
  if (hasApi) gaps.push('API checks cover functional contract behavior only: no load, rate-limit or security testing. Optional endpoints (replace book, delete all books, get single book) are not designed.');
  if (hasUi) gaps.push('Not covered by these UI tests: accessibility, performance, mobile viewports, security testing. A test that HTML-like input is displayed as text is not a security assessment.');

  const lines = [];
  lines.push(c.executed
    ? `${c.executed} test instance(s) executed ${run.browsers.every(b => b === 'API') ? 'through the API (Newman)' : `on ${run.browsers.join(', ')}`}: ${c.passed} passed on the first attempt, ${c.flaky} passed only after a retry, ${c.failed + c.interrupted} did not pass.`
    : 'No test instances were executed in this run.');
  const failedInst = run.instances.filter(i => ['failed', 'interrupted'].includes(i.outcome));
  const tally = {};
  for (const i of failedInst) { const k = (i.cause ?? 'Needs investigation').replace(/ \(reviewed.*\)$/, ''); tally[k] = (tally[k] ?? 0) + 1; }
  if (failedInst.length) lines.push(`Final failures by reviewed cause: ${Object.entries(tally).map(([k, n]) => `${k}: ${n}`).join('; ')}. Suspected product defects are evidence-based suspicions, not confirmed defects, and no severity is assigned.`);
  if (c.flaky) lines.push('Flaky passes show instability; they should be investigated rather than counted as clean passes.');
  if (!c.failed && !c.interrupted && !c.flaky && c.executed) lines.push('The automated checks matched the behavior observed on the page for this scope, with no retries needed.');
  const reasons = [obsOnly && 'expectations are based on observed behavior, not approved requirements',
    missingBrowsers.length && `${missingBrowsers.length} configured browser(s) were not run`,
    !hasApi && !postman.latest && 'API tests were not run', !hasApi && postman.latest && 'API results are in a separate run', !hasUi && 'UI results are in a separate run', inventory.some(f => f['Coverage Status'] !== 'Automated') && 'part of the application was descoped or not designed', failedInst.length && `${failedInst.length} test(s) still fail`, obs.questions.length && `${obs.questions.length} product question(s) are still open`].filter(Boolean);
  lines.push(`This is not a release approval: ${reasons.join('; ')}.`);
  return { gaps, lines, missingBrowsers, obsOnly };
}

// ---------- outputs ----------
const fmtMs = ms => (ms == null ? NR : ms >= 1000 ? `${(ms / 1000).toFixed(1)} s (${ms.toLocaleString('en-US')} ms)` : `${ms} ms`);
const pct = v => (v == null ? 'n/a' : `${(v * 100).toFixed(1)}%`);
function fmtTime(iso, tz) {
  if (!iso) return NR;
  const zone = tz || Intl.DateTimeFormat().resolvedOptions().timeZone;
  const s = new Date(iso).toLocaleString('sv-SE', { timeZone: zone });
  return `${s} ${zone}${tz ? '' : ' (build machine timezone; the run did not record its timezone)'}`;
}

function markdown(d, run) {
  const c = run.counts, m = run.meta, a = run.assessment;
  // Escape HTML so markdown previews show recorded text instead of rendering it.
  const md = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\|/g, '\\|').replace(/\n/g, ' ');
  const out = [
    `# QA Summary: ${run.modules.join(', ') || 'DemoQA'} (UI)`, '',
    ...(run.purpose !== 'normal' ? [`> **Reporting verification exercise (${run.purpose}).** Failures were introduced on purpose to prove evidence capture. They are not product results or defects.`, ''] : []),
    `> Generated by \`npm run report:build\` on ${fmtTime(d.generatedAt, d.timezone)} from saved results only. Do not edit by hand; regenerate instead.`,
    `> Dashboard: \`reports/dashboard/index.html\``, '',
    '| Item | Value |', '|------|-------|',
    `| Run ID | ${run.runId} |`,
    `| Start time | ${fmtTime(m.startTime, m.timezone)} |`,
    `| Scope | ${run.modules.join(', ')}; ${run.browsers.join(', ')} |`,
    `| Command | ${md(m.command ?? NR)} |`,
    `| Environment (baseURL) | ${m.baseURL ?? NR} |`,
    `| Tool | ${m.tool ?? (m.playwrightVersion ? `Playwright ${m.playwrightVersion}` : NR)} |`,
    `| Workers | ${m.workers ?? NR} |`,
    `| Run metadata source | ${{ meta: 'Run metadata file', html: 'Playwright HTML report (verified match)', none: NR }[m.source]} |`, '',
    '## Results', '',
    '| Metric | Value |', '|--------|-------|',
    `| Designed cases in scope | ${run.designedInScope} |`,
    `| Executed test instances | ${c.executed} (${c.uniqueExecutedCases} unique cases × ${run.browsers.every(b => b === 'API') ? 'API layer, no browser' : `${run.browsers.length} browser(s)`}) |`,
    `| Passed on first attempt | ${c.passed} |`,
    `| Passed after retry (flaky) | ${c.flaky} |`,
    `| Final failures | ${c.failed}${c.interrupted ? ` (+${c.interrupted} interrupted)` : ''} |`,
    `| Skipped (not counted as executed) | ${c.skipped} |`,
    `| Designed but not run, in this run's modules (not counted as executed) | ${c.notRun} |`,
    `| Total attempts (incl. retries) | ${c.attempts} |`,
    `| Final pass rate | ${pct(c.passRate)} = (first-attempt + flaky passes) / executed instances |`,
    `| First-attempt pass rate | ${pct(c.firstAttemptPassRate)} = first-attempt passes / executed instances |`,
    `| Run wall-clock duration | ${fmtMs(m.wallClockMs)} |`,
    `| Sum of attempt durations | ${fmtMs(c.totalAttemptMs)}. ${run.layers.includes('API') ? 'For API cases this sums request times per case (a request shared by two cases counts for both)' : 'Tests ran in parallel'}, so this is NOT elapsed time. |`,
    ...(m.requests ? [`| API requests | ${m.requests.executed} executed, ${m.requests.skipped} skipped (of ${m.requests.executed + m.requests.skipped} in the collection) |`, `| API assertions | ${m.assertions.total} executed, ${m.assertions.failed} failed |`] : []), '',
    '## Failures and retries', '',
  ];
  const troubled = run.instances.filter(i => i.attempts.length > 1 || ['failed', 'interrupted'].includes(i.outcome));
  if (!troubled.length) out.push('No failed attempts or retries were recorded in this run.');
  for (const i of troubled) {
    out.push(`### ${md(i.caseId)} (${md(i.browser)}): ${i.outcome}`, `${md(i.title)}`, '', `Cause: ${i.cause ?? 'n/a'}${i.causeEvidence ? `. Evidence: ${md(i.causeEvidence)}` : ''}`, '');
    for (const t of i.attempts) out.push(`- Attempt ${t.retry + 1}: ${t.status}, ${t.durationMs} ms. ${t.error ? `Error: ${md(t.error)}` : ''} ${i.layer === 'API' ? 'Screenshot/trace: not applicable (API request; see API evidence).' : `Screenshot: ${t.screenshot ? (t.screenshotExists ? t.screenshot : `${t.screenshot} (file missing)`) : 'not captured'}. Trace: ${t.trace ? (t.traceExists ? t.trace : `${t.trace} (file missing)`) : 'not captured'}.`}`);
    out.push('');
  }
  out.push('', '## Evidence', '',
    `- Execution CSV: \`${run.csv}\``,
    `- Playwright HTML report: ${run.htmlReport.path ? `\`${run.htmlReport.path}\` (${run.htmlReport.note})` : run.htmlReport.note}`,
    m.apiEvidence ? `- API evidence (sanitized: request names, paths, status codes, timings, assertion results; no headers or bodies): \`${m.apiEvidence}\`. Screenshots and traces do not apply to API requests.`
      : `- Screenshots / traces: ${m.evidenceDir ? `\`${m.evidenceDir}\`, ` : ''}captured only for failed attempts${run.instances.some(i => i.attempts.some(t => t.screenshot || t.trace)) ? '' : '; none in this run'}.`,
    `- Test cases: \`test-cases/test-cases.csv\`. Observed behavior: \`${d.observations.source ?? NR}\``, '',
    '## Feature inventory (coverage status, separate from run outcomes)', '',
    '| Feature | Category | Coverage status | Executed in this run | Cases | Reason / notes |', '|---|---|---|---|---|---|',
    ...d.inventory.map(f => `| ${md(f.Feature)} | ${md(f.Category)} | ${md(f['Coverage Status'])} | ${run.featuresExecuted.includes(f.Feature) ? 'Yes' : 'No'} | ${md(f['Case IDs']) || '—'} | ${md(f['Blocker or Exclusion Reason'] || '')} ${md(f.Notes && f['Coverage Status'] !== 'Automated' ? f.Notes : '')} |`), '',
    '## Open questions (observed behavior, not approved requirements)', '',
    ...d.observations.questions.map(q => `- ${md(q.text)} _(${q.source})_`), '',
    '## Coverage gaps', '', ...a.gaps.map(g => `- ${g}`), '',
    '## QA assessment', '', ...a.lines.map(l => `- ${l}`), '');
  return out.join('\n');
}

function main() {
  const want = process.argv.includes('--run') ? process.argv[process.argv.indexOf('--run') + 1] : null;
  const cases = loadCases();
  const observations = loadObservations();
  const browsersConfigured = configuredBrowsers();
  const pdir = path.join(ROOT, 'postman');
  const postman = { status: 'Not Run', files: fs.existsSync(pdir) ? fs.readdirSync(pdir).filter(f => !f.startsWith('.')) : [] };
  const triage = loadTriage(), inventory = loadInventory();
  const runs = loadRuns(cases, triage, inventory);
  for (const r of runs) {
    r.featuresExecuted = inventory.filter(f => r.modules.includes(f.Feature) || r.executedCaseIds.some(caseIdMatcher(f['Case IDs']))).map(f => f.Feature);
    r.assessment = assess(r, cases, observations, browsersConfigured, postman, inventory);
  }
  // Postman status comes from real API runs, never from the presence of files.
  const apiRun = runs.filter(r => r.purpose === 'normal' && r.layers.includes('API')).at(-1);
  postman.status = apiRun ? `Executed (latest: ${apiRun.runId})` : 'Not Run';
  postman.latest = apiRun ? { runId: apiRun.runId, requests: apiRun.meta.requests, assertions: apiRun.meta.assertions, counts: apiRun.counts, tool: apiRun.meta.tool, collection: apiRun.meta.collection, evidence: apiRun.meta.apiEvidence } : null;

  // Default to the latest normal run; exercise runs are only shown when picked.
  const selected = want ? runs.find(r => r.runId === want) : (runs.filter(r => r.purpose === 'normal').at(-1) ?? runs.at(-1));
  if (want && !selected) throw new Error(`Run ID not found: ${want}. Available: ${runs.map(r => r.runId).join(', ')}`);
  const data = { generatedAt: new Date().toISOString(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone, selectedRunId: selected?.runId ?? null, cases, observations, browsersConfigured, postman, inventory, runs };

  // Escape '<' and line separators so the embedded JSON can never close the <script> tag.
  const json = JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029');
  const template = fs.readFileSync(path.join(ROOT, 'scripts', 'dashboard-template.html'), 'utf8');
  fs.mkdirSync(path.join(ROOT, 'reports', 'dashboard'), { recursive: true });
  fs.writeFileSync(path.join(ROOT, 'reports', 'dashboard', 'index.html'), template.replace('/*__DATA__*/', () => json));
  if (selected) fs.writeFileSync(path.join(ROOT, 'reports', 'qa-summary.md'), markdown(data, selected));
  // One summary per run as well, so every Run ID keeps its own written record.
  fs.mkdirSync(path.join(ROOT, 'reports', 'summaries'), { recursive: true });
  for (const r of runs) fs.writeFileSync(path.join(ROOT, 'reports', 'summaries', `qa-summary-${r.runId}.md`), markdown(data, r));

  console.log(`Runs found: ${runs.length}${runs.length ? ` (${runs.map(r => r.runId).join(', ')})` : ''}`);
  if (selected) {
    const c = selected.counts;
    console.log(`Selected ${selected.runId}: executed ${c.executed}, passed ${c.passed}, flaky ${c.flaky}, failed ${c.failed}, interrupted ${c.interrupted}, skipped ${c.skipped}, not run ${c.notRun}, attempts ${c.attempts}`);
  } else console.log('No execution CSVs found; dashboard shows empty states and qa-summary.md was left unchanged.');
  console.log('Dashboard: reports/dashboard/index.html');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
