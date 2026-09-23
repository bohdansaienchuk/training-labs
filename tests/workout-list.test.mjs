import test from "node:test";
import assert from "node:assert/strict";
import { loadWorkoutsForUser, workoutListItems, workoutListSelect } from "../lib/workout-list.ts";

test("My Workouts reader scopes the database query to the authenticated user", async () => {
  const records = [
    { id: 10, userId: 7, name: "Owned", createdAt: new Date("2026-09-20"), exercises: [] },
    { id: 11, userId: 8, name: "Foreign", createdAt: new Date("2026-09-21"), exercises: [] },
  ];
  let query;
  const reader = {
    workout: {
      findMany: async (args) => {
        query = args;
        return records.filter((workout) => workout.userId === args.where.userId);
      },
    },
  };

  assert.deepEqual((await loadWorkoutsForUser(reader, 7)).map((workout) => workout.id), [10]);
  assert.deepEqual(query, {
    where: { userId: 7 },
    orderBy: { createdAt: "desc" },
    select: workoutListSelect,
  });
});

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
