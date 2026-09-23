import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import type { Workout } from "./workout-template";

export const workoutInclude = {
  exercises: {
    orderBy: { position: "asc" },
    include: { exercise: true, sets: { orderBy: { setNumber: "asc" } } },
  },
} as const satisfies Prisma.WorkoutInclude;

type DatabaseWorkout = Prisma.WorkoutGetPayload<{ include: typeof workoutInclude }>;
type FindWorkoutForUser = (args: {
  where: { id: number; userId: number };
  include: typeof workoutInclude;
}) => Promise<DatabaseWorkout | null>;

export function serializeWorkout(workout: DatabaseWorkout): Workout {
  return {
    id: String(workout.id),
    name: workout.name,
    exercises: [...workout.exercises].sort((a, b) => a.position - b.position).map((entry) => ({
      id: String(entry.id),
      exerciseId: String(entry.exerciseId),
      name: entry.exercise.name,
      category: entry.exercise.category,
      position: entry.position,
      plannedSets: [...entry.sets].sort((a, b) => a.setNumber - b.setNumber).map((set) => ({
        id: String(set.id),
        position: set.setNumber,
        weight: set.targetWeight === null ? null : set.targetWeight.toNumber(),
        // Database weights currently use kilograms; preserve UI units on temporary edits.
        weightUnit: "kg",
        reps: set.targetReps,
        rir: set.targetRir,
      })),
    })),
  };
}

// Inject only the read operation so real Prisma query arguments and 404 behavior
// can be exercised without database credentials or writes in tests.
export async function resolveWorkoutForUser(
  id: string,
  authenticatedUserId: number,
  findWorkout: FindWorkoutForUser,
): Promise<Workout> {
  if (!/^[1-9]\d*$/.test(id) || Number(id) > 2147483647) notFound();
  const workout = await findWorkout({
    where: { id: Number(id), userId: authenticatedUserId },
    include: workoutInclude,
  });
  if (!workout) notFound();
  return serializeWorkout(workout);
}
