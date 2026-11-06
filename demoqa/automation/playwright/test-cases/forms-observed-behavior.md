# DemoQA Forms — Observed Behavior

- Observed: 2026-10-02, Chromium (Playwright 1.63.0), https://demoqa.com/automation-practice-form
- Status: **OBSERVED, NOT APPROVED.** "Required" below means the HTML `required` attribute is present on the live page, not a business rule.

## Practice Form
| ID | Observation |
|----|-------------|
| OBS-PF-01 | HTML `required`: First Name, Last Name, Gender (radio group), Mobile. Email, Date of Birth, Subjects, Hobbies, Picture, Address, State and City are not required. |
| OBS-PF-02 | An empty submit adds `was-validated` and opens no modal. Invalid: firstName, lastName, the three gender radios, userNumber. |
| OBS-PF-03 | Mobile: `pattern=\d*`, `minlength=10`, `maxlength=10`. 9 digits is invalid; typing 11 digits keeps 10. |
| OBS-PF-04 | Email is optional, but when filled must match `^([a-zA-Z0-9_\-\.]+)@([a-zA-Z0-9_\-\.]+)\.([a-zA-Z]{2,5})$`. `not-an-email` blocks submit. |
| OBS-PF-05 | Date of Birth defaults to today (`dd MMM yyyy`). The picker has month and year selects (years 1900–2100). Choosing 15 May 1990 shows `15 May 1990`, and the modal shows `15 May,1990`. |
| OBS-PF-06 | Subjects is an autocomplete. Typing `Ma` offers `Maths`, and Enter adds a `Maths` chip. |
| OBS-PF-07 | City is disabled until a State is chosen. States: NCR, Uttar Pradesh, Haryana, Rajasthan. Haryana → Karnal, Panipat. Rajasthan → Jaipur, Jaiselmer. |
| OBS-PF-08 | **Suspected defect:** after choosing Haryana / Karnal and then changing State to Rajasthan, City still shows Karnal and the form submits `Rajasthan Karnal`, a pair the City list does not offer. |
| OBS-PF-09 | A valid submission opens "Thanks for submitting the form" with rows: Student Name, Student Email, Gender, Mobile, Date of Birth, Subjects, Hobbies, Picture (file name), Address, State and City. |
| OBS-PF-10 | **Suspected defect:** the modal's "Close" button (`#closeLargeModal`) does not close it. The click throws the page error `Lr.findDOMNode is not a function`. Reproduced in two clean sessions on 2026-10-02. |
| OBS-PF-11 | Escape closes the modal. The form keeps its values afterwards; it is not reset. |

## Questions / not asserted
- Should the form reset after a successful submission? Not asserted.
- Address line breaks render as a space in the modal, the same pattern as Text Box OBS-TB-11.
