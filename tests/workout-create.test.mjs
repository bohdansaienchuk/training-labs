import test from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { createWorkoutTemplate, updateWorkoutTemplate } from "../lib/workout-write.ts";
import { resolveWorkoutForUser } from "../lib/workout-read.ts";
import { initializeActiveSets } from "../lib/workout-template.ts";
import { workoutListItems } from "../lib/workout-list.ts";

function database() {
  let state = {
    catalog: [
      { id: 10, name: "Bench", category: "Chest" },
      { id: 11, name: "Squat", category: "Legs" },
      { id: 12, name: "Row", category: "Back" },
    ],
    workouts: [],
    exercises: [],
    sets: [],
    nextWorkoutId: 100,
    nextExerciseId: 200,
    nextSetId: 300,
  };
  let failOnSetCreate = false;

  function client(working) {
    const workoutRecord = (id) => {
      const workout = working.workouts.find((item) => item.id === id);
      if (!workout) return null;
      return { ...workout, exercises: working.exercises.filter((entry) => entry.workoutId === id).map((entry) => ({
        ...entry,
        exercise: working.catalog.find((exercise) => exercise.id === entry.exerciseId),
        sets: working.sets.filter((set) => set.workoutExerciseId === entry.id).map((set) => ({
          ...set,
          targetWeight: set.targetWeight === null ? null : new Prisma.Decimal(set.targetWeight),
        })),
      })) };
    };
    return {
      exercise: {
        findMany: async ({ where }) => working.catalog.filter((exercise) => where.id.in.includes(exercise.id)).map(({ id }) => ({ id })),
      },
      workout: {
        create: async ({ data }) => {
          const workout = { id: working.nextWorkoutId++, ...data };
          working.workouts.push(workout);
          return workout;
        },
        findUnique: async ({ where }) => workoutRecord(where.id),
        update: async ({ where, data }) => Object.assign(working.workouts.find((item) => item.id === where.id), data),
      },
      workoutExercise: {
        create: async ({ data }) => {
          const entry = { id: working.nextExerciseId++, ...data };
          working.exercises.push(entry);
          return entry;
        },
        deleteMany: async ({ where }) => {
          const removed = working.exercises.filter((entry) => entry.workoutId === where.workoutId && !where.id.notIn.includes(entry.id)).map((entry) => entry.id);
          working.exercises = working.exercises.filter((entry) => !removed.includes(entry.id));
          working.sets = working.sets.filter((set) => !removed.includes(set.workoutExerciseId));
        },
        update: async ({ where, data }) => Object.assign(working.exercises.find((entry) => entry.id === where.id), data),
      },
      workoutSet: {
        create: async ({ data }) => {
          if (failOnSetCreate) throw new Error("set insert failed");
          const set = { id: working.nextSetId++, ...data, targetWeight: data.targetWeight === null ? null : data.targetWeight.toNumber() };
          working.sets.push(set);
          return set;
        },
        deleteMany: async ({ where }) => { working.sets = working.sets.filter((set) => set.workoutExerciseId !== where.workoutExerciseId || where.id.notIn.includes(set.id)); },
        update: async ({ where, data }) => {
          const set = working.sets.find((item) => item.id === where.id);
          Object.assign(set, data);
          if ("targetWeight" in data) set.targetWeight = data.targetWeight === null ? null : data.targetWeight.toNumber();
          return set;
        },
      },
    };
  }

  return {
    snapshot: () => structuredClone(state),
    failSetCreate: () => { failOnSetCreate = true; },
    transaction: async (callback) => {
      const working = structuredClone(state);
      const result = await callback(client(working));
      state = working;
      return result;
    },
  };
}

function createDraft() {
  return { id: "draft", name: "  Training B  ", exercises: [
    { id: "row-entry", exerciseId: "12", name: "Row", position: 2, plannedSets: [
      { id: "row-set-2", position: 2, weight: 110, weightUnit: "lb", reps: 8, rir: 1 },
      { id: "row-set-1", position: 1, weight: 40, weightUnit: "kg", reps: 12, rir: 2 },
    ] },
    { id: "bench-entry", exerciseId: "10", name: "Bench", position: 1, plannedSets: [
      { id: "bench-set", position: 1, weight: 50, weightUnit: "kg", reps: 10, rir: 0 },
    ] },
  ] };
}

test("Create atomically persists the database exercise IDs, name, membership, order, sets, weight, reps, and RIR", async () => {
  const db = database();
  const saved = await db.transaction((tx) => createWorkoutTemplate(tx, createDraft(), 7));
  const persisted = db.snapshot();

  assert.deepEqual(persisted.workouts, [{ id: 100, name: "Training B", userId: 7 }]);
  assert.deepEqual(persisted.exercises.map((entry) => [entry.workoutId, entry.exerciseId, entry.position]), [[100, 10, 1], [100, 12, 2]]);
  assert.deepEqual(persisted.sets.map((set) => [set.workoutExerciseId, set.setNumber, set.targetWeight, set.targetReps, set.targetRir]), [
    [200, 1, 50, 10, 0],
    [201, 1, 40, 12, 2],
    [201, 2, 49.9, 8, 1],
  ]);
  assert.equal(saved.id, "100");
  assert.deepEqual(saved.exercises.map((exercise) => [exercise.exerciseId, exercise.position, exercise.plannedSets.length]), [["10", 1, 1], ["12", 2, 2]]);
  assert.deepEqual(workoutListItems([{ id: 100, name: saved.name, exercises: saved.exercises.map((exercise) => ({
    sets: exercise.plannedSets.map((set) => ({ targetReps: set.reps })),
  })) }]), [
    { id: "100", name: "Training B", exerciseCount: 2, setCount: 3, repCount: 30 },
  ]);
});

test("a created database-shaped workout loads in Details/Active shape and remains compatible with Edit persistence", async () => {
  const db = database();
  const created = await db.transaction((tx) => createWorkoutTemplate(tx, createDraft(), 7));
  const reloaded = await resolveWorkoutForUser(created.id, 7, (args) => db.transaction((tx) => tx.workout.findUnique(args)));
  assert.deepEqual(reloaded, created, "the regular /workouts/[id] read path must load a newly created template");
  assert.deepEqual(reloaded.exercises.flatMap((exercise) => initializeActiveSets(exercise.plannedSets).map((set) => [exercise.name, set.position, set.actualWeight, set.actualReps, set.planned.rir])), [
    ["Bench", 1, 50, null, 0],
    ["Row", 1, 40, null, 2],
    ["Row", 2, 49.9, null, 1],
  ]);
  const edited = structuredClone(reloaded);
  edited.name = "Training B edited";
  edited.exercises.reverse();
  edited.exercises.forEach((exercise, index) => { exercise.position = index + 1; });
  const saved = await db.transaction((tx) => updateWorkoutTemplate(tx, edited));
  assert.equal(saved.name, "Training B edited");
  assert.deepEqual(saved.exercises.map((exercise) => exercise.exerciseId), ["12", "10"]);
});

test("Create validation rejects empty names, empty membership, mock IDs, duplicate exercises, and malformed sets without writes", async () => {
  const invalidDrafts = [
    { ...createDraft(), name: "   " },
    { ...createDraft(), exercises: [] },
    { ...createDraft(), exercises: [{ ...createDraft().exercises[0], exerciseId: "mock-row" }] },
    { ...createDraft(), exercises: [createDraft().exercises[0], { ...createDraft().exercises[1], exerciseId: "12" }] },
    { ...createDraft(), exercises: [{ ...createDraft().exercises[0], position: 1, plannedSets: [{ ...createDraft().exercises[0].plannedSets[0], reps: 0 }] }] },
  ];
  for (const draft of invalidDrafts) {
    const db = database();
    await assert.rejects(db.transaction((tx) => createWorkoutTemplate(tx, draft, 7)));
    assert.deepEqual(db.snapshot().workouts, []);
  }
});

test("Create transaction rollback removes the workout and related records after a nested write failure", async () => {
  const db = database();
  const before = db.snapshot();
  db.failSetCreate();
  await assert.rejects(db.transaction((tx) => createWorkoutTemplate(tx, createDraft(), 7)), /set insert failed/);
  assert.deepEqual(db.snapshot(), before);
});
