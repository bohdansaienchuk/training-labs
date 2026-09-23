import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { deleteWorkoutTemplate, WorkoutDeleteError } from "../lib/workout-delete.ts";
import {
  addPerformedSet,
  deleteSessionExercise,
  finishWorkoutSession,
  loadActiveWorkoutSession,
  moveSessionExercise,
  removePerformedSet,
  savePerformedSet,
  startWorkoutSession,
  WorkoutSessionError,
} from "../lib/workout-session.ts";
import { createWorkoutTemplate, updateWorkoutTemplate } from "../lib/workout-write.ts";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

class RollbackWriteAuthorizationFixture extends Error {}

function workoutDraft(name, exerciseIds, claimedUserId) {
  return {
    id: "draft",
    name,
    ...(claimedUserId === undefined ? {} : { userId: claimedUserId }),
    exercises: exerciseIds.map((exerciseId, exerciseIndex) => ({
      id: `exercise-${exerciseIndex + 1}`,
      exerciseId: String(exerciseId),
      name: `Exercise ${exerciseIndex + 1}`,
      position: exerciseIndex + 1,
      plannedSets: [1, 2].map((setNumber) => ({
        id: `exercise-${exerciseIndex + 1}-set-${setNumber}`,
        position: setNumber,
        weight: 40 + exerciseIndex * 10 + setNumber,
        weightUnit: "kg",
        reps: 8,
        rir: 2,
      })),
    })),
  };
}

function validInputs(session, weight = 80) {
  return session.exercises.flatMap((exercise) => exercise.sets.map((set) => ({
    id: set.id,
    sessionExerciseId: exercise.id,
    weight,
    weightUnit: "kg",
    reps: 8,
    rir: "2",
  })));
}

test("real PostgreSQL mutations enforce two-user ownership and preserve rejected targets", async () => {
  await assert.rejects(prisma.$transaction(async (tx) => {
    const nonce = `${Date.now()}-${Math.random()}`;
    const userA = await tx.user.create({ data: { email: `write-auth-a-${nonce}@example.test`, name: "User A" } });
    const userB = await tx.user.create({ data: { email: `write-auth-b-${nonce}@example.test`, name: "User B" } });
    const exerciseOne = await tx.exercise.create({ data: { name: `Write exercise one ${nonce}` } });
    const exerciseTwo = await tx.exercise.create({ data: { name: `Write exercise two ${nonce}` } });
    const exerciseIds = [exerciseOne.id, exerciseTwo.id];

    const createdA = await createWorkoutTemplate(tx, workoutDraft("Workout A", exerciseIds, userB.id), userA.id);
    const createdB = await createWorkoutTemplate(tx, workoutDraft("Workout B", exerciseIds), userB.id);
    const workoutAId = Number(createdA.id);
    const workoutBId = Number(createdB.id);
    assert.equal((await tx.workout.findUnique({ where: { id: workoutAId } })).userId, userA.id, "client userId is ignored");
    assert.equal((await tx.workout.findUnique({ where: { id: workoutBId } })).userId, userB.id);

    const editedA = structuredClone(createdA);
    editedA.name = "Workout A edited";
    assert.equal((await updateWorkoutTemplate(tx, editedA, userA.id)).name, "Workout A edited");

    const bState = () => tx.workout.findUnique({
      where: { id: workoutBId },
      include: {
        exercises: {
          orderBy: { position: "asc" },
          include: { sets: { orderBy: { setNumber: "asc" } } },
        },
        sessions: {
          orderBy: { id: "asc" },
          include: {
            exercises: {
              orderBy: { position: "asc" },
              include: { sets: { orderBy: { setNumber: "asc" } } },
            },
          },
        },
      },
    });
    const stable = (value) => JSON.parse(JSON.stringify(value));
    const rejectWithoutChangingB = async (operation, expectedError = Error) => {
      const before = stable(await bState());
      await assert.rejects(operation(), expectedError);
      assert.deepEqual(stable(await bState()), before);
    };

    const stolenEdit = structuredClone(createdB);
    stolenEdit.name = "Stolen B";
    await rejectWithoutChangingB(() => updateWorkoutTemplate(tx, stolenEdit, userA.id), /Workout not found/);
    await assert.rejects(
      updateWorkoutTemplate(tx, { ...stolenEdit, id: "2147483647" }, userA.id),
      /Workout not found/,
    );

    const sessionAId = await startWorkoutSession(tx, createdA.id, userA.id);
    const sessionBId = await startWorkoutSession(tx, createdB.id, userB.id);
    assert.equal((await tx.workoutSession.findUnique({ where: { id: Number(sessionAId) } })).userId, userA.id);
    await rejectWithoutChangingB(() => startWorkoutSession(tx, createdB.id, userA.id), WorkoutSessionError);
    await assert.rejects(startWorkoutSession(tx, "2147483647", userA.id), WorkoutSessionError);

    let activeA = await loadActiveWorkoutSession(tx, createdA.id, sessionAId, userA.id);
    const activeB = await loadActiveWorkoutSession(tx, createdB.id, sessionBId, userB.id);
    const setA = activeA.exercises[0].sets[0];
    const exerciseB = activeB.exercises[0];
    const setB = exerciseB.sets[0];

    assert.deepEqual(
      await savePerformedSet(tx, createdA.id, sessionAId, userA.id, {
        id: setA.id,
        sessionExerciseId: setA.sessionExerciseId,
        weight: 220.46226218,
        weightUnit: "lb",
        reps: 8,
        rir: "2",
      }),
      { completed: true },
    );
    await rejectWithoutChangingB(
      () => savePerformedSet(tx, createdB.id, sessionBId, userA.id, {
        id: setB.id,
        sessionExerciseId: setB.sessionExerciseId,
        weight: 999,
        weightUnit: "kg",
        reps: 1,
        rir: "0",
      }),
      WorkoutSessionError,
    );

    const mismatchedSession = await tx.workoutSession.create({
      data: {
        workoutId: workoutBId,
        workoutName: "Mismatched owner fixture",
        userId: userA.id,
        exercises: {
          create: {
            exerciseId: exerciseOne.id,
            position: 1,
            sets: { create: { setNumber: 1 } },
          },
        },
      },
      include: { exercises: { include: { sets: true } } },
    });
    const mismatchedExercise = mismatchedSession.exercises[0];
    const mismatchedSet = mismatchedExercise.sets[0];
    await rejectWithoutChangingB(
      () => savePerformedSet(tx, createdB.id, String(mismatchedSession.id), userA.id, {
        id: String(mismatchedSet.id),
        sessionExerciseId: String(mismatchedExercise.id),
        weight: 70,
        weightUnit: "kg",
        reps: 8,
        rir: "2",
      }),
      WorkoutSessionError,
    );
    assert.equal((await tx.performedSet.findUnique({ where: { id: mismatchedSet.id } })).completed, false);

    const exerciseA = activeA.exercises[0];
    const addedA = await addPerformedSet(
      tx,
      createdA.id,
      sessionAId,
      exerciseA.id,
      exerciseA.sets.at(-1).id,
      userA.id,
    );
    await rejectWithoutChangingB(
      () => addPerformedSet(tx, createdB.id, sessionBId, exerciseB.id, exerciseB.sets.at(-1).id, userA.id),
      WorkoutSessionError,
    );
    assert.equal(await removePerformedSet(tx, createdA.id, sessionAId, exerciseA.id, addedA.id, userA.id), true);
    await rejectWithoutChangingB(
      () => removePerformedSet(tx, createdB.id, sessionBId, exerciseB.id, exerciseB.sets.at(-1).id, userA.id),
      WorkoutSessionError,
    );

    assert.deepEqual(
      await moveSessionExercise(tx, createdA.id, sessionAId, activeA.exercises[0].id, userA.id, 1),
      [activeA.exercises[1].id, activeA.exercises[0].id],
    );
    await rejectWithoutChangingB(
      () => moveSessionExercise(tx, createdB.id, sessionBId, activeB.exercises[0].id, userA.id, 1),
      WorkoutSessionError,
    );

    assert.deepEqual(
      await deleteSessionExercise(tx, createdA.id, sessionAId, activeA.exercises[1].id, userA.id),
      [activeA.exercises[0].id],
    );
    await rejectWithoutChangingB(
      () => deleteSessionExercise(tx, createdB.id, sessionBId, activeB.exercises[0].id, userA.id),
      WorkoutSessionError,
    );

    activeA = await loadActiveWorkoutSession(tx, createdA.id, sessionAId, userA.id);
    assert.equal(
      await finishWorkoutSession(tx, createdA.id, sessionAId, userA.id, validInputs(activeA), new Date("2026-09-23T12:00:00.000Z")),
      sessionAId,
    );
    await rejectWithoutChangingB(
      () => finishWorkoutSession(tx, createdB.id, sessionBId, userA.id, validInputs(activeB)),
      WorkoutSessionError,
    );

    await rejectWithoutChangingB(
      () => deleteWorkoutTemplate(tx, createdB.id, userA.id),
      (error) => error instanceof WorkoutDeleteError && error.code === "WORKOUT_NOT_FOUND",
    );
    await assert.rejects(
      deleteWorkoutTemplate(tx, "2147483647", userA.id),
      (error) => error instanceof WorkoutDeleteError && error.code === "WORKOUT_NOT_FOUND",
    );

    const crossOwnerWorkout = await tx.workout.create({
      data: { name: "Cross-owner delete fixture", userId: userA.id },
    });
    const crossOwnerSession = await tx.workoutSession.create({
      data: {
        workoutId: crossOwnerWorkout.id,
        workoutName: crossOwnerWorkout.name,
        userId: userB.id,
        completedAt: new Date("2026-09-23T13:00:00.000Z"),
        exercises: {
          create: {
            exerciseId: exerciseOne.id,
            position: 1,
            sets: {
              create: { setNumber: 1, weight: 75, reps: 6, rir: 1, completed: true },
            },
          },
        },
      },
      include: { exercises: { include: { sets: true } } },
    });
    const crossOwnerHistoryBefore = stable(crossOwnerSession);
    await assert.rejects(
      deleteWorkoutTemplate(tx, String(crossOwnerWorkout.id), userA.id),
      (error) => error instanceof WorkoutDeleteError && error.code === "WORKOUT_NOT_FOUND",
    );
    assert.ok(await tx.workout.findUnique({ where: { id: crossOwnerWorkout.id } }));
    assert.deepEqual(
      stable(await tx.workoutSession.findUnique({
        where: { id: crossOwnerSession.id },
        include: { exercises: { include: { sets: true } } },
      })),
      crossOwnerHistoryBefore,
    );

    assert.equal(await deleteWorkoutTemplate(tx, createdA.id, userA.id), createdA.id);
    const preservedA = await tx.workoutSession.findUnique({ where: { id: Number(sessionAId) } });
    assert.equal(preservedA.workoutId, null);
    assert.equal(preservedA.workoutName, "Workout A edited");

    const activeDeleteWorkout = await createWorkoutTemplate(tx, workoutDraft("Active delete", exerciseIds), userA.id);
    await startWorkoutSession(tx, activeDeleteWorkout.id, userA.id);
    await assert.rejects(
      deleteWorkoutTemplate(tx, activeDeleteWorkout.id, userA.id),
      (error) => error instanceof WorkoutDeleteError && error.code === "WORKOUT_HAS_ACTIVE_SESSION",
    );
    assert.ok(await tx.workout.findUnique({ where: { id: Number(activeDeleteWorkout.id) } }));

    throw new RollbackWriteAuthorizationFixture();
  }, { timeout: 30_000 }), RollbackWriteAuthorizationFixture);
});

test.after(async () => {
  await prisma.$disconnect();
});
