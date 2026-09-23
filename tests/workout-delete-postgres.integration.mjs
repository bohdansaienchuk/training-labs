import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

class RollbackIntegrationFixture extends Error {}

test("PostgreSQL Workout delete sets completed session workoutId null and preserves performed history", async () => {
  await assert.rejects(prisma.$transaction(async (tx) => {
    const nonce = `${Date.now()}-${Math.random()}`;
    const user = await tx.user.create({ data: { email: `delete-fk-${nonce}@example.test`, name: "Delete fixture" } });
    const exercise = await tx.exercise.create({ data: { name: `Delete FK ${nonce}` } });
    const workout = await tx.workout.create({
      data: {
        name: "Historical workout",
        userId: user.id,
        exercises: {
          create: {
            exerciseId: exercise.id,
            position: 1,
            sets: { create: { setNumber: 1 } },
          },
        },
      },
    });
    const session = await tx.workoutSession.create({
      data: {
        workoutId: workout.id,
        workoutName: workout.name,
        userId: user.id,
        completedAt: new Date(),
        exercises: {
          create: {
            exerciseId: exercise.id,
            position: 1,
            sets: { create: { setNumber: 1, weight: 80, reps: 8, rir: 2, completed: true } },
          },
        },
      },
    });

    await tx.workout.delete({ where: { id: workout.id } });

    const preserved = await tx.workoutSession.findUnique({
      where: { id: session.id },
      include: { exercises: { include: { sets: true } } },
    });
    assert.equal(preserved.workoutId, null);
    assert.equal(preserved.workoutName, "Historical workout");
    assert.equal(preserved.exercises.length, 1);
    assert.equal(preserved.exercises[0].sets.length, 1);
    assert.equal(preserved.exercises[0].sets[0].completed, true);
    assert.equal(await tx.workoutExercise.count({ where: { workoutId: workout.id } }), 0);

    throw new RollbackIntegrationFixture();
  }), RollbackIntegrationFixture);
});

test.after(async () => {
  await prisma.$disconnect();
});
