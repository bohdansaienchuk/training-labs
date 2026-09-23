import test from "node:test";
import assert from "node:assert/strict";
import { deleteWorkoutTemplate, WorkoutDeleteError } from "../lib/workout-delete.ts";

function database({ sessionState = "none", sessionUserId = 7 } = {}) {
  let state = {
    catalog: [{ id: 10, name: "Bench" }, { id: 11, name: "Row" }],
    workouts: [{ id: 101, userId: 7, name: "Delete me" }, { id: 202, userId: 8, name: "Keep me" }],
    exercises: [{ id: 301, workoutId: 101, exerciseId: 10 }, { id: 302, workoutId: 202, exerciseId: 11 }],
    sets: [{ id: 401, workoutExerciseId: 301 }, { id: 402, workoutExerciseId: 302 }],
    sessions: sessionState === "none" ? [] : [{
      id: 501, workoutId: 101, workoutName: "Delete me", userId: sessionUserId,
      completedAt: sessionState === "completed" ? new Date("2026-09-22T11:00:00.000Z") : null,
    }],
    sessionExercises: sessionState === "none" ? [] : [{ id: 601, workoutSessionId: 501, exerciseId: 10 }],
    performedSets: sessionState === "none" ? [] : [{ id: 701, sessionExerciseId: 601, completed: sessionState === "completed" }],
  };

  const matchesOwnedWorkout = (item, where) => item.id === where.id && item.userId === where.userId;
  return {
    snapshot: () => structuredClone(state),
    transaction: async (callback) => {
      const working = structuredClone(state);
      const result = await callback({
        workout: {
          findFirst: async ({ where }) => working.workouts.find((item) => matchesOwnedWorkout(item, where)) ?? null,
          deleteMany: async ({ where }) => {
            const workout = working.workouts.find((item) => matchesOwnedWorkout(item, where));
            const sessionsAreOwnedAndCompleted = working.sessions
              .filter((session) => session.workoutId === where.id)
              .every((session) => session.userId === where.userId && session.completedAt !== null);
            if (!workout || !sessionsAreOwnedAndCompleted) return { count: 0 };
            working.workouts = working.workouts.filter((item) => item.id !== where.id);
            const templateExerciseIds = working.exercises.filter((entry) => entry.workoutId === where.id).map((entry) => entry.id);
            working.exercises = working.exercises.filter((entry) => entry.workoutId !== where.id);
            working.sets = working.sets.filter((set) => !templateExerciseIds.includes(set.workoutExerciseId));
            for (const session of working.sessions) if (session.workoutId === where.id) session.workoutId = null;
            return { count: 1 };
          },
        },
        workoutSession: {
          findFirst: async ({ where }) => working.sessions.find((session) => {
            if (session.workoutId !== where.workoutId) return false;
            if (typeof where.userId === "object") return session.userId !== where.userId.not;
            return session.userId === where.userId && session.completedAt === null;
          }) ?? null,
        },
      });
      state = working;
      return result;
    },
  };
}

test("Workout with no sessions deletes its template children only", async () => {
  const db = database();
  assert.equal(await db.transaction((tx) => deleteWorkoutTemplate(tx, "101", 7)), "101");
  const saved = db.snapshot();
  assert.deepEqual(saved.workouts.map((workout) => workout.id), [202]);
  assert.deepEqual(saved.exercises.map((entry) => entry.id), [302]);
  assert.deepEqual(saved.sets.map((set) => set.id), [402]);
  assert.deepEqual(saved.catalog.map((exercise) => exercise.id), [10, 11]);
});

test("Workout with completed history deletes the template and preserves the full historical graph", async () => {
  const db = database({ sessionState: "completed" });
  assert.equal(await db.transaction((tx) => deleteWorkoutTemplate(tx, "101", 7)), "101");
  const saved = db.snapshot();
  assert.equal(saved.workouts.some((workout) => workout.id === 101), false);
  assert.equal(saved.exercises.some((exercise) => exercise.workoutId === 101), false);
  assert.equal(saved.sets.some((set) => set.workoutExerciseId === 301), false);
  assert.deepEqual(saved.sessions, [{
    id: 501, workoutId: null, workoutName: "Delete me", userId: 7,
    completedAt: new Date("2026-09-22T11:00:00.000Z"),
  }]);
  assert.deepEqual(saved.sessionExercises, [{ id: 601, workoutSessionId: 501, exerciseId: 10 }]);
  assert.deepEqual(saved.performedSets, [{ id: 701, sessionExerciseId: 601, completed: true }]);
  assert.deepEqual(saved.workouts.map((workout) => workout.id), [202]);
});

test("Workout with an unfinished session returns a stable conflict and rolls back every mutation", async () => {
  const db = database({ sessionState: "active" });
  const before = db.snapshot();
  await assert.rejects(
    db.transaction((tx) => deleteWorkoutTemplate(tx, "101", 7)),
    (error) => error instanceof WorkoutDeleteError && error.code === "WORKOUT_HAS_ACTIVE_SESSION",
  );
  assert.deepEqual(db.snapshot(), before);
});

test("Workout deletion is owner-scoped and cannot delete another user's template", async () => {
  const db = database();
  const before = db.snapshot();
  await assert.rejects(
    db.transaction((tx) => deleteWorkoutTemplate(tx, "202", 7)),
    (error) => error instanceof WorkoutDeleteError && error.code === "WORKOUT_NOT_FOUND",
  );
  assert.deepEqual(db.snapshot(), before);
});

test("Workout deletion rejects a linked session owned by another user without changing either record", async () => {
  const db = database({ sessionState: "completed", sessionUserId: 8 });
  const before = db.snapshot();
  await assert.rejects(
    db.transaction((tx) => deleteWorkoutTemplate(tx, "101", 7)),
    (error) => error instanceof WorkoutDeleteError && error.code === "WORKOUT_NOT_FOUND",
  );
  assert.deepEqual(db.snapshot(), before);
});

test("invalid database IDs return not-found before issuing a write", async () => {
  const db = database();
  const before = db.snapshot();
  for (const id of ["", "draft", "1.5", "0", "2147483648"]) {
    await assert.rejects(
      db.transaction((tx) => deleteWorkoutTemplate(tx, id, 7)),
      (error) => error instanceof WorkoutDeleteError && error.code === "WORKOUT_NOT_FOUND",
    );
  }
  assert.deepEqual(db.snapshot(), before);
});
