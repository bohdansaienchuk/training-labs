import test from "node:test";
import assert from "node:assert/strict";
import { deleteWorkoutTemplate } from "../lib/workout-delete.ts";
import { workoutListItems } from "../lib/workout-list.ts";

function database({ withHistory = false } = {}) {
  let state = {
    catalog: [{ id: 10, name: "Bench" }, { id: 11, name: "Row" }],
    workouts: [{ id: 101, name: "Delete me" }, { id: 202, name: "Keep me" }],
    exercises: [{ id: 301, workoutId: 101, exerciseId: 10 }, { id: 302, workoutId: 202, exerciseId: 11 }],
    sets: [{ id: 401, workoutExerciseId: 301 }, { id: 402, workoutExerciseId: 302 }],
    sessions: withHistory ? [{ id: 501, workoutId: 101 }] : [],
    sessionExercises: withHistory ? [{ id: 601, workoutSessionId: 501, exerciseId: 10 }] : [],
    performedSets: withHistory ? [{ id: 701, sessionExerciseId: 601 }] : [],
  };
  return {
    snapshot: () => structuredClone(state),
    transaction: async (callback) => {
      const working = structuredClone(state);
      const result = await callback({
        workout: {
          deleteMany: async ({ where }) => {
            const workout = working.workouts.find((item) => item.id === where.id);
            const hasHistory = working.sessions.some((session) => session.workoutId === where.id);
            if (!workout || hasHistory) return { count: 0 };
            working.workouts = working.workouts.filter((item) => item.id !== where.id);
            const entryIds = working.exercises.filter((entry) => entry.workoutId === where.id).map((entry) => entry.id);
            working.exercises = working.exercises.filter((entry) => entry.workoutId !== where.id);
            working.sets = working.sets.filter((set) => !entryIds.includes(set.workoutExerciseId));
            return { count: 1 };
          },
        },
      });
      state = working;
      return result;
    },
  };
}

test("database Delete removes only the selected template and cascading template rows, never catalog or unrelated data", async () => {
  const db = database();
  assert.equal(await db.transaction((tx) => deleteWorkoutTemplate(tx, "101")), "101");
  const saved = db.snapshot();
  assert.deepEqual(saved.workouts.map((workout) => workout.id), [202]);
  assert.deepEqual(saved.exercises.map((entry) => entry.id), [302]);
  assert.deepEqual(saved.sets.map((set) => set.id), [402]);
  assert.deepEqual(saved.catalog.map((exercise) => exercise.id), [10, 11]);
  assert.deepEqual(workoutListItems(saved.workouts.map((workout) => ({ ...workout, exercises: [] }))).map((workout) => workout.id), ["202"]);
  await assert.rejects(db.transaction((tx) => deleteWorkoutTemplate(tx, "101")), /not found or has workout history/);
});

test("database Delete refuses a workout with history and preserves WorkoutSession, performed data, and the template", async () => {
  const db = database({ withHistory: true });
  const before = db.snapshot();
  await assert.rejects(db.transaction((tx) => deleteWorkoutTemplate(tx, "101")), /not found or has workout history/);
  assert.deepEqual(db.snapshot(), before);
});

test("database Delete rejects non-database IDs before issuing a write", async () => {
  const db = database();
  const before = db.snapshot();
  for (const id of ["", "draft", "1.5", "0", "2147483648"]) {
    await assert.rejects(db.transaction((tx) => deleteWorkoutTemplate(tx, id)), /Invalid workout/);
  }
  assert.deepEqual(db.snapshot(), before);
});
