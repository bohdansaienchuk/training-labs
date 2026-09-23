import { connection } from "next/server";
import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { WorkoutsClient } from "./workouts-client";
import { loadWorkoutsForUser, workoutListItems } from "@/lib/workout-list";
import { deleteWorkoutAction } from "./actions";

export default async function MyWorkoutsPage() {
  await connection();
  const currentUser = await requireUser();
  const workouts = await loadWorkoutsForUser(prisma, currentUser.id);

  const list = workoutListItems(workouts);
  const listVersion = list.map((workout) => `${workout.id}:${workout.name}:${workout.exerciseCount}:${workout.setCount}:${workout.repCount}`).join("|");
  return <WorkoutsClient key={listVersion} workouts={list} deleteAction={deleteWorkoutAction} />;
}
