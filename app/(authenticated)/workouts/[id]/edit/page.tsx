import { requireUser } from "@/lib/current-user";
import { getWorkoutForUser } from "@/lib/get-workout";
import { prisma } from "@/lib/prisma";
import EditWorkoutClient from "./edit-workout-client";

export default async function EditWorkout({ params }: PageProps<"/workouts/[id]/edit">) {
  const { id } = await params;
  const currentUser = await requireUser();
  const [workout, exercises] = await Promise.all([
    getWorkoutForUser(id, currentUser.id),
    prisma.exercise.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, category: true } }),
  ]);
  return <EditWorkoutClient initialWorkout={workout} catalog={exercises.map((exercise) => ({
    id: String(exercise.id), name: exercise.name, muscleGroups: exercise.category ?? undefined,
  }))} />;
}
