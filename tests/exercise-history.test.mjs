import test from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import {
  formatExerciseHistoryDate,
  loadExerciseDetails,
  resolveExerciseDetails,
} from "../lib/exercise-history.ts";

function historyDatabase() {
  const exercise = { id: 20, name: "Жим штанги лежачи", category: "Груди" };
  const sessions = [
    {
      id: 101, userId: 7, startedAt: new Date("2026-09-26T19:00:00.000Z"), completedAt: new Date("2026-09-27T10:00:00.000Z"),
      workout: { name: "Ранкове тренування" },
      exercises: [
        { exerciseId: 20, position: 2, sets: [
          { setNumber: 2, weight: new Prisma.Decimal("82.50"), reps: 8, rir: 1, completed: true },
          { setNumber: 1, weight: new Prisma.Decimal("80.00"), reps: 10, rir: 2, completed: true },
          { setNumber: 3, weight: null, reps: null, rir: null, completed: false },
        ] },
        { exerciseId: 21, position: 1, sets: [{ setNumber: 1, weight: new Prisma.Decimal("50"), reps: 12, rir: 2, completed: true }] },
      ],
    },
    {
      id: 102, userId: 7, startedAt: new Date("2026-09-26T22:30:00.000Z"), completedAt: new Date("2026-09-27T10:00:00.000Z"),
      workout: { name: "Вечірнє тренування" },
      exercises: [{ exerciseId: 20, position: 1, sets: [{ setNumber: 1, weight: null, reps: null, rir: null, completed: true }] }],
    },
    {
      id: 103, userId: 7, startedAt: new Date("2026-09-28T10:00:00.000Z"), completedAt: null,
      workout: { name: "Незавершене" }, exercises: [{ exerciseId: 20, position: 1, sets: [] }],
    },
    {
      id: 104, userId: 8, startedAt: new Date("2026-09-29T10:00:00.000Z"), completedAt: new Date("2026-09-29T11:00:00.000Z"),
      workout: { name: "Чуже тренування" }, exercises: [{ exerciseId: 20, position: 1, sets: [] }],
    },
    {
      id: 105, userId: 7, startedAt: new Date("2026-09-30T10:00:00.000Z"), completedAt: new Date("2026-09-30T11:00:00.000Z"),
      workout: { name: "Інша вправа" }, exercises: [{ exerciseId: 21, position: 1, sets: [] }],
    },
  ];
  const calls = { exercise: [], sessions: [] };
  const tx = {
    exercise: {
      findUnique: async (args) => {
        calls.exercise.push(args);
        return args.where.id === exercise.id ? exercise : null;
      },
    },
    workoutSession: {
      findMany: async (args) => {
        calls.sessions.push(args);
        const requestedExerciseId = args.where.exercises.some.exerciseId;
        return sessions
          .filter((session) => session.userId === args.where.userId)
          .filter((session) => args.where.completedAt.not === null ? session.completedAt !== null : true)
          .filter((session) => session.exercises.some((entry) => entry.exerciseId === requestedExerciseId))
          .toSorted((a, b) => b.completedAt.getTime() - a.completedAt.getTime() || b.id - a.id)
          .map((session) => ({
            id: session.id,
            startedAt: session.startedAt,
            completedAt: session.completedAt,
            workout: session.workout,
            exercises: session.exercises
              .filter((entry) => entry.exerciseId === args.select.exercises.where.exerciseId)
              .toSorted((a, b) => a.position - b.position)
              .slice(0, args.select.exercises.take)
              .map((entry) => ({
                sets: entry.sets
                  .filter((set) => !args.select.exercises.select.sets.where.completed || set.completed)
                  .toSorted((a, b) => a.setNumber - b.setNumber),
              })),
          }));
      },
    },
  };
  return { tx, calls };
}

test("valid Exercise ID resolves the real exercise and completed owned history with canonical performed data", async () => {
  const { tx, calls } = historyDatabase();
  const details = await loadExerciseDetails(tx, 20, 7);

  assert.deepEqual(details.exercise, { id: "20", name: "Жим штанги лежачи", category: "Груди" });
  assert.deepEqual(details.history.map((entry) => entry.sessionId), ["102", "101"], "same completedAt uses descending ID as a tie-breaker");
  assert.deepEqual(details.history.map((entry) => entry.workoutName), ["Вечірнє тренування", "Ранкове тренування"]);
  assert.deepEqual(details.history[1].sets, [
    { setNumber: 1, weight: 80, unit: "kg", reps: 10, rir: 2 },
    { setNumber: 2, weight: 82.5, unit: "kg", reps: 8, rir: 1 },
  ]);
  assert.deepEqual(details.history[0].sets, [{ setNumber: 1, weight: null, unit: "kg", reps: null, rir: null }]);
  assert.deepEqual(calls.exercise, [{ where: { id: 20 }, select: { id: true, name: true, category: true } }]);

  const query = calls.sessions[0];
  assert.deepEqual(query.where, { userId: 7, completedAt: { not: null }, exercises: { some: { exerciseId: 20 } } });
  assert.deepEqual(query.orderBy, [{ completedAt: "desc" }, { id: "desc" }]);
  assert.deepEqual(query.select.exercises.where, { exerciseId: 20 });
  assert.deepEqual(query.select.exercises.orderBy, { position: "asc" });
  assert.equal(query.select.exercises.take, 1);
  assert.deepEqual(query.select.exercises.select.sets.where, { completed: true });
  assert.deepEqual(query.select.exercises.select.sets.orderBy, { setNumber: "asc" });
  assert.equal(JSON.stringify(query).includes("WorkoutExercise"), false);
  assert.equal(JSON.stringify(query).includes("WorkoutSet"), false);
  assert.deepEqual(JSON.parse(JSON.stringify(details)), details, "Prisma Decimal and Date instances must not leak");
});

test("invalid IDs fail before the injected database loader runs", async () => {
  for (const id of ["0", "-1", "01", "1.5", "1e2", " 1", "exercise", "d81e74c5-b10d-473d-a702-101084701e4c", "2147483648"]) {
    await assert.rejects(resolveExerciseDetails(id, async () => assert.fail("invalid ID must not reach Prisma")), { digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
  }
});

test("missing Exercise produces not-found without mock fallback", async () => {
  await assert.rejects(resolveExerciseDetails("999", async (id) => {
    assert.equal(id, 999);
    return null;
  }), { digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
});

test("empty history returns the real Exercise and an empty history array", async () => {
  const tx = {
    exercise: { findUnique: async () => ({ id: 20, name: "Жим", category: null }) },
    workoutSession: { findMany: async () => [] },
  };
  assert.deepEqual(await loadExerciseDetails(tx, 20, 7), {
    exercise: { id: "20", name: "Жим", category: null },
    history: [],
  });
});

test("database errors propagate instead of being replaced with mock data", async () => {
  const failure = new Error("Database unavailable");
  await assert.rejects(resolveExerciseDetails("20", async () => { throw failure; }), (error) => error === failure);
});

test("Ukrainian history dates use Europe/Kyiv and omit the year suffix", () => {
  assert.equal(formatExerciseHistoryDate("2026-09-26T22:30:00.000Z"), "27 вересня 2026");
  assert.equal(formatExerciseHistoryDate(new Date("2026-10-10T12:00:00.000Z")), "10 жовтня 2026");
});
