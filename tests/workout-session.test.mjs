import test from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import {
  addPerformedSet,
  finishWorkoutSession,
  IncompleteWorkoutError,
  loadActiveWorkoutSession,
  loadCompletedWorkoutSession,
  removePerformedSet,
  savePerformedSet,
  startWorkoutSession,
} from "../lib/workout-session.ts";
import { completedDurationMinutes, elapsedTimer, validatePerformedSet } from "../lib/active-workout.ts";

function database() {
  let state = {
    workouts: [{ id: 10, userId: 7, name: "Силове тренування" }],
    catalog: [{ id: 20, name: "Bench", category: "Chest" }, { id: 21, name: "Row", category: "Back" }],
    templateExercises: [{ id: 30, workoutId: 10, exerciseId: 21, position: 2 }, { id: 31, workoutId: 10, exerciseId: 20, position: 1 }],
    templateSets: [
      { id: 40, workoutExerciseId: 30, setNumber: 2 }, { id: 41, workoutExerciseId: 30, setNumber: 1 },
      { id: 42, workoutExerciseId: 31, setNumber: 1 },
    ],
    sessions: [], sessionExercises: [], performedSets: [],
    nextSessionId: 100, nextSessionExerciseId: 200, nextPerformedSetId: 300,
  };

  const decimal = (value) => value === null ? null : new Prisma.Decimal(value);
  function tx(working) {
    const sessionExercises = (sessionId) => working.sessionExercises.filter((item) => item.workoutSessionId === sessionId).toSorted((a, b) => a.position - b.position);
    const sets = (exerciseId, completedOnly = false) => working.performedSets.filter((item) => item.sessionExerciseId === exerciseId && (!completedOnly || item.completed)).toSorted((a, b) => a.setNumber - b.setNumber)
      .map((item) => ({ ...item, weight: decimal(item.weight) }));
    const sessionShape = (session, args) => {
      if (!session) return null;
      const result = { ...session };
      if (args.include?.workout) result.workout = { name: working.workouts.find((item) => item.id === session.workoutId).name };
      if (args.include?.exercises) result.exercises = sessionExercises(session.id).map((entry) => ({
        ...entry,
        ...(args.include.exercises.include?.exercise ? { exercise: working.catalog.find((item) => item.id === entry.exerciseId) } : {}),
        ...(args.include.exercises.include?.sets ? { sets: sets(entry.id, Boolean(args.include.exercises.include.sets.where?.completed)) } : {}),
      }));
      return result;
    };
    const matchesSession = (session, where) => {
      if (typeof where.id === "number" && session.id !== where.id) return false;
      if (where.id?.not !== undefined && session.id === where.id.not) return false;
      if (where.workoutId !== undefined && session.workoutId !== where.workoutId) return false;
      if (where.userId !== undefined && session.userId !== where.userId) return false;
      if (where.completedAt === null && session.completedAt !== null) return false;
      if (where.completedAt?.not === null && session.completedAt === null) return false;
      const ids = where.exercises?.some?.exerciseId?.in;
      return !ids || sessionExercises(session.id).some((entry) => ids.includes(entry.exerciseId));
    };
    return {
      workout: {
        findFirst: async ({ where }) => {
          const workout = working.workouts.find((item) => item.id === where.id && item.userId === where.userId);
          if (!workout) return null;
          return { ...workout, exercises: working.templateExercises.filter((item) => item.workoutId === workout.id).toSorted((a, b) => a.position - b.position).map((entry) => ({
            ...entry, sets: working.templateSets.filter((set) => set.workoutExerciseId === entry.id).toSorted((a, b) => a.setNumber - b.setNumber),
          })) };
        },
      },
      workoutSession: {
        findFirst: async (args) => sessionShape(working.sessions.filter((item) => matchesSession(item, args.where)).toSorted((a, b) => b.id - a.id)[0], args),
        findMany: async (args) => working.sessions.filter((item) => matchesSession(item, args.where)).toSorted((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0) || b.id - a.id).map((session) => {
          const ids = args.include.exercises.where.exerciseId.in;
          return { ...session, exercises: sessionExercises(session.id).filter((entry) => ids.includes(entry.exerciseId)).map((entry) => ({ ...entry, sets: sets(entry.id, true) })) };
        }),
        create: async ({ data }) => {
          const session = { id: working.nextSessionId++, ...data, startedAt: new Date("2026-09-22T10:00:00.000Z"), completedAt: null };
          working.sessions.push(session); return session;
        },
        update: async ({ where, data }) => Object.assign(working.sessions.find((item) => item.id === where.id), data),
      },
      sessionExercise: {
        create: async ({ data }) => { const item = { id: working.nextSessionExerciseId++, ...data }; working.sessionExercises.push(item); return item; },
        findFirst: async ({ where, include }) => {
          const item = working.sessionExercises.find((entry) => entry.id === where.id);
          const session = item && working.sessions.find((entry) => entry.id === item.workoutSessionId);
          if (!item || !session || !matchesSession(session, where.workoutSession)) return null;
          return { ...item, sets: include.sets.orderBy.setNumber === "desc" ? sets(item.id).toReversed().slice(0, include.sets.take) : sets(item.id) };
        },
      },
      performedSet: {
        create: async ({ data }) => { const item = { id: working.nextPerformedSetId++, ...data, weight: data.weight?.toNumber?.() ?? data.weight }; working.performedSets.push(item); return { ...item, weight: decimal(item.weight) }; },
        findFirst: async ({ where }) => {
          const item = working.performedSets.find((entry) => entry.id === where.id && entry.sessionExerciseId === where.sessionExerciseId);
          const exercise = item && working.sessionExercises.find((entry) => entry.id === item.sessionExerciseId);
          const session = exercise && working.sessions.find((entry) => entry.id === exercise.workoutSessionId);
          return item && session && matchesSession(session, where.sessionExercise.workoutSession) ? { id: item.id } : null;
        },
        update: async ({ where, data }) => {
          const item = working.performedSets.find((entry) => entry.id === where.id);
          Object.assign(item, data, { weight: data.weight?.toNumber?.() ?? data.weight });
          return { ...item, weight: decimal(item.weight) };
        },
        delete: async ({ where }) => { const index = working.performedSets.findIndex((entry) => entry.id === where.id); return working.performedSets.splice(index, 1)[0]; },
      },
    };
  }
  return {
    snapshot: () => structuredClone(state),
    transaction: async (callback) => {
      const working = structuredClone(state);
      const result = await callback(tx(working));
      state = working;
      return result;
    },
  };
}

const valid = (set, overrides = {}) => ({ id: set.id, sessionExerciseId: set.sessionExerciseId, weight: 100, weightUnit: "kg", reps: 8, rir: "2", ...overrides });

test("Start creates one owned session snapshot in template order with empty performed values and is duplicate-safe", async () => {
  const db = database();
  const id = await db.transaction((tx) => startWorkoutSession(tx, "10", 7));
  const duplicate = await db.transaction((tx) => startWorkoutSession(tx, "10", 7));
  const state = db.snapshot();
  assert.equal(id, duplicate);
  assert.deepEqual(state.sessions.map(({ id, workoutId, userId }) => ({ id, workoutId, userId })), [{ id: 100, workoutId: 10, userId: 7 }]);
  assert.deepEqual(state.sessionExercises.map((item) => [item.exerciseId, item.position]), [[20, 1], [21, 2]]);
  assert.deepEqual(state.performedSets.map((set) => [set.sessionExerciseId, set.setNumber, set.weight, set.reps, set.rir, set.completed]), [
    [200, 1, null, null, null, false], [201, 1, null, null, null, false], [201, 2, null, null, null, false],
  ]);
});

test("Active load validates identity and restores ordered persisted kg/reps/RIR/completed values", async () => {
  const db = database();
  const id = await db.transaction((tx) => startWorkoutSession(tx, "10", 7));
  let loaded = await db.transaction((tx) => loadActiveWorkoutSession(tx, "10", id, 7));
  const first = loaded.exercises[0].sets[0];
  await db.transaction((tx) => savePerformedSet(tx, "10", id, 7, valid(first, { weight: 220.46226218, weightUnit: "lb", reps: 9, rir: "1" })));
  loaded = await db.transaction((tx) => loadActiveWorkoutSession(tx, "10", id, 7));
  assert.deepEqual(loaded.exercises.map((exercise) => [exercise.name, exercise.position, exercise.sets.map((set) => set.setNumber)]), [["Bench", 1, [1]], ["Row", 2, [1, 2]]]);
  assert.deepEqual(loaded.exercises[0].sets[0], { ...first, weight: 100, weightUnit: "kg", reps: 9, rir: "1", completed: true });
  assert.equal(await db.transaction((tx) => loadActiveWorkoutSession(tx, "11", id, 7)), null);
  assert.equal(await db.transaction((tx) => loadActiveWorkoutSession(tx, "10", id, 8)), null);
});

test("Add is retry-idempotent, Remove persists with the minimum rule, and template sets never change", async () => {
  const db = database();
  const id = await db.transaction((tx) => startWorkoutSession(tx, "10", 7));
  const beforeTemplate = db.snapshot().templateSets;
  const loaded = await db.transaction((tx) => loadActiveWorkoutSession(tx, "10", id, 7));
  const exercise = loaded.exercises[0];
  const added = await db.transaction((tx) => addPerformedSet(tx, "10", id, exercise.id, exercise.sets.at(-1).id, 7));
  const duplicate = await db.transaction((tx) => addPerformedSet(tx, "10", id, exercise.id, exercise.sets.at(-1).id, 7));
  assert.deepEqual(duplicate, added);
  assert.equal((await db.transaction((tx) => loadActiveWorkoutSession(tx, "10", id, 7))).exercises[0].sets.length, 2);
  assert.equal(await db.transaction((tx) => removePerformedSet(tx, "10", id, exercise.id, added.id, 7)), true);
  assert.equal(await db.transaction((tx) => removePerformedSet(tx, "10", id, exercise.id, exercise.sets[0].id, 7)), false);
  assert.equal((await db.transaction((tx) => loadActiveWorkoutSession(tx, "10", id, 7))).exercises[0].sets.length, 1);
  assert.deepEqual(db.snapshot().templateSets, beforeTemplate);
});

test("Finish rejects empty/partial rows atomically, then completes valid sets once and powers real Completed data", async () => {
  const db = database();
  const id = await db.transaction((tx) => startWorkoutSession(tx, "10", 7));
  let active = await db.transaction((tx) => loadActiveWorkoutSession(tx, "10", id, 7));
  const inputs = active.exercises.flatMap((exercise) => exercise.sets.map((set) => valid(set)));
  await assert.rejects(db.transaction((tx) => finishWorkoutSession(tx, "10", id, 7, inputs.map((set, index) => index ? set : { ...set, rir: "" }))), IncompleteWorkoutError);
  assert.equal(db.snapshot().sessions[0].completedAt, null);
  assert.equal(db.snapshot().performedSets.every((set) => !set.completed), true);
  const completedAt = new Date("2026-09-22T10:45:59.000Z");
  assert.equal(await db.transaction((tx) => finishWorkoutSession(tx, "10", id, 7, inputs, completedAt)), id);
  assert.equal(await db.transaction((tx) => finishWorkoutSession(tx, "10", id, 7, inputs, completedAt)), id);
  assert.equal(db.snapshot().performedSets.every((set) => set.completed), true);
  const completed = await db.transaction((tx) => loadCompletedWorkoutSession(tx, "10", id, 7));
  assert.deepEqual({ name: completed.workoutName, exercises: completed.exerciseCount, sets: completed.setCount }, { name: "Силове тренування", exercises: 2, sets: 3 });
  assert.equal(completedDurationMinutes(completed.startedAt, completed.completedAt), 45);
  assert.equal(elapsedTimer(completed.startedAt, new Date(completed.completedAt).getTime()), "45:59");
  assert.equal(await db.transaction((tx) => loadActiveWorkoutSession(tx, "10", id, 7)), null);
  assert.equal(await db.transaction((tx) => loadCompletedWorkoutSession(tx, "11", id, 7)), null);
});

test("Previous results use the latest completed session, exclude current, and show no mock history", async () => {
  const db = database();
  const firstId = await db.transaction((tx) => startWorkoutSession(tx, "10", 7));
  const first = await db.transaction((tx) => loadActiveWorkoutSession(tx, "10", firstId, 7));
  await db.transaction((tx) => finishWorkoutSession(tx, "10", firstId, 7, first.exercises.flatMap((exercise) => exercise.sets.map((set) => valid(set, { weight: 70 }))), new Date("2026-09-22T10:30:00.000Z")));
  const currentId = await db.transaction((tx) => startWorkoutSession(tx, "10", 7));
  const current = await db.transaction((tx) => loadActiveWorkoutSession(tx, "10", currentId, 7));
  assert.deepEqual(current.exercises.map((exercise) => exercise.previousSets.map((set) => set.weight)), [[70], [70, 70]]);
  assert.equal(current.exercises.every((exercise) => exercise.sets.every((set) => set.weight === null)), true);
});

test("Performed-row validation drives automatic completion and rejects unsafe numeric values", () => {
  const base = { id: "1", sessionExerciseId: "2", weight: 0, weightUnit: "kg", reps: 0, rir: "0" };
  assert.deepEqual(validatePerformedSet(base), { weight: true, reps: true, rir: true, valid: true });
  for (const input of [
    { ...base, weight: null }, { ...base, weight: -1 }, { ...base, weight: 10_000 },
    { ...base, reps: 1.5 }, { ...base, reps: -1 }, { ...base, rir: "" }, { ...base, rir: "-1" },
  ]) assert.equal(validatePerformedSet(input).valid, false);
});
