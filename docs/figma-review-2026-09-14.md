Training Labs — fresh Figma review, 14 September 2026

Workout Details editing is implemented and validated. The current working tree was reviewed before edits, including all ten requested routes, reusable UI components, the template provider, domain models, unit handling, tests, and configuration. Pre-existing uncommitted work was preserved.

Source: [Training Labs Figma](https://www.figma.com/design/QLuSadeuB64GfhduYowfqR/Training-Labs?node-id=0-1). Page discovery and current design/prototype inspection used Figma MCP. [Machine-readable inventory](figma-review-inventory.json) includes screen IDs, immediate child IDs/geometry, text, and navigation reactions.

**1. Current 03 - Mobile nodes**

| Node | Screen/state |
| --- | --- |
| [31:459](https://www.figma.com/design/QLuSadeuB64GfhduYowfqR/Training-Labs?node-id=31-459) | Active Workout |
| [31:418](https://www.figma.com/design/QLuSadeuB64GfhduYowfqR/Training-Labs?node-id=31-418) | Workout Details |
| [31:378](https://www.figma.com/design/QLuSadeuB64GfhduYowfqR/Training-Labs?node-id=31-378) | My Workouts |
| [39:1208](https://www.figma.com/design/QLuSadeuB64GfhduYowfqR/Training-Labs?node-id=39-1208) | Create Workout |
| [59:3100](https://www.figma.com/design/QLuSadeuB64GfhduYowfqR/Training-Labs?node-id=59-3100) | Workout Completed |
| [59:3122](https://www.figma.com/design/QLuSadeuB64GfhduYowfqR/Training-Labs?node-id=59-3122) | Home |
| [59:3224](https://www.figma.com/design/QLuSadeuB64GfhduYowfqR/Training-Labs?node-id=59-3224) | Exercises |
| [59:3354](https://www.figma.com/design/QLuSadeuB64GfhduYowfqR/Training-Labs?node-id=59-3354) | Exercise Details |
| [75:4182](https://www.figma.com/design/QLuSadeuB64GfhduYowfqR/Training-Labs?node-id=75-4182) | Progress |
| [93:1075](https://www.figma.com/design/QLuSadeuB64GfhduYowfqR/Training-Labs?node-id=93-1075) | Login Page |
| [59:3353](https://www.figma.com/design/QLuSadeuB64GfhduYowfqR/Training-Labs?node-id=59-3353) | Layout |
| [136:2297](https://www.figma.com/design/QLuSadeuB64GfhduYowfqR/Training-Labs?node-id=136-2297) | Workout Details - Change Workout |

**2. Current 04 - Prototype nodes**

| Node | Screen/state |
| --- | --- |
| [59:1990](https://www.figma.com/design/QLuSadeuB64GfhduYowfqR/Training-Labs?node-id=59-1990) | Workout Completed |
| [59:1537](https://www.figma.com/design/QLuSadeuB64GfhduYowfqR/Training-Labs?node-id=59-1537) | Active Workout |
| [59:1501](https://www.figma.com/design/QLuSadeuB64GfhduYowfqR/Training-Labs?node-id=59-1501) | Workout Details |
| [135:2211](https://www.figma.com/design/QLuSadeuB64GfhduYowfqR/Training-Labs?node-id=135-2211) | Workout Details - Change Workout |
| [136:2354](https://www.figma.com/design/QLuSadeuB64GfhduYowfqR/Training-Labs?node-id=136-2354) | Workout Details - Change Workout - Select Workout |
| [135:2247](https://www.figma.com/design/QLuSadeuB64GfhduYowfqR/Training-Labs?node-id=135-2247) | Action List |
| [59:1412](https://www.figma.com/design/QLuSadeuB64GfhduYowfqR/Training-Labs?node-id=59-1412) | My Workouts - Workout Created |
| [58:1138](https://www.figma.com/design/QLuSadeuB64GfhduYowfqR/Training-Labs?node-id=58-1138) | Create Workout - 2 Sets |
| [58:744](https://www.figma.com/design/QLuSadeuB64GfhduYowfqR/Training-Labs?node-id=58-744) | Create Workout - Exercise Added |
| [58:940](https://www.figma.com/design/QLuSadeuB64GfhduYowfqR/Training-Labs?node-id=58-940) | Create Workout - Empty |
| [69:3778](https://www.figma.com/design/QLuSadeuB64GfhduYowfqR/Training-Labs?node-id=69-3778) | Exercises |
| [69:3889](https://www.figma.com/design/QLuSadeuB64GfhduYowfqR/Training-Labs?node-id=69-3889) | Exercise Details |
| [69:4084](https://www.figma.com/design/QLuSadeuB64GfhduYowfqR/Training-Labs?node-id=69-4084) | Home |
| [69:4136](https://www.figma.com/design/QLuSadeuB64GfhduYowfqR/Training-Labs?node-id=69-4136) | My Workouts |
| [75:4194](https://www.figma.com/design/QLuSadeuB64GfhduYowfqR/Training-Labs?node-id=75-4194) | Progress |
| [94:1174](https://www.figma.com/design/QLuSadeuB64GfhduYowfqR/Training-Labs?node-id=94-1174) | Login Page |

**3. Newly represented states and comparison limits**

The starting implementation had no edit mode, exercise selection, or action menu. Mobile `136:2297`, Prototype `135:2211`, selected state `136:2354`, and overlay `135:2247` are now represented. The selected frame is named “Select Workout” in Figma, but it selects an exercise inside the workout.

Components inspected: Action List `135:1237`; Action Element set `135:1224` with Default `135:1188`, Focus `135:1225`, Pressed `135:1231`; Delete `135:1200`; Chevron Up `135:1263`; Chevron Down `135:1268`; Exercise Item `31:438`; Exercise Search Item `39:1481`. Unselected circle `136:2313` and selected circle `136:2370` are local frame assets, not standalone selection component variants. Existing three-dot assets match the current design.

There is no saved earlier Figma snapshot/version in the project. “New” here means missing from the starting implementation, not a verified Figma creation/modification date. Other differences below are current findings; their historical dates cannot be established from node IDs.

**4. Files changed by this review**

| File | Change |
| --- | --- |
| `app/workouts/[id]/page.tsx` | Local edit/selection/menu state, template actions, scrollable rows, route-keyed state reset |
| `app/workouts/[id]/active/page.tsx` | Read exercises in explicit position order |
| `components/exercise-item.tsx` | Reuse normal row styling with selectable edit variant |
| `components/workout-exercise-menu.tsx` | New accessible action menu, boundary disabling, outside-click/Escape closing, keyboard navigation |
| `components/workout-template-provider.tsx` | Immutable update of one template by ID |
| `components/workout-editor.tsx` | Normalize positions when adding/removing draft exercises |
| `lib/workout-template.ts` | Required exercise position, seed/draft positions, sorting/move/remove/normalization functions |
| `tests/workout-template.test.mjs` | Five additional regression tests; eight total |
| `public/icons/workout-details/unselected.svg` | Exact Figma unselected-circle export |
| `public/icons/workout-details/selected.svg` | Exact Figma selected-circle export |
| `public/icons/workout-details/delete.svg` | Exact Figma circle-minus export |
| `public/icons/workout-details/up.svg` | Exact Figma circle-chevron-up export |
| `public/icons/workout-details/down.svg` | Exact Figma circle-chevron-down export |
| `docs/figma-review-inventory.json` | Current screen and navigation inventory |
| `docs/figma-review.md` | This report |

The other changes already visible in `git status` at the start—including AGENTS.md, layout, Create/My Workouts pages, planned-set cards, unit selector, and supporting modules—are pre-existing work. Their functionality was retained. No database, authentication, API routes, server actions, or storage layer was added.

**5. Edit mode and header behavior**

The three-dot button directly enters editing and opens the exercise action menu, following Prototype `59:1509`. No intermediate “Edit/Rename/Delete workout” menu is designed. Until an exercise is selected, all three actions are disabled. Clicking outside closes the menu and leaves the selectable rows visible.

Edits apply immediately to the reusable template. Back goes to My Workouts; Start opens Active Workout. Both clear local editing/selection state on leaving the screen. There is no designed Save/Done or confirmation state, so no additional visible control was invented. Escape dismisses a focused menu; Escape outside the menu exits editing. Selecting a different workout ID also resets local state.

**6. Exercise selection and menu geometry**

Each exercise row is an accessible button with `aria-pressed`; clicking its circle or body selects that stable workout-exercise ID. Exactly one row is selected. Selection uses Figma’s hollow/filled circle assets in 24 × 24 slots with an 8px gap to the existing exercise surface.

The latest overlay measures 200 × 172, with 10px padding/gaps and three 180 × 44 actions. It uses neutral/50, radius/12, Body/M, and 24px icon slots containing 22px exported glyphs. A later fresh read returned height 172 rather than the initial 215; the implementation follows the later design context and screenshot.

Mobile reaction `136:2305` supplies a valid relative anchor of approximately (-176, 32) from the three-dot button, giving screen coordinates (174, 63) at 390 × 844. This is implemented. Prototype `59:1509` and `136:2274` retain inconsistent off-screen overlay coordinates; those were not copied. Overlay background is transparent and closes on outside click.

**7. Move up/down**

`moveWorkoutExercise(workout, id, -1 | 1)` sorts by position, swaps the selected entry with exactly one neighbor, then normalizes positions. Stable IDs, catalog IDs, names, and the complete planned-set arrays survive unchanged. First-up and last-down are both disabled in the UI and rejected as no-ops in the domain function. Selection follows the moved entry; the menu closes after the action.

The action labels are exactly `Підняти вгору` and `Опустити вниз`. Figma has no explicit disabled variant; native disabled buttons with reduced opacity communicate unavailable actions.

**8. Deletion**

`removeWorkoutExercise` removes only the matching entry from the selected template, including its nested planned sets. Remaining entries are normalized without resetting their prescriptions. Selection and the menu clear afterward. Deleting the final exercise produces an empty template safely; Back and Start continue to work. No confirmation modal exists in Figma. Other templates and the global catalog are not mutated.

The Prototype action-list entries have no destination reactions. Actual mutation semantics therefore follow the explicit user requirements, rather than inferred post-action screens.

**9. Local ordering and active data**

`WorkoutExercise.position` is required, one-based, and contiguous after add/move/delete. It maps naturally to a future `WorkoutExercise.position` database field. Seed templates and new drafts set it explicitly. Both Details and Active sort by it.

Active rows still initialize from planned sets and copy their planned data. Planned row count, weight, unit, and reps survive template edits; actual reps/reserve remain separate and blank initially. Active weight/unit edits do not write back to the template. Existing previous-results/history views are static previews, not stored sessions. State remains in memory and resets on reload.

**10. Add Exercise on Workout Details**

No Add Exercise control, search list, or add interaction exists in any current Workout Details frame or its prototype actions. It was not added. Create Workout’s existing add/remove-set and add/remove-exercise behavior remains available.

**11. Search audit**

| Search/control | Status | Evidence |
| --- | --- | --- |
| My Workouts search | Still mock/static | A nonmatching query leaves all 3 seed cards visible |
| Exercises search | Still mock/static | A nonmatching query leaves all 12 catalog rows visible |
| Create Workout exercise search | Still mock/static | A nonmatching query still shows the fixed bench-press result; Plus adds that same exercise and permits duplicates |
| Weight-unit searchable list | Functional | Keyboard/type-ahead selection and kg/lb choice work; mixed-unit Active prefill verified |

`SearchField` has no controlled value/filter callback. `SearchableList` is currently the reusable select-only unit combobox; it is not an exercise-catalog search implementation. Figma includes the exercise search field/result and Empty/Exercise Added states, but no distinct filtered dropdown, typed-query, or no-results state/interaction was found. Search was audited and left unchanged in this edit-focused implementation.

**12. My Workouts interactions**

Current states are Mobile `31:378`, Prototype `69:4136`, and “Workout Created” `59:1412`. No workout-level edit/reorder/delete states or clear corresponding prototype interactions were found. No workout-level actions were introduced. Exercise ordering is confined to each workout.

**13. Remaining hardcoded/mock values**

- Seed workouts use `estimatedMinutes: 45`; summary exercise count is derived. Figma still shows `~45 хвилин` in Details/Active and `~45 хв` in cards. There is no current derived planned-sets/reps/duration design, so `totalPlannedSets * 4` was not implemented.
- Completed uses a fixed Workout A title, `00:00`, and `45 хв · 6 вправ · 18 підходів`, regardless of the actual template. The seed template has 19 planned sets, illustrating the existing mock-summary inconsistency.
- Active timer is `00:00`; previous-results tables repeat fixed weights/reps for every exercise.
- All Exercise Details IDs show the same lateral-raise title and fixed dates/results. The global catalog repeats eight pullover entries and is not a shared catalog model with template definitions; some seeded workout exercises are absent from that catalog already.
- Create Workout starts with a sample bench press and offers only the fixed bench-press result.
- Login navigates to Home without authentication, as scoped. Templates and active inputs have no persistence/session-history recording.

**14. Remaining design/code differences and validation**

| Area | Current difference |
| --- | --- |
| Home | Prototype `69:4084` includes footer `94:2135` (“повернутися до авторизації”) linking to Login; Mobile Home omits it and code has no footer |
| Progress | Figma `75:4182` / `75:4194` includes a back control and “Дивись, як ти стаєш сильнішим”; code only renders the title; the design content area itself is empty |
| Create Workout | Prototype Home leads to Empty `58:940`, but code starts with one sample exercise. Latest footer says “Зберегти тренування”; code says “Створити тренування”. Mobile/Exercise Added examples also include repeated cards/set-number examples; these were not converted into prescribed data |
| Units | Some design examples spell “фунти”; the required existing UI uses “ф” with internal `lb` |
| Workout cards | Figma examples use compact summary copy such as “Верх 6 вправ ~45 хв” and created-state “Верх 1 вправа ~10 хв”; current shared summary uses separators/full “хвилин” and omits duration when not supplied |
| Active/Completed/History | Mock values above remain; Active intentionally uses actual template prescriptions rather than fixed Figma example row counts |
| Edit Prototype | Move/delete outcome wiring and a Save/Done exit are not designed; user-specified mutations and existing Back/Start navigation are implemented. Mobile supplies the usable menu anchor |

These unrelated screen differences were reported without redesigning the screens or replacing working behavior. No claim of full project-wide pixel parity is made.

Validation completed:

- `npm run lint` — passed.
- `npx tsc --noEmit` — passed.
- `node --experimental-strip-types --test tests/*.test.mjs` — 8/8 passed.
- `npm run build -- --webpack` — passed after the final UI change.
- Headless Chromium at 390 × 844 — all ten requested routes rendered without horizontal overflow or page errors; screenshots inspected for normal/edit/selected-menu states.
- UI checks passed for three-dot entry, disabled unselected actions, single selection, move both directions, first/last boundaries, delete, other-template/catalog isolation, fresh normal mode on return, and edited ordering in Active.
- A workout created through the real UI retained 42.5 kg / 95 lb prescriptions after reorder, with blank actual reps; changing active weight and returning did not mutate the template. Completed navigation passed.
- Additional checks passed for menu geometry (200 × 172 at x174/y63), 24px selector slots, 24px/22px action icons, keyboard movement/Escape, deleting all exercises, and starting/returning from an empty template.

The connected Browser runtime had no available browser. UI validation used the installed headless Chromium instead. Temporary validation scripts and screenshots are in `/tmp/training-labs-edit-review/` (`check.mjs`, `edge-check.mjs`, `edit.png`, `selected-menu-final.png`, and route screenshots). No test dependencies were added to the project.
