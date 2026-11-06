# DemoQA Widgets — Observed Behavior

- Observed: 2026-10-02, Chromium (Playwright 1.63.0). Status: **OBSERVED, NOT APPROVED.**

## Accordian (/accordian)
| ID | Observation |
|----|-------------|
| OBS-AC-01 | Three sections: "What is Lorem Ipsum?", "Where does it come from?", "Why do we use it?". The first is open (`collapse show`) at load. |
| OBS-AC-02 | Opening another section closes the open one; only one is open at a time. |
| OBS-AC-03 | Clicking the open section's header collapses it, leaving all closed. |

## Auto Complete (/auto-complete)
| ID | Observation |
|----|-------------|
| OBS-AU-01 | Multi input (`#autoCompleteMultipleInput`): typing `r` suggests colours containing "r": Red, Green, Purple. Enter/click adds a chip. |
| OBS-AU-02 | Colours already chosen are not suggested again. |
| OBS-AU-03 | A chip's remove (×) removes only that chip. |
| OBS-AU-04 | Single input (`#autoCompleteSingleInput`): `Bl` suggests Blue and Black. A later choice replaces the earlier one. |
| OBS-AU-05 | Text with no match (`zzz`) shows no options. |

## Date Picker (/date-picker)
| ID | Observation |
|----|-------------|
| OBS-DT-01 | `#datePickerMonthYearInput` defaults to today as `MM/DD/YYYY`. Month select 0–11 and year select 1900–2100. |
| OBS-DT-02 | Picking February 2024, day 29 sets `02/29/2024` (leap day). |
| OBS-DT-03 | Typing the impossible date `02/30/2023` is not accepted; the field keeps its previous value. Typing `12/31/2025` is accepted. |
| OBS-DT-04 | `#dateAndTimePickerInput` defaults to today plus a time, e.g. `October 2, 2026 9:30 AM`. The time list has 96 slots, 00:00–23:45 in 15-minute steps. Choosing 14:15 shows `2:15 PM`. |

## Slider (/slider)
| ID | Observation |
|----|-------------|
| OBS-SL-01 | Range input min 0, max 100, default 25. `#sliderValue` mirrors the value. |
| OBS-SL-02 | ArrowRight adds 1, Home sets 0, End sets 100. |

## Progress Bar (/progress-bar)
| ID | Observation |
|----|-------------|
| OBS-PB-01 | Starts at `aria-valuenow=0`, text "0%". Button "Start". |
| OBS-PB-02 | Start advances the value over time and the button reads "Stop". Stop pauses the value and the button reads "Start". |
| OBS-PB-03 | At 100 the bar shows "100%" with class `bg-success`, and a "Reset" button (`#resetButton`) appears. Reset returns to 0 and "Start". A full run took ~10 s of real time. |

## Tabs (/tabs)
| ID | Observation |
|----|-------------|
| OBS-TA-01 | Tabs What, Origin, Use, More. "What" is selected at load and shows the "Lorem Ipsum is simply dummy text" panel. |
| OBS-TA-02 | Selecting Origin marks it `aria-selected=true` and shows the "Contrary to popular belief" panel. |
| OBS-TA-03 | "More" is disabled (`aria-disabled=true`) and cannot be selected. |

## Tool Tips (/tool-tips)
| ID | Observation |
|----|-------------|
| OBS-TT-01 | Hover tooltips: button → "You hovered over the Button"; text field → "You hovered over the text field"; "Contrary" link → "You hovered over the Contrary"; "1.10.32" link → "You hovered over the 1.10.32". |
| OBS-TT-02 | The first hover right after load sometimes shows no tooltip; a second hover does. This is consistent with handlers attaching after load, so tests repeat the hover until the tooltip appears (bounded). |
| OBS-TT-03 | Tooltips disappear when the pointer leaves. |

## Menu (/menu)
| ID | Observation |
|----|-------------|
| OBS-MN-01 | Initially visible: Main Item 1, Main Item 2, Main Item 3. All links are `href="#"`. |
| OBS-MN-02 | Hovering Main Item 2 shows Sub Item, Sub Item, SUB SUB LIST ». |
| OBS-MN-03 | Hovering SUB SUB LIST » shows Sub Sub Item 1 and Sub Sub Item 2. |

## Select Menu (/select-menu)
| ID | Observation |
|----|-------------|
| OBS-SM-01 | "Select Value" (`#withOptGroup`) has options Group 1, option 1/2; Group 2, option 1/2; A root option; Another root option. |
| OBS-SM-02 | "Select One" (`#selectOne`) has options Dr., Mr., Mrs., Ms., Prof., Other. |
| OBS-SM-03 | Old style `<select id="oldSelectMenu">` defaults to Red (value `red`). Its options include "Voilet" (sic). |
| OBS-SM-04 | Multiselect drop down offers Green, Blue, Black, Red. Chosen values become chips and leave the option list, and a chip's × removes it. |
| OBS-SM-05 | Standard multi select `#cars` (`multiple`) offers Volvo, Saab, Opel, Audi. |
