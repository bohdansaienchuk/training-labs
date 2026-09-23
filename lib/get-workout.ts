import "server-only";
import { prisma } from "@/lib/prisma";
import { resolveWorkoutForUser } from "@/lib/workout-read";

export function getWorkoutForUser(id: string, authenticatedUserId: number) {
  return resolveWorkoutForUser(id, authenticatedUserId, (args) =>
    prisma.workout.findFirst(args),
  );
}
