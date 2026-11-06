# DemoQA Elements — Observed Behavior

- Observed: 2026-10-02, Chromium (Playwright 1.63.0), live site https://demoqa.com
- Status: **OBSERVED, NOT APPROVED.** No requirements document exists. OBS-* IDs record what the page did, not business rules.
- Text Box observations live in `text-box-observed-behavior.md`.

## Check Box (/checkbox)
| ID | Observation |
|----|-------------|
| OBS-CB-01 | Tree widget (`rc-tree`). Initially only "Home" is visible, collapsed and unchecked. No result area is shown. |
| OBS-CB-02 | The expand toggle shows children: Home → Desktop, Documents, Downloads; Desktop → Notes, Commands; Documents → WorkSpace, Office. |
| OBS-CB-03 | Checkboxes are `role=checkbox` with `aria-label="Select <Name>"` and `aria-checked` true / false / mixed. |
| OBS-CB-04 | Checking a parent checks all of its descendants. Result lists node keys in lowercase, e.g. `desktop notes commands`. |
| OBS-CB-05 | Checking one leaf marks its ancestors `mixed` and lists only that leaf. |
| OBS-CB-06 | When all children of a parent are checked, the parent becomes checked and appears in the result. |
| OBS-CB-07 | Checking Home selects all 17 nodes. Result keys: home, desktop, documents, downloads, notes, commands, workspace, office, wordFile, excelFile, react, angular, veu, public, private, classified, general. |
| OBS-CB-08 | Unchecking the last selection removes the result area entirely. |
| OBS-CB-09 | Collapsing a node keeps its selection and the result. |
| OBS-CB-10 | Clicking a node's title text does not toggle its checkbox. |

## Radio Button (/radio-button)
| ID | Observation |
|----|-------------|
| OBS-RB-01 | Three radios: Yes, Impressive, No. None is selected initially and no result is shown. |
| OBS-RB-02 | Selecting a radio shows `You have selected <Label>`. |
| OBS-RB-03 | Radios are mutually exclusive. Selecting Impressive after Yes deselects Yes and updates the result. |
| OBS-RB-04 | "No" is a disabled input. Activating its label neither selects it nor changes the result. |

## Buttons (/buttons)
| ID | Observation |
|----|-------------|
| OBS-BT-01 | Three buttons: "Double Click Me" (`#doubleClickBtn`), "Right Click Me" (`#rightClickBtn`), and "Click Me", whose `id` is random per page load. |
| OBS-BT-02 | Double click on "Double Click Me" shows `You have done a double click`. A single click shows nothing. |
| OBS-BT-03 | Right click on "Right Click Me" shows `You have done a right click`. A left click shows nothing. |
| OBS-BT-04 | Left click on "Click Me" shows `You have done a dynamic click`. A right click on it shows nothing. |
| OBS-BT-05 | Messages are independent. Each action shows only its own message, and earlier messages remain. |

## Questions / not asserted
- Keyboard operation of the Check Box tree was not assessed. Checkbox spans have no tabindex, which needs accessibility review, not a pass/fail claim.
- Node key `veu` (likely meant "vue") is shown as-is. It's cosmetic and not asserted as a defect.

## Web Tables (/webtables)
| ID | Observation |
|----|-------------|
| OBS-WT-01 | Table columns: First Name, Last Name, Age, Email, Salary, Department, Action. 3 seeded rows: Cierra Vega, Alden Cantrell, Kierra Gentry. Page size 10 (options 10–50). |
| OBS-WT-02 | "Add" opens a modal form. All 6 inputs carry the HTML `required` attribute. An empty submit keeps the modal open, marks the form `was-validated`, and leaves all 6 invalid. |
| OBS-WT-03 | A valid submission closes the modal and appends the row with the entered values. |
| OBS-WT-04 | The Email input's HTML `pattern` requires a 2–5 letter TLD: `a@b.c` invalid, `a@b.co` valid, `a@b.abcde` valid, `a@b.abcdef` invalid. |
| OBS-WT-05 | Age: `maxlength=2`, `pattern=\d*`. Typing `100` keeps `10`; non-digits are invalid. Salary: `maxlength=10`, `pattern=\d*`. First/Last Name and Department: `maxlength=25`. |
| OBS-WT-06 | The Edit icon (`#edit-record-N`) opens the modal prefilled with the row's values. Submitting updates that row. |
| OBS-WT-07 | Deleting a user-added row removes only that row. |
| OBS-WT-08 | **Suspected defect:** deleting a seeded row (e.g. `#delete-record-2`, Alden) also removes every user-added row. Reproduced 2026-10-02 in two clean sessions (Alden and Cierra). Editing a seeded row does not remove added rows. |
| OBS-WT-09 | Search (`#searchBox`) filters rows case-insensitively across columns (`LEGAL` → Kierra; `cierra@` → Cierra). With no match the table body has 0 rows and the pager reads "Page 1 of 0". |
| OBS-WT-10 | With 11 rows, page 1 shows 10 ("Page 1 of 2"), Next shows the 11th, and Previous returns. Page size 20 shows all 11 ("Page 1 of 1"). |
| OBS-WT-11 | Escape closes the Add modal without adding a row. |
| OBS-WT-12 | The table resets to the 3 seeded rows on reload; nothing persists. |

### Web Tables questions / not asserted
- "Page 1 of 0" with no search results is likely cosmetic; it is not asserted.
- Whether delete should be undoable or confirmed is unknown; it is not asserted.

## Links (/links)
| ID | Observation |
|----|-------------|
| OBS-LK-01 | "Home" (`#simpleLink`) opens https://demoqa.com/ in a new tab (`target=_blank`). |
| OBS-LK-02 | The dynamic link (`#dynamicLink`) text is "Home" plus a random 5-character suffix per load (e.g. `HomefWM0V`). It also opens https://demoqa.com/ in a new tab. |
| OBS-LK-03 | API links call `GET /created` (201), `/no-content` (204), `/moved` (301), `/bad-request` (400), `/unauthorized` (401), `/forbidden` (403), `/invalid-url` (404). The page shows `Link has responded with staus <code> and status text <text>` ("staus" sic). |

## Broken Links - Images (/broken)
| ID | Observation |
|----|-------------|
| OBS-BL-01 | **Suspected defect:** the image labelled "Valid image" (`/images/Toolsqa.jpg`) does not render (`naturalWidth` 0). `GET /images/Toolsqa.jpg` returns 200 `text/html` (436 bytes), not an image. The header logo asset does render. |
| OBS-BL-02 | The "Broken image" (`/images/Toolsqa_1.jpg`) does not render (`naturalWidth` 0), as its label suggests. |
| OBS-BL-03 | "Click Here for Valid Link" (`http://demoqa.com`) navigates to the DemoQA home page (via 301 to https). |
| OBS-BL-04 | "Click Here for Broken Link" points to an **external** site, `http://the-internet.herokuapp.com/status_codes/500`, which returned HTTP 500. One direct request timed out after 30 s, so results depend on that third-party site. |

## Upload and Download (/upload-download)
| ID | Observation |
|----|-------------|
| OBS-UD-01 | Download (`#downloadButton`, `download="sampleFile.jpeg"`) saves a 4096-byte JPEG (magic bytes `ffd8ffe0`) from a data URL. |
| OBS-UD-02 | Upload input `#uploadFile` is single-file with no `accept` restriction. After selection the page shows `C:\fakepath\<filename>` in `#uploadedFilePath`. |
| OBS-UD-03 | Clearing the selection removes `#uploadedFilePath`. |
| OBS-UD-04 | An empty (0-byte) file and a name with spaces, `&` and accented characters are shown verbatim. No size or type validation was observed. |

## Dynamic Properties (/dynamic-properties)
| ID | Observation |
|----|-------------|
| OBS-DP-01 | "Will enable 5 seconds" (`#enableAfter`) starts disabled and becomes enabled about 5 s after load. |
| OBS-DP-02 | "Color Change" (`#colorChange`) gains class `text-danger` (text colour rgb(220, 53, 69)) about 5 s after load. |
| OBS-DP-03 | "Visible After 5 Seconds" (`#visibleAfter`) is absent at load and appears about 5 s later. |
| OBS-DP-04 | The paragraph "This text has random Id" gets a random `id` after load. It is located by text, never by id. |
