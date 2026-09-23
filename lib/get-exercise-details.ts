import "server-only";

import { loadExerciseDetails, resolveExerciseDetails } from "./exercise-history";
import { prisma } from "./prisma";

export function getExerciseDetailsForUser(id: string, authenticatedUserId: number) {
  return resolveExerciseDetails(id, (exerciseId) =>
    prisma.$transaction((tx) =>
      loadExerciseDetails(tx, exerciseId, authenticatedUserId),
    ),
  );
}
