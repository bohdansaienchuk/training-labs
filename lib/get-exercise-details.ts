import "server-only";

import { DEMO_USER_EMAIL } from "./demo-user";
import { loadExerciseDetails, resolveExerciseDetails } from "./exercise-history";
import { prisma } from "./prisma";
import { findDemoUserId } from "./workout-session";

export function getExerciseDetails(id: string) {
  return resolveExerciseDetails(id, (exerciseId) => prisma.$transaction(async (tx) => {
    const userId = await findDemoUserId(tx, DEMO_USER_EMAIL);
    return loadExerciseDetails(tx, exerciseId, userId);
  }));
}
