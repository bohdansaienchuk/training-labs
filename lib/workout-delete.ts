import type { Prisma } from "@prisma/client";

export type WorkoutDeleteErrorCode =
  | "WORKOUT_HAS_ACTIVE_SESSION"
  | "WORKOUT_NOT_FOUND";

export type WorkoutDeleteResult =
  | { ok: true; value: string }
  | {
      ok: false;
      code: WorkoutDeleteErrorCode | "WORKOUT_DELETE_FAILED";
      error: string;
    };

export class WorkoutDeleteError extends Error {
  constructor(public readonly code: WorkoutDeleteErrorCode) {
    super(code);
    this.name = "WorkoutDeleteError";
  }
}

function databaseId(value: string): number | null {
  return /^[1-9]\d*$/.test(value) && Number(value) <= 2147483647 ? Number(value) : null;
}

export async function deleteWorkoutTemplate(tx: Prisma.TransactionClient, id: string, userId: number): Promise<string> {
  const workoutId = databaseId(id);
  if (!workoutId || !Number.isInteger(userId) || userId < 1) {
    throw new WorkoutDeleteError("WORKOUT_NOT_FOUND");
  }

  const workout = await tx.workout.findFirst({
    where: { id: workoutId, userId },
    select: { id: true },
  });
  if (!workout) throw new WorkoutDeleteError("WORKOUT_NOT_FOUND");

  const activeSession = await tx.workoutSession.findFirst({
    where: { workoutId, userId, completedAt: null },
    select: { id: true },
  });
  if (activeSession) throw new WorkoutDeleteError("WORKOUT_HAS_ACTIVE_SESSION");

  const deleted = await tx.workout.deleteMany({
    where: {
      id: workoutId,
      userId,
      sessions: { none: { completedAt: null } },
    },
  });
  if (deleted.count !== 1) {
    const activeSessionAfterConflict = await tx.workoutSession.findFirst({
      where: { workoutId, userId, completedAt: null },
      select: { id: true },
    });
    if (activeSessionAfterConflict) throw new WorkoutDeleteError("WORKOUT_HAS_ACTIVE_SESSION");
    throw new WorkoutDeleteError("WORKOUT_NOT_FOUND");
  }
  return String(workoutId);
}
