import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { WorkoutsClient } from "./workouts-client";
import { workoutListItems } from "@/lib/workout-list";
import { deleteWorkoutAction } from "./actions";

export default async function MyWorkoutsPage() {
  await connection();
  const workouts = await prisma.workout.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      name: true,
      exercises: {
        select: {
          _count: { select: { sets: true } },
        },
      },
    },
  });

  const list = workoutListItems(workouts);
  const listVersion = list.map((workout) => `${workout.id}:${workout.name}:${workout.exerciseCount}:${workout.setCount}`).join("|");
  return <WorkoutsClient key={listVersion} workouts={list} deleteAction={deleteWorkoutAction} />;
}
