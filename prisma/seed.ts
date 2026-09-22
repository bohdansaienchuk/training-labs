import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not defined");
}

const adapter = new PrismaPg({
  connectionString,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  const user = await prisma.user.upsert({
    where: {
      email: "test@traininglabs.local",
    },
    update: {},
    create: {
      email: "test@traininglabs.local",
      name: "Test User",
    },
  });

  const exerciseData = [
    { name: "Жим штанги лежачи", category: "Груди" },
    { name: "Жим гантелей на похилій лаві", category: "Груди" },
    { name: "Присідання зі штангою", category: "Ноги" },
    { name: "Румунська тяга", category: "Ноги" },
    { name: "Жим ногами", category: "Ноги" },
    { name: "Тяга верхнього блока", category: "Спина" },
    { name: "Тяга горизонтального блока", category: "Спина" },
    { name: "Підтягування", category: "Спина" },
    { name: "Жим гантелей сидячи", category: "Плечі" },
    { name: "Підйом гантелей в сторони", category: "Плечі" },
    { name: "Підйом штанги на біцепс", category: "Біцепс" },
    { name: "Розгинання рук на блоці", category: "Трицепс" },
  ];

  const exercises = [];

  for (const exercise of exerciseData) {
    let existing = await prisma.exercise.findFirst({
      where: {
        name: exercise.name,
      },
    });

    if (!existing) {
      existing = await prisma.exercise.create({
        data: exercise,
      });
    }

    exercises.push(existing);
  }

  const existingWorkout = await prisma.workout.findFirst({
    where: {
      userId: user.id,
      name: "Тренування A",
    },
  });

  if (!existingWorkout) {
    await prisma.workout.create({
      data: {
        name: "Тренування A",
        userId: user.id,
        exercises: {
          create: [
            {
              position: 1,
              exerciseId: exercises[0].id,
              sets: {
                create: [
                  {
                    setNumber: 1,
                    targetWeight: 80,
                    targetReps: 8,
                    targetRir: 2,
                  },
                  {
                    setNumber: 2,
                    targetWeight: 80,
                    targetReps: 8,
                    targetRir: 2,
                  },
                  {
                    setNumber: 3,
                    targetWeight: 80,
                    targetReps: 8,
                    targetRir: 1,
                  },
                ],
              },
            },
            {
              position: 2,
              exerciseId: exercises[5].id,
              sets: {
                create: [
                  {
                    setNumber: 1,
                    targetWeight: 60,
                    targetReps: 10,
                    targetRir: 2,
                  },
                  {
                    setNumber: 2,
                    targetWeight: 60,
                    targetReps: 10,
                    targetRir: 2,
                  },
                  {
                    setNumber: 3,
                    targetWeight: 60,
                    targetReps: 10,
                    targetRir: 1,
                  },
                ],
              },
            },
            {
              position: 3,
              exerciseId: exercises[10].id,
              sets: {
                create: [
                  {
                    setNumber: 1,
                    targetWeight: 30,
                    targetReps: 12,
                    targetRir: 2,
                  },
                  {
                    setNumber: 2,
                    targetWeight: 30,
                    targetReps: 12,
                    targetRir: 1,
                  },
                ],
              },
            },
          ],
        },
      },
    });
  }

  console.log("Seed completed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });