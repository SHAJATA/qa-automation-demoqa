# DemoQA Text Box — Observed Behavior

- Page: https://demoqa.com/text-box
- Observed: 2026-10-02, Chromium (Playwright 1.63.0)
- Status: **OBSERVED, NOT APPROVED.** No product requirements document exists for this page.
  The IDs below (OBS-TB-xx) record what the page did when probed. They are not business rules.
  Replace them with real requirement IDs once requirements are approved.

| ID | Observation |
|----|-------------|
| OBS-TB-01 | Form has Full Name (text), Email (type=email), Current Address (textarea), Permanent Address (textarea), and a Submit button. |
| OBS-TB-02 | No field has `required`, `pattern`, or `maxlength`. Submitting an empty form shows no output and no error styling. |
| OBS-TB-03 | A valid submission renders an `#output` box with one line per filled field: `Name:`, `Email:`, `Current Address :`, `Permananet Address :` (sic). |
| OBS-TB-04 | Only filled fields appear in the output. Name-only submission shows only the Name line. |
| OBS-TB-05 | Invalid email adds CSS class `field-error` to the email input, and no output is rendered for that submission. |
| OBS-TB-06 | Email validation boundary: a 1-character TLD (`a@b.c`) is rejected and a 2-character TLD (`a@b.co`) is accepted. |
| OBS-TB-07 | Also rejected: no `@` (`not-an-email`), no domain dot (`a@b`), a space in the local part, an empty local part (`@x.com`), an empty domain label (`a@.com`). |
| OBS-TB-08 | `field-error` stays while retyping. It clears only on the next submit with a valid email. |
| OBS-TB-09 | If an invalid email is submitted after a valid submission, the previous output stays on screen (stale). It is not updated with the invalid value. |
| OBS-TB-10 | HTML-like input (`<b>x</b>`) is shown as literal text, not rendered as markup. |
| OBS-TB-11 | Line breaks in Current Address are kept in the output's text content (`1 Main St\nApt 2`), but the output uses `white-space: normal`, so on screen the address renders on one line (newline shown as a space). Re-checked 2026-10-02. |

## Questions for the product owner (not asserted)
- Is "Permananet Address" a typo? A suspected product defect; it's only cosmetic.
- Should stale output be cleared when a later submission is invalid (OBS-TB-09)?
- Are any fields meant to be required? None are, today.
- Should multi-line addresses display on separate lines in the output? Today the line break exists in the text but renders as a space (OBS-TB-11).
- Is there a maximum length? None is enforced client-side, so no length boundary was tested.

## Testability notes
- Output `<p id="currentAddress">` / `<p id="permanentAddress">` reuse the textarea IDs. Locators must be scoped to `#userForm` (inputs) or `#output` (results).
- Labels are not linked to their inputs (no `for` attribute), so `getByLabel` does not work. Use placeholders, or a scoped ID for Permanent Address, which has no placeholder.
