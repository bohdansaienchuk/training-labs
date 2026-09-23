"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { deleteWorkoutTemplate, WorkoutDeleteError, type WorkoutDeleteResult } from "@/lib/workout-delete";

const SERIALIZABLE_RETRY_LIMIT = 3;

export async function deleteWorkoutAction(id: string): Promise<WorkoutDeleteResult> {
  const authenticatedUser = await requireUser();
  for (let attempt = 1; attempt <= SERIALIZABLE_RETRY_LIMIT; attempt += 1) {
    try {
      const deletedId = await prisma.$transaction(
        (tx) => deleteWorkoutTemplate(tx, id, authenticatedUser.id),
        { isolationLevel: "Serializable" },
      );
      revalidatePath("/workouts");
      revalidatePath(`/workouts/${deletedId}`);
      revalidatePath(`/workouts/${deletedId}/active`);
      return { ok: true, value: deletedId };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034" && attempt < SERIALIZABLE_RETRY_LIMIT) {
        continue;
      }
      if (error instanceof WorkoutDeleteError) {
        return { ok: false, code: error.code, error: error.message };
      }
      return { ok: false, code: "WORKOUT_DELETE_FAILED", error: "Workout deletion failed" };
    }
  }
  return { ok: false, code: "WORKOUT_DELETE_FAILED", error: "Workout deletion failed" };
}
