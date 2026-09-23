import type { Prisma } from "@prisma/client";

export const workoutListSelect = {
  id: true,
  name: true,
  exercises: {
    select: {
      sets: { select: { targetReps: true } },
    },
  },
} as const satisfies Prisma.WorkoutSelect;

export type WorkoutListRecord = Prisma.WorkoutGetPayload<{ select: typeof workoutListSelect }>;

type WorkoutListReader = Pick<Prisma.TransactionClient, "workout">;

export function loadWorkoutsForUser(
  reader: WorkoutListReader,
  authenticatedUserId: number,
): Promise<WorkoutListRecord[]> {
  return reader.workout.findMany({
    where: { userId: authenticatedUserId },
    orderBy: { createdAt: "desc" },
    select: workoutListSelect,
  });
}

export function workoutListItems(workouts: readonly WorkoutListRecord[]) {
  return workouts.map((workout) => ({
    id: String(workout.id),
    name: workout.name,
    exerciseCount: workout.exercises.length,
    setCount: workout.exercises.reduce((total, exercise) => total + exercise.sets.length, 0),
    repCount: workout.exercises.reduce(
      (total, exercise) => total + exercise.sets.reduce((sum, set) => sum + (set.targetReps ?? 0), 0),
      0,
    ),
  }));
}
