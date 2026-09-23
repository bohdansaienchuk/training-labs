import test from "node:test";
import assert from "node:assert/strict";
import { workoutListItems, workoutListSelect } from "../lib/workout-list.ts";

test("workout summary counts template exercises, planned sets, and varying planned repetitions", () => {
  const [summary] = workoutListItems([{
    id: 10,
    name: "Full body",
    exercises: [
      { sets: [{ targetReps: 10 }, { targetReps: 8 }] },
      { sets: [{ targetReps: 12 }, { targetReps: null }, { targetReps: 5 }] },
    ],
    sessions: [{ exercises: [{ sets: [{ reps: 999 }] }] }],
  }]);

  assert.deepEqual(summary, {
    id: "10",
    name: "Full body",
    exerciseCount: 2,
    setCount: 5,
    repCount: 35,
  });
});

test("empty workout summary preserves all zero metrics", () => {
  assert.deepEqual(workoutListItems([{ id: 11, name: "Empty", exercises: [] }]), [{
    id: "11", name: "Empty", exerciseCount: 0, setCount: 0, repCount: 0,
  }]);
});

test("My Workouts selects only template identity and planned repetition data", () => {
  assert.deepEqual(workoutListSelect, {
    id: true,
    name: true,
    exercises: { select: { sets: { select: { targetReps: true } } } },
  });
  assert.equal(JSON.stringify(workoutListSelect).includes("sessions"), false);
  assert.equal(JSON.stringify(workoutListSelect).includes("performed"), false);
});
