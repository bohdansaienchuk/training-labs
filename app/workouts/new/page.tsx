import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { createWorkoutAction } from "./actions";
import CreateWorkoutClient from "./create-workout-client";

export default async function CreateWorkout() {
  await connection();
  const exercises = await prisma.exercise.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, category: true },
  });
  return <CreateWorkoutClient catalog={exercises.map((exercise) => ({
    id: String(exercise.id),
    name: exercise.name,
    muscleGroups: exercise.category ?? undefined,
  }))} createAction={createWorkoutAction} />;
}
