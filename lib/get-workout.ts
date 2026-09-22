import "server-only";
import { prisma } from "@/lib/prisma";
import { resolveWorkout } from "@/lib/workout-read";

export function getWorkout(id: string) {
  return resolveWorkout(id, (args) => prisma.workout.findUnique(args));
}
