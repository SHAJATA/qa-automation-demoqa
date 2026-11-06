# QA Automation: DemoQA

End-to-end QA work on [demoqa.com](https://demoqa.com): test design, Playwright UI automation, Postman/Newman API automation, failure triage and reporting.

**Workflow:** requirements and observed behavior → test-case design → automation → execution → failure investigation (test issue vs product defect) → HTML dashboard + CSV reports, with every result traced back to a test-case ID.

## At a glance

| | |
|---|---|
| Designed test cases | 168 across 26 modules ([test-cases.csv](demoqa/automation/playwright/test-cases/test-cases.csv)) |
| UI automation | Playwright + TypeScript, 25 spec files, 149 UI cases |
| API automation | Postman collection (Account + BookStore APIs) run with Newman, 19 cases |
| Latest full UI run | 149 executed, 145 passed, 4 failed (97.3%); all 4 triaged as suspected product defects |
| Latest API run | 19 executed, 17 passed, 2 failed (89.5%); both are documented-vs-actual contract mismatches |
| Reporting | Custom CSV reporter, per-run execution CSVs, QA summaries, HTML dashboard |

Failures are not hidden or weakened: tests that catch a suspected product defect keep failing, and each one is explained in [failure-triage.csv](demoqa/automation/playwright/test-cases/failure-triage.csv).

## Layout

```
demoqa/automation/playwright/
├── tests/            Playwright specs (one per DemoQA feature) + fixtures
├── reporters/        CSV reporter: one execution CSV per run
├── scripts/          Dashboard/summary builder, Newman API runner, unit tests
├── postman/          API collection + empty environment template
├── test-cases/       Test cases, feature inventory, failure triage, observed-behavior notes
└── reports/          Execution CSVs, QA summaries, HTML dashboard
```

## Run it

Requires a current Node.js LTS.

```bash
cd demoqa/automation/playwright
npm ci
npx playwright install chromium

npm run test:ui        # all UI cases on Chromium
npm run test:textbox   # one feature, quick check
npm run test:api       # Postman collection via Newman
npm run report:build   # rebuild dashboard + QA summaries from saved results
npm run report:open    # open reports/dashboard/index.html
npm run report:check   # unit tests for the report builder
```

Each run gets a Run ID shared by its HTML report, evidence folder and execution CSV, so earlier runs are never overwritten. Screenshots, traces and HTML reports stay local (git-ignored); the execution CSVs, summaries and dashboard are committed.

## Reporting rules

- A test counts as **executed** only if it actually ran; skipped and not-run cases are reported separately.
- Retries are recorded: a pass after retry is reported as **flaky**, not as a clean pass.
- Every failure gets a reviewed cause (test issue or suspected product defect) backed by evidence. Suspected defects are not presented as confirmed.
- Expected results come from observed behavior where no formal requirements exist, and that is stated in every summary.
