# Database-consistent workout reads

## Flow and boundaries

Before this change, `/workouts` linked the PostgreSQL integer ID (converted to a URL string) into routes that searched mock IDs `1..3`. A database workout could therefore open an unrelated mock workout or a missing-template screen.

Now:

1. `/workouts` continues its existing PostgreSQL summary query and exact ID links.
2. `/workouts/[id]/page.tsx` awaits the route ID and calls server-only `getWorkout`.
3. `/workouts/[id]/active/page.tsx` uses the same loader, including on direct navigation/reload.
4. `getWorkout` uses the existing `lib/prisma.ts` client. Its read resolver validates positive PostgreSQL Int IDs, calls `workout.findUnique`, includes exercise definitions, orders entries by `position` and sets by `setNumber`, and calls Next.js `notFound()` for invalid/absent IDs. Database failures propagate; they never return sample data.
5. Only the explicitly serialized UI template crosses into the Details and Active client components. No Prisma runtime imports occur in either client component.

Both routes independently check database existence before rendering, even if a temporary draft is available. Neither creates or updates database records. Access remains consistent with the existing unscoped My Workouts query; authentication/user scoping was not introduced in this task.

## Serialization

| Database field | Client field |
| --- | --- |
| Workout.id/name | Workout.id (same ID as a string)/name |
| WorkoutExercise.id | WorkoutExercise.id (string; stable entry identity) |
| exerciseId and Exercise.name/category | exerciseId (string), name, category |
| WorkoutExercise.position | position |
| WorkoutSet.id/setNumber | PlannedSet.id (string)/position |
| targetWeight | weight: plain number or null via Decimal.toNumber() |
| targetReps/targetRir | reps/rir, preserving null and zero |

No dates, credentials, Prisma instances or Decimal objects are sent to clients. Sorting also occurs on serialization without mutating the query result. Stored weights are interpreted as kilograms under the current unitless DB convention; no unit schema/conversion changes were made. Legacy temporary mixed-unit values still work.

Active retains the entire copied planned set, including reps and RIR. Actual weight prefills from planned weight, while actual reps/reserve remain blank as before. Planned RIR is not falsely recorded as a performed RIR.

## Smallest temporary-edit bridge

`app/workouts/[id]/layout.tsx` mounts a new `WorkoutDraftProvider`, keyed by route ID, shared by Details and Active. It begins empty, contains no seed/catalog/mock data, and accepts only the server-supplied workout through its hook. Draft lookup additionally requires the same workout ID.

Before edits, each screen uses its server template. Details reorder/delete updates an immutable client draft. Navigating with the existing Start link preserves this provider, so Active uses that exact edited template rather than replacing it with its newly fetched server props. A different ID cannot inherit the draft. A hard reload or new provider instance discards edits and uses PostgreSQL again. Client navigation caching can retain the scoped draft; this is not database persistence.

The Action List component, styling, portal, independent selection/menu state, dismissal and action behavior are unchanged. Active inputs remain local to their cards; unmounting an Active card can discard performed input values. There is no session persistence or resumable workout storage.

## Files changed

- Details and Active `page.tsx`: server read boundaries.
- New `workout-details-client.tsx` and `active/active-workout-client.tsx`: existing UI extracted with a new data hook.
- New `[id]/layout.tsx` and `components/workout-draft-provider.tsx`: ID-scoped temporary edits.
- New `lib/get-workout.ts` and `lib/workout-read.ts`: Prisma boundary, exact ID resolution, ordering, serialization and 404 behavior.
- `lib/workout-template.ts`: optional category and planned RIR; removed legacy sample definitions from shared utilities.
- New `lib/mock-workouts.ts`: moved legacy sample definitions unchanged.
- `components/workout-template-provider.tsx`, `app/workouts/new/page.tsx`, `tests/workout-template.test.mjs`: legacy import paths updated.
- `tests/workout-details-interaction.test.mjs`: existing interaction tests run against the new client/draft boundary, plus database-origin display, reload and ID-isolation tests.
- New `tests/workout-read.test.mjs`: query contract, actual Next 404 exception, error propagation, Decimal/null ordering/serialization and planned RIR tests.

## Remaining legacy state

`WorkoutTemplateProvider` remains mounted in the root layout and is still consumed by Create Workout. Create uses the legacy catalog and memory-only save. Its newly created UUID templates are still absent from the database-backed list and cannot resolve as database Details IDs. Completing Create persistence is explicitly deferred.

Active's previous-results table and timer, Completed's title/summary, and Exercise Details/history remain mock displays. No mock workout lookup remains in Details or Active. Shared planned-set/ordering utilities remain in use; their module no longer defines seed workouts.

## Validation

- `npm test`: 28/28 pass (all previous Action List scenarios retained).
- Lint: passes.
- TypeScript: passes after the production build refreshed generated route types for the new layout.
- `npm run build -- --webpack`: passes; Details and Active are dynamic routes.
- `git diff --check`: passes; pre-existing working tree changes retained.
- Read-only live Prisma query: unavailable (`P1001`); no real database records or credentials printed. Tests use controlled query responses and real Prisma Decimal instances; they are not evidence of live tunnel connectivity.
- Browser runtime: no connected browsers. DOM tests retain simulated 390 × 844 checks; a real My Workouts → Details → edit → Active visual/navigation check remains unverified.

No changes to `.env`, database configuration, schema, migrations, seed, Figma or visual assets. No database writes, Create persistence or session persistence were added.

## Next persistence task

Persist Details reorder/delete transactions, with explicit user ownership and collision-safe handling of the unique `(workoutId, position)` constraint. Verify that surviving planned sets remain unchanged and the saved order survives reload. Keep Create and performed-session persistence as separate tasks.
