import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { loadExerciseDetails } from "../lib/exercise-history.ts";
import { loadWorkoutsForUser } from "../lib/workout-list.ts";
import { resolveWorkoutForUser } from "../lib/workout-read.ts";
import {
  loadActiveWorkoutSession,
  loadCompletedWorkoutSession,
} from "../lib/workout-session.ts";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

class RollbackAuthorizationFixture extends Error {}

test("real PostgreSQL readers isolate Workout, Session, history, and Previous Results for two users", async () => {
  await assert.rejects(prisma.$transaction(async (tx) => {
    const nonce = `${Date.now()}-${Math.random()}`;
    const [userA, userB, exercise] = await Promise.all([
      tx.user.create({ data: { email: `read-auth-a-${nonce}@example.test`, name: "User A" } }),
      tx.user.create({ data: { email: `read-auth-b-${nonce}@example.test`, name: "User B" } }),
      tx.exercise.create({ data: { name: `Shared exercise ${nonce}`, category: "Shared" } }),
    ]);

    const createWorkout = (userId, name) => tx.workout.create({
      data: {
        userId,
        name,
        exercises: {
          create: {
            exerciseId: exercise.id,
            position: 1,
            sets: { create: { setNumber: 1, targetWeight: 50, targetReps: 8, targetRir: 2 } },
          },
        },
      },
    });
    const [workoutA, workoutB] = await Promise.all([
      createWorkout(userA.id, "Workout A"),
      createWorkout(userB.id, "Workout B"),
    ]);

    const createSession = (userId, workout, completedAt, weight) => tx.workoutSession.create({
      data: {
        userId,
        workoutId: workout.id,
        workoutName: workout.name,
        completedAt,
        exercises: {
          create: {
            exerciseId: exercise.id,
            position: 1,
            sets: {
              create: {
                setNumber: 1,
                weight,
                reps: completedAt ? 8 : null,
                rir: completedAt ? 2 : null,
                completed: Boolean(completedAt),
              },
            },
          },
        },
      },
    });
    const [completedA, completedB, activeA, activeB, mismatchedActive] = await Promise.all([
      createSession(userA.id, workoutA, new Date("2026-09-20T10:00:00.000Z"), 80),
      createSession(userB.id, workoutB, new Date("2026-09-21T10:00:00.000Z"), 200),
      createSession(userA.id, workoutA, null, null),
      createSession(userB.id, workoutB, null, null),
      createSession(userA.id, workoutB, null, null),
    ]);

    const workoutsA = await loadWorkoutsForUser(tx, userA.id);
    const workoutsB = await loadWorkoutsForUser(tx, userB.id);
    assert.deepEqual(workoutsA.map((workout) => workout.id), [workoutA.id]);
    assert.deepEqual(workoutsB.map((workout) => workout.id), [workoutB.id]);

    const workoutForA = (id) => resolveWorkoutForUser(String(id), userA.id, (args) => tx.workout.findFirst(args));
    assert.equal((await workoutForA(workoutA.id)).name, "Workout A");
    await assert.rejects(workoutForA(workoutB.id), { digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
    await assert.rejects(workoutForA(2147483647), { digest: "NEXT_HTTP_ERROR_FALLBACK;404" });

    const loadedActiveA = await loadActiveWorkoutSession(tx, String(workoutA.id), String(activeA.id), userA.id);
    assert.equal(loadedActiveA.id, String(activeA.id));
    assert.equal(await loadActiveWorkoutSession(tx, String(workoutB.id), String(activeB.id), userA.id), null);
    assert.equal(
      await loadActiveWorkoutSession(tx, String(workoutB.id), String(mismatchedActive.id), userA.id),
      null,
      "an owned session cannot authorize another user's live Workout template",
    );
    assert.equal(await loadCompletedWorkoutSession(tx, String(completedB.id), userA.id), null);
    assert.equal((await loadCompletedWorkoutSession(tx, String(completedA.id), userA.id)).id, String(completedA.id));

    const detailsA = await loadExerciseDetails(tx, exercise.id, userA.id);
    const detailsB = await loadExerciseDetails(tx, exercise.id, userB.id);
    assert.deepEqual(detailsA.history.map((entry) => [entry.sessionId, entry.sets[0].weight]), [[String(completedA.id), 80]]);
    assert.deepEqual(detailsB.history.map((entry) => [entry.sessionId, entry.sets[0].weight]), [[String(completedB.id), 200]]);
    assert.deepEqual(loadedActiveA.exercises[0].previousSets.map((set) => set.weight), [80]);
    assert.equal(loadedActiveA.exercises[0].previousSets.some((set) => set.weight === 200), false);

    assert.equal(await loadActiveWorkoutSession(tx, String(workoutA.id), String(activeA.id), userB.id), null);
    assert.equal(await loadCompletedWorkoutSession(tx, String(completedA.id), userB.id), null);
    await assert.rejects(
      resolveWorkoutForUser(String(workoutA.id), userB.id, (args) => tx.workout.findFirst(args)),
      { digest: "NEXT_HTTP_ERROR_FALLBACK;404" },
    );

    throw new RollbackAuthorizationFixture();
  }), RollbackAuthorizationFixture);
});

test.after(async () => {
  await prisma.$disconnect();
});
