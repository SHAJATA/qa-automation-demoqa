import fs from 'node:fs';
import path from 'node:path';
import type { Reporter, TestCase, TestResult, FullConfig, FullResult, Suite } from '@playwright/test/reporter';

// Writes reports/execution/execution-<RunID>.csv from real runner results, plus a
// execution-<RunID>.meta.json with run facts (start time, timezone, wall-clock, workers, version).
// One row per attempt, so retries are preserved. The final passing attempt of a test that
// failed earlier is marked "flaky", while a first-attempt pass stays "passed".

const HEADER = ['Run ID', 'Test Case ID', 'Test Name', 'Module', 'Tool', 'Status', 'Duration (ms)',
  'Retry Count', 'Error', 'Screenshot Path', 'Trace Path'];

const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
// Strip ANSI colour codes and collapse whitespace so each error fits on one CSV line.
const clean = (s = '') => s.replace(/\u001b\[[0-9;]*m/g, '').replace(/\s+/g, ' ').trim().slice(0, 500);

export default class CsvReporter implements Reporter {
  private rows: string[][] = [];
  private root = '';
  private runId = process.env.RUN_ID || new Date().toISOString().replace(/[:.]/g, '-');
  private meta: Record<string, unknown> = {};

  onBegin(config: FullConfig, suite: Suite) {
    this.root = config.configFile ? path.dirname(config.configFile) : process.cwd();
    const rel = (p?: string) => (p ? path.relative(this.root, path.resolve(this.root, p)) : null);
    const projects = [...new Set(suite.allTests().map(t => t.parent.project()?.name ?? ''))];
    const used = config.projects.find(p => p.name === projects[0]);
    const html = config.reporter.find(([name]) => name === 'html')?.[1] as { outputFolder?: string } | undefined;
    this.meta = {
      runId: this.runId,
      // 'normal' unless set, e.g. RUN_PURPOSE=reporting-verification for an intentional-failure exercise
      purpose: process.env.RUN_PURPOSE || 'normal',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      playwrightVersion: config.version,
      workers: config.workers,
      projects,
      baseURL: used?.use?.baseURL ?? null,
      retries: used?.retries ?? null,
      command: `playwright ${process.argv.slice(2).join(' ')}`,
      htmlReport: html?.outputFolder ? path.join(rel(html.outputFolder)!, 'index.html') : null,
      evidenceDir: rel(used?.outputDir),
    };
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const rel = (p?: string) => (p ? path.relative(this.root, p) : '');
    const attach = (name: string) => rel(result.attachments.find(a => a.name === name && a.path)?.path);
    // A pass is always the final attempt; a pass after retry 0 means earlier attempts failed.
    const status = result.status === 'passed' && result.retry > 0 ? 'flaky' : result.status;
    this.rows.push([
      this.runId,
      test.title.match(/^[A-Z]+-[A-Z]+-\d+/)?.[0] ?? '',
      test.title,
      test.parent.title || path.basename(test.location.file),
      `Playwright (${test.parent.project()?.name ?? ''})`,
      status,
      String(result.duration),
      String(result.retry),
      clean(result.errors.map(e => e.message).join(' | ')),
      attach('screenshot'),
      attach('trace'),
    ]);
  }

  onEnd(result: FullResult) {
    if (!this.rows.length) return; // e.g. --list: nothing executed, so no CSV
    const dir = path.join(this.root, 'reports', 'execution');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `execution-${this.runId}.csv`);
    fs.writeFileSync(file, [HEADER, ...this.rows].map(r => r.map(q).join(',')).join('\n') + '\n');
    const meta = { ...this.meta, startTime: result.startTime.toISOString(), wallClockMs: Math.round(result.duration), status: result.status };
    fs.writeFileSync(file.replace(/\.csv$/, '.meta.json'), JSON.stringify(meta, null, 2) + '\n');
    console.log(`\nExecution CSV: ${path.relative(process.cwd(), file)}`);
  }
}
