import test from "node:test";
import assert from "node:assert/strict";
import { initializeActiveSets, newActiveSet, newPlannedSet, nextSetPosition } from "../lib/workout-template.ts";
import { WEIGHT_UNIT_LABELS, WEIGHT_UNIT_OPTIONS } from "../lib/weight-unit.ts";

test("three and four planned sets initialize exactly that many actual rows", () => {
  for (const count of [3, 4]) {
    const template = Array.from({ length: count }, (_, index) => ({ ...newPlannedSet(`set-${index}`, index + 1), weight: 80 + index, reps: 12 }));
    const actual = initializeActiveSets(template);
    assert.equal(actual.length, count);
    assert.deepEqual(actual.map((set) => set.position), template.map((set) => set.position));
    assert.deepEqual(actual.map((set) => set.actualWeight), template.map((set) => set.weight));
    assert.ok(actual.every((set) => set.actualReps === null && set.reserve === ""));
  }
});

test("mixed units and planned reps survive while actual edits stay independent", () => {
  const template = [
    { id: "second", position: 2, weight: 120, weightUnit: "lb", reps: 8 },
    { id: "first", position: 1, weight: 80, weightUnit: "kg", reps: 10 },
  ];
  const original = structuredClone(template);
  const actual = initializeActiveSets(template);
  assert.deepEqual(actual.map((set) => [set.position, set.actualWeight, set.actualWeightUnit, set.planned.reps]), [[1, 80, "kg", 10], [2, 120, "lb", 8]]);
  actual[0].actualWeight = 90;
  actual[0].actualWeightUnit = "lb";
  actual[0].actualReps = 6;
  actual[0].planned.weight = 50;
  assert.deepEqual(template, original);
  assert.deepEqual(WEIGHT_UNIT_LABELS, { kg: "кг", lb: "ф" });
  assert.deepEqual(WEIGHT_UNIT_OPTIONS.map((option) => option.value), ["kg", "lb"]);
});

test("removed rows stay removed; new rows use the next position and inherit units", () => {
  const sets = [newPlannedSet("one", 1), newPlannedSet("two", 2, "lb"), newPlannedSet("three", 3)];
  const remaining = sets.slice(0, -1);
  assert.equal(initializeActiveSets(remaining).length, 2);
  const added = newPlannedSet("replacement", nextSetPosition(remaining), remaining.at(-1).weightUnit);
  assert.deepEqual([added.position, added.weightUnit, added.weight, added.reps], [3, "lb", null, null]);
  assert.deepEqual(initializeActiveSets([]), []);
  assert.equal(newPlannedSet("empty", nextSetPosition([])).weightUnit, "kg");
  assert.equal(newActiveSet("extra", 4, "lb").planned, null);
});

import { MOCK_WORKOUTS, createWorkoutDraft } from "../lib/mock-workouts.ts";
import { moveWorkoutExercise, normalizeExercisePositions, orderedExercises, removeWorkoutExercise } from "../lib/workout-template.ts";

function editableWorkout() {
  return { id: "edit", name: "Editing", exercises: ["a", "b", "c"].map((id, index) => ({
    id, exerciseId: `catalog-${id}`, name: id, position: index + 1,
    plannedSets: Array.from({ length: index + 1 }, (_, set) => ({
      id: `${id}-${set}`, position: set + 1, weight: 42.5 + index + set,
      weightUnit: set % 2 ? "lb" : "kg", reps: 12 - set,
    })),
  })) };
}

test("move one position in either direction without changing IDs or prescriptions", () => {
  const workout = editableWorkout();
  const before = structuredClone(workout);
  const moved = moveWorkoutExercise(workout, "b", -1);
  assert.deepEqual(moved.exercises.map((e) => e.id), ["b", "a", "c"]);
  assert.deepEqual(moved.exercises.map((e) => e.position), [1, 2, 3]);
  for (const e of moved.exercises) {
    const original = workout.exercises.find((item) => item.id === e.id);
    assert.equal(e.plannedSets, original.plannedSets);
    assert.equal(e.exerciseId, original.exerciseId);
  }
  assert.deepEqual(moveWorkoutExercise(moved, "b", 1), workout);
  assert.deepEqual(workout, before);
});

test("first, last, missing and empty moves are safe no-ops", () => {
  const workout = editableWorkout();
  assert.equal(moveWorkoutExercise(workout, "a", -1), workout);
  assert.equal(moveWorkoutExercise(workout, "c", 1), workout);
  assert.equal(moveWorkoutExercise(workout, "missing", 1), workout);
  const empty = { ...workout, exercises: [] };
  assert.equal(moveWorkoutExercise(empty, "a", -1), empty);
});

test("deletion removes only the workout entry, normalizes order and permits deleting the last entry", () => {
  const workout = editableWorkout();
  const before = structuredClone(workout);
  const removed = removeWorkoutExercise(workout, "b");
  assert.deepEqual(removed.exercises.map((e) => [e.id, e.position]), [["a", 1], ["c", 2]]);
  assert.equal(removed.exercises[1].plannedSets, workout.exercises[2].plannedSets);
  assert.deepEqual(workout, before);
  assert.equal(removeWorkoutExercise(workout, "missing"), workout);
  assert.deepEqual(removeWorkoutExercise(removeWorkoutExercise(removed, "a"), "c").exercises, []);
});

test("active initialization follows edited order and retains mixed units without changing existing active snapshots", () => {
  const workout = editableWorkout();
  const existingSession = workout.exercises.map((e) => initializeActiveSets(e.plannedSets));
  const beforeSession = structuredClone(existingSession);
  const edited = removeWorkoutExercise(moveWorkoutExercise(workout, "c", -1), "a");
  const active = orderedExercises(edited.exercises).map((e) => ({ id: e.id, sets: initializeActiveSets(e.plannedSets) }));
  assert.deepEqual(active.map((e) => e.id), ["c", "b"]);
  assert.deepEqual(active.map((e) => e.sets.length), [3, 2]);
  assert.deepEqual(active[0].sets.map((s) => [s.actualWeight, s.actualWeightUnit, s.planned.reps]), [[44.5, "kg", 12], [45.5, "lb", 11], [46.5, "kg", 10]]);
  assert.ok(active.every((e) => e.sets.every((s) => s.actualReps === null && s.reserve === "")));
  active[0].sets[0].actualWeight = 999;
  assert.equal(edited.exercises[0].plannedSets[0].weight, 44.5);
  assert.deepEqual(existingSession, beforeSession);
});

test("ordering is explicit for drafts and seeds and survives shuffled storage", () => {
  for (const workout of [createWorkoutDraft(), ...MOCK_WORKOUTS]) {
    assert.deepEqual(workout.exercises.map((e) => e.position), workout.exercises.map((_, i) => i + 1));
  }
  const workout = editableWorkout();
  workout.exercises.reverse();
  assert.deepEqual(orderedExercises(workout.exercises).map((e) => e.id), ["a", "b", "c"]);
  assert.deepEqual(moveWorkoutExercise(workout, "b", 1).exercises.map((e) => e.id), ["a", "c", "b"]);
  assert.deepEqual(normalizeExercisePositions(workout.exercises).map((e) => e.position), [1, 2, 3]);
});
