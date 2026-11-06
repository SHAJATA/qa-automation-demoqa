# DemoQA Interview Demo - Account and BookStore (Postman)

QA workflow shown here: **API contract analysis → test-case design → automation → execution → investigation → reporting.**

| File | Purpose |
|---|---|
| `DemoQA-Interview-Demo.postman_collection.json` | The collection: 16 requests in 4 folders, with 49 named assertions (the conditional orphan-account check only runs if a weak-password user is ever created). |
| `DemoQA-Interview-Demo.postman_environment.template.json` | Environment template: `baseUrl=https://demoqa.com` plus **empty** runtime variables. `userPassword` and `authToken` are typed *secret*. |
| `../test-cases/api-observed-behavior.md` | Swagger contract analysis and the documented-vs-observed discrepancies D1–D8. |
| `../test-cases/test-cases.csv` | Designed cases `API-AC-*`, `API-BS-*`, `API-CT-*`. Every Postman test name starts with its case ID. |

## Run it from the terminal (Newman, Postman's official CLI runner)
```bash
cd demoqa/automation/playwright   # from the repo root
npm run test:api        # runs the collection once, then writes results for the dashboard
npm run report:build    # rebuild reports/dashboard/index.html and reports/qa-summary.md
npm run report:open
```
Each run writes `reports/execution/execution-<RunID>.csv` and `.meta.json`, plus a sanitized `reports/evidence/<RunID>/api-results.json`. The sanitized file records request names, paths, status codes, timings and assertion results, with no headers, bodies or secrets. Newman's raw output is never written to disk.

## Import into the Postman VS Code extension (free plan)
1. Open the Postman view from the VS Code Activity Bar and make sure you are signed in. Sign in through the extension itself; never paste credentials into chat or files.
2. Choose a workspace. Importing uploads the collection to that Postman workspace; the files contain no secrets.
3. Use **Import** and select `DemoQA-Interview-Demo.postman_collection.json`. If a collection named "DemoQA Interview Demo - Account and BookStore" already exists, replace it rather than keeping two copies.
4. Import `DemoQA-Interview-Demo.postman_environment.template.json` the same way, then select **DemoQA Interview Demo (template)** as the active environment.
5. Leave the *initial values* of `userPassword` and `authToken` empty. The collection writes them as *current values* during a run and clears them at the end.
6. Run the folders **in order**: 1 → 2 → 3 → 4. If your extension version offers running a whole collection, use it. Otherwise send the requests top to bottom; each request skips itself when its prerequisite is missing. `npm run test:api` always runs the full sequence.

## How the collection protects the run
- **Fresh state:** the *Create User* pre-request script clears every lifecycle variable, then generates the username **once** and a disposable password matching the confirmed rules (OBS-API-02).
- **Validate, then capture:** `userId`, `authToken` and the selected ISBN are stored only after their success assertions hold.
- **Guards:** dependent requests call `pm.execution.skipRequest()` when a prerequisite is missing. The runner reports their cases as *skipped (not run)*, not as passed or executed.
- **Isolated negatives:** the wrong password lives in a request-scoped `pm.variables` value, and the duplicate and wrong-password requests assert that the lifecycle `userId` and token are unchanged.
- **Cleanup always attempted:** *Cleanup - Delete User* runs whenever a user was created. If the token is missing it regenerates one first, and *Verify user deleted* confirms the account is gone, then clears all runtime values.
- **No secrets in output:** tokens are asserted in boolean form, so failure messages never print them. The runner also scrubs JWT, bearer and password patterns before writing reports.

## Expected results
`API-CT-001` and `API-CT-002` check the **documented** Swagger contract, and they fail until the API or its documentation is aligned (D1: `userID` vs `userId`; D2: error `code` is a string). They are triaged as suspected product or documentation defects in `../test-cases/failure-triage.csv`. All other assertions check the observed contract.
