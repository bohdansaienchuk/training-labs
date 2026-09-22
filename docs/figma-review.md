# Training Labs — re-audit, 15 September 2026

## Outcome

Re-read the working tree, Prisma schema/config/seed/migrations, route and component dependencies, package manifest/lock, existing tests, and the current Figma Mobile and Prototype pages before implementing fixes. The project is midway through a database migration: list screens read PostgreSQL, while workout creation, details, editing and Active still use in-memory templates. It is **not yet an end-to-end database-backed workout flow**.

This audit fixed the concrete list data-contract errors and persistent Action List interaction. No database records, schema, migrations, seed, credentials, or Figma design were changed. Existing uncommitted work was preserved. No commit was made.

Sources:

- [Training Labs Figma](https://www.figma.com/design/QLuSadeuB64GfhduYowfqR/Training-Labs?node-id=0-1), read through the connected Figma MCP.
- [Fresh machine-readable snapshot](figma-reaudit-2026-09-15.json): current frames, child geometry, unique text and navigation reactions.
- [September 14 review](figma-review-2026-09-14.md) and [historical inventory](figma-review-inventory.json): preserved as the previous baseline, not current status.

## 1. Baseline and changes since the previous review

HEAD remains `49db1ee` (14 September, “Fix app navigation flows”). There is no commit corresponding to the previous review. Consequently, the working diff against HEAD includes both that earlier work and subsequent work; it cannot establish the exact authorship/time of every edit.

At entry: 14 tracked files modified, plus untracked `lib/`, `prisma/`, `docs/`, `tests/`, client route components, template/menu/search/unit components, exported icons and generated agent skill directories. `git diff --check` passed. Nothing was staged or committed by this audit.

Compared with the saved September 14 report, observable subsequent work includes:

- Prisma/PostgreSQL integration and two initial migrations, first for templates and then for session/history tables.
- Database reads in Exercises and My Workouts; separate client search components.
- Controlled search fields and actual filtering in Exercises, My Workouts and Create Workout. Create filters the legacy catalog, excludes already-added IDs, retains the query and supports no-results states.
- The template provider, ordering helpers, unit handling and editing UI described by the earlier review are still present and needed.

The previous report's claims that search is static and no database exists are superseded.

## 2. Database and data model

Manifest and lock resolve Prisma CLI, client and PG adapter to **7.10.0**, `pg` to **8.23.0**, Next.js to **16.3.5**, React/React DOM to **19.2.8**. Version ranges use `^`; the lock currently keeps the Prisma packages aligned.

`prisma.config.ts` loads environment values, points to the schema/migrations, configures a separate shadow URL and invokes `tsx prisma/seed.ts`. The schema correctly keeps datasource URLs outside `schema.prisma`. `lib/prisma.ts` uses `PrismaPg` and a development singleton; this audit added the Next.js `server-only` guard.

| Model | Current responsibility |
| --- | --- |
| User | Owns templates and sessions; unique email |
| Exercise | Shared exercise definition and optional category |
| Workout | Named template belonging to a user |
| WorkoutExercise | Ordered template entry referencing a catalog exercise |
| WorkoutSet | Planned weight/reps/RIR per numbered set |
| WorkoutSession | One performed workout, start/completion timestamps, user/template references |
| SessionExercise | Independently ordered session exercise referencing the catalog |
| PerformedSet | Actual weight/reps/RIR and completion flag |

Both migrations agree with these eight models. Order/set-number uniqueness is scoped to the parent. Session exercises and performed sets do not reference template entries/sets, which permits template editing without rewriting recorded sets.

The seed ensures a test user, finds or creates 12 named exercises, and creates Workout A with three exercise entries and 3/3/2 sets if absent. Existing rows are not refreshed. Its name-based find/create sequence is adequate for a serial development seed but is not concurrency-safe uniqueness. The seed was inspected, not executed again.

### Concrete concerns before extending persistence

1. **History deletion:** `WorkoutSession.workout` has `onDelete: Cascade`. Deleting an entire template deletes its sessions and performed sets. If history must survive template deletion, decide retention behavior before introducing workout deletion. No structural change made.
2. **Units:** UI planned/active sets carry `kg | lb`; database weight columns carry no unit. Choose canonical storage/conversion or explicit units before saving mixed-unit inputs. Never silently interpret pounds as kilograms.
3. **RIR:** DB has integer `targetRir`/`rir`; legacy planned sets omit target RIR and Active accepts arbitrary reserve text, including the Figma example `max`. Define the mapping/validation before persistence.
4. **Ownership:** My Workouts queries all workouts with no user scope. Login is navigation only. A session's `userId` is not constrained to equal the referenced workout owner's ID. Future reads/writes need an explicit user policy; do not infer one from the seed email.
5. **Ordering writes:** unique `(workoutId, position)` prevents naive sequential swaps. A future DB reorder needs a transaction and collision-safe intermediate positions. Current immutable in-memory swaps are correct and tested.
6. **Historical names:** session rows retain exercise IDs and a template reference, not name snapshots. Renames can change how past sessions are displayed. Decide whether that is intended.
7. **Fresh setup:** package scripts sync Prisma skills after install but do not explicitly generate the Prisma client. Document/run `prisma generate` in a clean setup/build workflow. Current validation used the installed generated client.

The stated PostgreSQL 14 setup, application role, already-applied migrations and successful seed remain user-provided facts. `prisma validate` passed. `prisma migrate status` failed with a schema-engine error; a later build reported `P1001` at the local SSH tunnel endpoint. Remote DB version, contents, migration checksums and seed state could not be independently verified. No secret values were printed or modified.

## 3. Remaining data migration gaps

| Screen/dependency | Current implementation and consequence |
| --- | --- |
| Exercises | Server reads id/name/category; client filters names with trimmed, case-insensitive search. This audit maps integer IDs to link strings and category to the existing `muscleGroups` display prop. |
| My Workouts | Server reads DB templates. This audit narrows the query and sends only plain id/name/exerciseCount/setCount values, eliminating nested Decimal props and numeric link-ID errors. |
| Workout Details / Active | Read `WorkoutTemplateProvider`, seeded by `MOCK_WORKOUTS`. A DB ID of `1` can open unrelated mock template `1`; a DB ID outside `1..3` can show Missing Workout. **Highest-priority remaining integration defect.** |
| Create Workout | Uses `EXERCISE_CATALOG`, `createWorkoutDraft`, and provider `addWorkout`. Saving creates a UUID template only in memory; the database-backed list does not show it. |
| Exercise Details | Ignores route ID and always shows lateral raises plus three static history cards. |
| Active / Completed | Active inputs remain local, separate from planned data. Completion only navigates; no session/performed-set writes. Timer, previous results and completion summary are fixed examples. |

Keep the provider/catalog until all dependent screens are migrated together. Removing them now would break Create, Details and Active. `lib/workout-template.ts` remains a UI model with string IDs, units and optional focus/duration, distinct from Prisma's integer-ID relational model; `lib/exercise-catalog.ts` is still a legacy mock catalog. `WorkoutListItem` is now a small display contract, not a duplicate database graph.

Database list queries now call `connection()` before querying: the installed Next.js docs specify this for request-time rendering. This prevents build-time database snapshots and lets webpack build without the live tunnel. It does **not** make runtime database failures disappear or complete authentication/persistence.

## 4. Fresh Figma comparison

The current file exposes **12 Mobile frames** (`1:4`) and **16 Prototype frames** (`1:5`). Their top-level IDs and immediate child geometry match the saved inventory. No additional top-level frame IDs were found. This does not establish that nested components or interactions were unchanged historically. The fresh snapshot, rather than the old report, was used for this audit.

| Area | Current Figma nodes | Remaining mismatch |
| --- | --- | --- |
| My Workouts | `31:378`, `69:4136`, created `59:1412` | Figma uses focus/duration examples; DB list uses actual exercise/set counts and lacks focus/duration. Created flow is broken by the provider/DB split. |
| Workout Details | `31:418`, `59:1501` | Visual structure retained; data still comes from mock/provider. |
| Editing/selection | `136:2297`, `135:2211`, `136:2354` | Selectable rows and local actions implemented; prototype cannot currently demonstrate all selection/action paths. |
| Action List | `135:2247` | Existing 200 × 172, 10px padding/gaps, 180 × 44 actions match fresh design context. Persistence while selecting fixed in code. |
| Move/delete | Action labels in `135:2247` | No click reactions on action entries and no outcome frames found. Code implements explicit user requirements. |
| Active | `31:459`, `59:1537` | Ordering/planned input prefills work locally; timer/history/session persistence missing. |
| Create | `39:1208`, `58:940`, `58:744`, `58:1138` | Home prototype enters Empty; app starts with one sample exercise. Footer says “Зберегти тренування” in Figma, “Створити тренування” in app. App also has extra nested horizontal padding. |
| Exercises | `59:3224`, `69:3778` | DB names/categories differ from illustrative catalog entries; repeated Figma data is not a requirement to duplicate DB records. Search works; category display fixed. |
| Exercise Details | `59:3354`, `69:3889` | Static title/category/history unrelated to selected DB exercise. |
| Home / Progress | `69:4084`, `75:4182`, `75:4194` | Home lacks Prototype's login-return footer; Progress lacks designed back link and subtitle. |
| Completed | `59:3100`, `59:1990` | Fixed title/time/counts rather than performed-workout summary. |

Fresh design context and screenshots were inspected for Action List and selected Workout Details; page inventory/text/reactions were inspected for all listed screens. No claim of complete rendered pixel parity is made. Existing 390 × 844 design, tokens and exported assets were retained.

## 5. Action List: application behavior

Three-dot toggles the menu and enables selectable exercise rows. Menu is absolutely positioned with `z-20` above the list, with no blocking backdrop. Selecting a row changes only `selectedId`. The outside-pointer handler exempts actual exercise-selection buttons within this list, including their icons/text; clicking list gaps or other outside content dismisses it. The same menu DOM element stays mounted throughout selection changes.

Selection after dismissal does not reopen the menu. Reopen it with three-dot. Unselected actions are disabled; first-up and last-down are disabled. Move actions retain selection, stable IDs and planned sets; delete clears selection. Actions continue to close the menu, as in the existing implementation; the user's persistence requirement applies to selection, not action completion. Escape dismissal and Back/Start remain available.

## 6. Figma prototype: observed limitations and manual changes

Observed wiring:

- `59:1509`: Navigate to `135:2211`, then Open overlay `135:2247` with relative position `(-176, -957)`.
- `136:2274`: Navigate to selected frame `136:2354`, then Open overlay at approximately `(819, -112)`.
- `135:2247`: manual position, no background, `CLOSE_ON_CLICK_OUTSIDE`.
- Selected frame `136:2354` has Back/Start links but no selection switching or three-dot click reaction. Menu action entries have no click reactions.

Figma's [overlay documentation](https://help.figma.com/hc/en-us/articles/360039818254-Create-Overlays-in-your-Prototypes) defines outside dismissal by overlay dimensions. Exercise rows outside a 200 × 172 overlay therefore conflict with this setting. Turning off dismissal alone does not establish the required selective outside-click behavior. Current navigation-plus-reopen wiring also changes screens instead of preserving one menu interaction.

**Recommended manual representation: a whole-screen interactive component with the menu inside it.** Figma supports [Change to between component variants](https://help.figma.com/hc/en-us/articles/360061175334). This is a finite simulation of the app's state, not arbitrary database mutation.

1. Preserve the current reference frames. Create a prototype component from the existing 390 × 844 Details layout, reusing its exact layers and Action List instance.
2. Add variants for normal, editing/menu-closed, menu-open/unselected, and menu-open/each-selected-exercise. Add matching closed variants where selected state should persist.
3. Position Action List absolutely at screen `(174, 63)`, size `200 × 172`, above the exercise content. Keep it out of auto-layout flow. Do not use a small native overlay for this approach.
4. Three-dot: normal/closed → matching open variant; open → matching closed variant. Replace the two old Navigate + Open overlay chains. Use Instant transitions initially.
5. Every exercise row/circle in an open variant: Change to that exercise's selected/open variant. All such variants retain the menu at identical coordinates. Selecting rows in a closed edit variant changes selection only.
6. Add transparent outside-click hotspots covering blank areas, excluding row hit targets, menu and three-dot. Route them to matching closed variants. Keep the hotspots below clickable rows/menu; preserve Back/Start navigation. Verify blank list gaps also dismiss.
7. For each selected demonstration, add move-up/down outcome variants with that exercise swapped one position and still selected. Add delete outcomes with the entry removed, positions normalized and selection cleared. Match the app's post-action closed state. Give boundary/unselected actions no reaction and a disabled visual treatment.
8. Test in Present mode: open → select row 1 → select row 2 without losing the visible menu → move/delete; separately test first/last boundaries, outside dismissal and second three-dot click. Keep frame/component names and positions consistent for any later Smart Animate use.

The connected integration reads reactions and a read-only probe reports `setReactionsAsync` as a function. The official [Plugin API](https://developers.figma.com/docs/plugins/api/properties/nodes-reactions/) supports reaction edits, but the integration's linked detailed API reference returned “not found”; no prototype writes were attempted or verified. **This is not a claim that Figma editing is unsupported.** The recommended representation requires new coordinated variants, so this audit supplies the exact manual plan and leaves the design unchanged.

## 7. Changes made by this audit

- `app/exercises/exercises-client.tsx`: explicit ID/category adapter.
- `app/exercises/page.tsx`: minimal selected fields and request-time query.
- `app/workouts/page.tsx`: summary-only query and plain client props; request-time query.
- `app/workouts/workouts-client.tsx`: summary display type, removing unused relational/Decimal fields.
- `app/workouts/[id]/page.tsx`: exercise-list ref; selection no longer opens/reopens menu.
- `components/workout-exercise-menu.tsx`: scoped selection exception in outside-pointer handling.
- `components/exercise-item.tsx`: selection marker; removed inaccurate row `aria-haspopup`.
- `lib/prisma.ts`: server-only import guard.
- This report, historical report copy and fresh Figma snapshot.

## 8. Verification

| Check | Result |
| --- | --- |
| Baseline lint | Passed |
| Baseline TypeScript | Failed: numeric IDs passed to string link props in both new client lists |
| Baseline domain tests | 8/8 passed |
| Default `npm run build` | Turbopack port-binding failure (`Operation not permitted`) in this environment |
| Baseline webpack build | Compiled; failed TypeScript |
| Intermediate webpack build | TypeScript fixed; failed DB prerender (`P1001`) |
| Final `npm run build -- --webpack` | Passed, including TypeScript and page generation; both DB lists dynamic |
| Final lint / domain tests | Passed / 8 of 8 passed |
| `prisma validate` | Passed |
| `prisma migrate status` | Failed; remote applied status unverified |
| DOM integration checks | Passed against actual React components: persistent menu identity through pointer-down/click, icon/row selection, single selection, first/last boundaries, move both directions, delete, outside click, toggle, Escape, closed-state selection, edited ordering in Active; database exercise category/ID mapping; case/space filtering, no-results and workout summary/link |
| Browser visual QA | Unavailable: browser runtime returned no available browsers |
| Git whitespace check | Passed |

DOM checks used temporary jsdom tooling and `/tmp/training-labs-reaudit-check/check.tsx`; no project dependencies or lockfile entries were added. DOM tests do not verify hit-testing, scrolling or rendered pixel geometry. A real 390 × 844 browser check and live database read/write validation remain necessary when those services are reachable.
