# DemoQA Alerts, Frame & Windows — Observed Behavior

- Observed: 2026-10-02, Chromium (Playwright 1.63.0). Status: **OBSERVED, NOT APPROVED.**

## Browser Windows (/browser-windows)
| ID | Observation |
|----|-------------|
| OBS-BW-01 | "New Tab" (`#tabButton`) opens https://demoqa.com/sample, heading `#sampleHeading` "This is a sample page". |
| OBS-BW-02 | "New Window" (`#windowButton`) opens the same /sample page in a new browser window. |
| OBS-BW-03 | "New Window Message" (`#messageWindowButton`) opens an `about:blank` window whose body text is "Knowledge increases by sharing but not by saving. Please share this website with your friends and in your organization." It never fires a normal load, so waiting for "load" times out. |
| OBS-BW-04 | Playwright sees tabs and windows as pages in the same context. "Tab vs window" chrome differences are not observable here and are not asserted. |

## Alerts (/alerts)
| ID | Observation |
|----|-------------|
| OBS-AL-01 | `#alertButton` shows an alert "You clicked a button". |
| OBS-AL-02 | `#timerAlertButton` shows the alert "This alert appeared after 5 seconds" about 5.1 s after the click. |
| OBS-AL-03 | `#confirmButton` shows "Do you confirm action?". OK → `#confirmResult` "You selected Ok"; Cancel → "You selected Cancel". |
| OBS-AL-04 | `#promtButton` (sic) shows the prompt "Please enter your name". OK with text → `#promptResult` "You entered <text>". HTML is shown as text. |
| OBS-AL-05 | Prompt Cancel, or OK with an empty value, shows no `#promptResult`. Cancel after an earlier entry removes the earlier result. |

## Frames (/frames)
| ID | Observation |
|----|-------------|
| OBS-FR-01 | `#frame1` (500×350) and `#frame2` (100×100) both load `/sample.html`, which shows `#sampleHeading` "This is a sample page". |
| OBS-FR-02 | The page's own heading "Frames" is outside the frames; frame content is not part of the main document. |

## Nested Frames (/nestedframes)
| ID | Observation |
|----|-------------|
| OBS-NF-01 | `#frame1` (`/sampleiframe.html`) body text is "Parent frame" and contains exactly one child iframe. |
| OBS-NF-02 | The child iframe's body text is "Child Iframe". |

## Modal Dialogs (/modal-dialogs)
| ID | Observation |
|----|-------------|
| OBS-MD-01 | "Small modal" opens a dialog titled "Small Modal" with body "This is a small modal. It has very less content". `#closeSmallModal` closes it. |
| OBS-MD-02 | "Large modal" opens "Large Modal" with a long Lorem Ipsum body (574 characters). `#closeLargeModal` closes it, unlike the Practice Form close button (OBS-PF-10). |
| OBS-MD-03 | The header close (×) button, Escape, and a backdrop click each close the small modal. |
