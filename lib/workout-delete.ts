import type { Prisma } from "@prisma/client";

function databaseId(value: string): number | null {
  return /^[1-9]\d*$/.test(value) && Number(value) <= 2147483647 ? Number(value) : null;
}

export async function deleteWorkoutTemplate(tx: Prisma.TransactionClient, id: string): Promise<string> {
  const workoutId = databaseId(id);
  if (!workoutId) throw new Error("Invalid workout");
  // The schema cascades Workout -> WorkoutSession. Restrict deletion to templates
  // with no history so SessionExercise and PerformedSet records are never removed.
  const deleted = await tx.workout.deleteMany({
    where: { id: workoutId, sessions: { none: {} } },
  });
  if (deleted.count !== 1) throw new Error("Workout not found or has workout history");
  return String(workoutId);
}
