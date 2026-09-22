import test from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { updateWorkoutTemplate } from "../lib/workout-write.ts";
import { workoutListItems } from "../lib/workout-list.ts";

function database() {
  let state = {
    workout: { id: 2048, name: "Training A", userId: 1 },
    catalog: [{ id: 10, name: "Bench", category: "Chest" }, { id: 11, name: "Squat", category: "Legs" }, { id: 12, name: "Row", category: "Back" }],
    exercises: [{ id: 101, workoutId: 2048, exerciseId: 10, position: 1 }, { id: 102, workoutId: 2048, exerciseId: 11, position: 2 }],
    sets: [{ id: 201, workoutExerciseId: 101, setNumber: 1, targetWeight: 40, targetReps: 8, targetRir: 2 }, { id: 202, workoutExerciseId: 101, setNumber: 2, targetWeight: 45, targetReps: 6, targetRir: 1 }, { id: 203, workoutExerciseId: 102, setNumber: 1, targetWeight: 80, targetReps: 5, targetRir: 3 }],
  };
  let failOnSetCreate = false;
  function client(working) {
    const workoutRecord = () => ({ ...working.workout, exercises: working.exercises.map((entry) => ({
      ...entry, exercise: working.catalog.find((exercise) => exercise.id === entry.exerciseId),
      sets: working.sets.filter((set) => set.workoutExerciseId === entry.id).map((set) => ({ ...set, targetWeight: set.targetWeight === null ? null : new Prisma.Decimal(set.targetWeight) })),
    })) });
    return {
      workout: {
        findUnique: async ({ where }) => where.id === working.workout.id ? workoutRecord() : null,
        update: async ({ data }) => Object.assign(working.workout, data),
      },
      exercise: { findMany: async ({ where }) => working.catalog.filter((exercise) => where.id.in.includes(exercise.id)).map(({ id }) => ({ id })) },
      workoutExercise: {
        deleteMany: async ({ where }) => {
          const removed = working.exercises.filter((entry) => entry.workoutId === where.workoutId && !where.id.notIn.includes(entry.id)).map((entry) => entry.id);
          working.exercises = working.exercises.filter((entry) => !removed.includes(entry.id));
          working.sets = working.sets.filter((set) => !removed.includes(set.workoutExerciseId));
        },
        update: async ({ where, data }) => {
          const entry = working.exercises.find((item) => item.id === where.id);
          assert.ok(entry);
          assert.ok(!working.exercises.some((item) => item !== entry && item.workoutId === entry.workoutId && item.position === data.position), "unique workout position");
          return Object.assign(entry, data);
        },
        create: async ({ data }) => {
          assert.ok(!working.exercises.some((item) => item.workoutId === data.workoutId && item.position === data.position));
          const entry = { id: Math.max(100, ...working.exercises.map((item) => item.id)) + 1, ...data };
          working.exercises.push(entry);
          return entry;
        },
      },
      workoutSet: {
        deleteMany: async ({ where }) => { working.sets = working.sets.filter((set) => set.workoutExerciseId !== where.workoutExerciseId || where.id.notIn.includes(set.id)); },
        update: async ({ where, data }) => {
          const set = working.sets.find((item) => item.id === where.id);
          assert.ok(set);
          assert.ok(!working.sets.some((item) => item !== set && item.workoutExerciseId === set.workoutExerciseId && item.setNumber === data.setNumber), "unique set number");
          Object.assign(set, data);
          if ("targetWeight" in data) set.targetWeight = data.targetWeight === null ? null : data.targetWeight.toNumber();
          return set;
        },
        create: async ({ data }) => {
          if (failOnSetCreate) throw new Error("set insert failed");
          const set = { id: Math.max(200, ...working.sets.map((item) => item.id)) + 1, ...data, targetWeight: data.targetWeight === null ? null : data.targetWeight.toNumber() };
          working.sets.push(set);
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

function draft() {
  return { id: "2048", name: "Training A", exercises: [
    { id: "101", exerciseId: "10", name: "Bench", position: 1, plannedSets: [
      { id: "201", position: 1, weight: 40, weightUnit: "kg", reps: 8, rir: 2 },
      { id: "202", position: 2, weight: 45, weightUnit: "kg", reps: 6, rir: 1 },
    ] },
    { id: "102", exerciseId: "11", name: "Squat", position: 2, plannedSets: [
      { id: "203", position: 1, weight: 80, weightUnit: "kg", reps: 5, rir: 3 },
    ] },
  ] };
}

test("Save commits edited template data to database state, not only the returned client draft", async () => {
  const db = database();
  const edited = draft();
  edited.name = "Training B";
  edited.exercises[0].position = 2;
  edited.exercises[1].position = 1;
  edited.exercises[0].plannedSets = [
    { ...edited.exercises[0].plannedSets[0], weight: 52.5, reps: 10, rir: 0 },
    { id: "new-set", position: 2, weight: 60, weightUnit: "kg", reps: 7, rir: 2 },
  ];
  edited.exercises.push({ id: "new-entry", exerciseId: "12", name: "Row", position: 3, plannedSets: [
    { id: "row-set", position: 1, weight: 35, weightUnit: "kg", reps: 12, rir: 1 },
  ] });
  const saved = await db.transaction((tx) => updateWorkoutTemplate(tx, edited));
  assert.equal(saved.name, "Training B");
  assert.deepEqual(saved.exercises.map((entry) => [entry.exerciseId, entry.position]), [["11", 1], ["10", 2], ["12", 3]]);
  assert.deepEqual(saved.exercises[1].plannedSets.map((set) => [set.id, set.weight, set.reps, set.rir]), [["201", 52.5, 10, 0], ["204", 60, 7, 2]]);
  const persisted = db.snapshot();
  assert.equal(persisted.workout.name, "Training B");
  assert.deepEqual(persisted.exercises.map((entry) => [entry.exerciseId, entry.position]), [[10, 2], [11, 1], [12, 3]]);
  assert.deepEqual(persisted.sets.map((set) => [set.id, set.workoutExerciseId, set.setNumber, set.targetWeight, set.targetReps, set.targetRir]), [
    [201, 101, 1, 52.5, 10, 0],
    [203, 102, 1, 80, 5, 3],
    [204, 101, 2, 60, 7, 2],
    [205, 103, 1, 35, 12, 1],
  ]);
  const list = workoutListItems([{ id: 2048, name: saved.name, exercises: saved.exercises.map((entry) => ({ _count: { sets: entry.plannedSets.length } })) }]);
  assert.deepEqual(list, [{ id: "2048", name: "Training B", exerciseCount: 3, setCount: 4 }]);
  const reopened = await db.transaction((tx) => tx.workout.findUnique({ where: { id: 2048 } }));
  assert.equal(reopened.name, saved.name);
  assert.deepEqual(reopened.exercises.map((entry) => entry.position).sort(), [1, 2, 3]);
});

test("save deletes removed exercises and sets, and fresh list data reflects the result", async () => {
  const db = database();
  const edited = draft();
  edited.exercises = [edited.exercises[0]];
  edited.exercises[0].plannedSets = [edited.exercises[0].plannedSets[0]];
  const saved = await db.transaction((tx) => updateWorkoutTemplate(tx, edited));
  assert.deepEqual(saved.exercises.map((entry) => entry.id), ["101"]);
  assert.deepEqual(db.snapshot().sets.map((set) => set.id), [201]);
  assert.equal(workoutListItems([{ id: 2048, name: saved.name, exercises: [{ _count: { sets: 1 } }] }])[0].exerciseCount, 1);
});

test("transaction rollback leaves the saved template unchanged on a related-record failure", async () => {
  const db = database();
  const before = db.snapshot();
  const edited = draft();
  edited.exercises[0].plannedSets.push({ id: "new-set", position: 3, weight: 50, weightUnit: "kg", reps: 5, rir: 1 });
  db.failSetCreate();
  await assert.rejects(db.transaction((tx) => updateWorkoutTemplate(tx, edited)), /set insert failed/);
  assert.deepEqual(db.snapshot(), before);
});

test("save rejects a foreign workout exercise, set, or unknown catalog exercise", async () => {
  for (const change of [
    (workout) => { workout.exercises[0].id = "999"; },
    (workout) => { workout.exercises[0].plannedSets[0].id = "999"; },
    (workout) => { workout.exercises.push({ id: "new", exerciseId: "999", name: "Unknown", position: 3, plannedSets: [] }); },
  ]) {
    const db = database();
    const before = db.snapshot();
    const edited = draft();
    change(edited);
    await assert.rejects(db.transaction((tx) => updateWorkoutTemplate(tx, edited)));
    assert.deepEqual(db.snapshot(), before);
  }
});
