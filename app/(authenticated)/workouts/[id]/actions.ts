"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { updateWorkoutTemplate } from "@/lib/workout-write";
import type { Workout } from "@/lib/workout-template";
import type { ActionResult } from "@/lib/active-workout";
import { startWorkoutSession } from "@/lib/workout-session";

export async function saveWorkoutAction(draft: Workout): Promise<Workout> {
  const authenticatedUser = await requireUser();
  const saved = await prisma.$transaction((tx) =>
    updateWorkoutTemplate(tx, draft, authenticatedUser.id),
  );
  revalidatePath("/workouts");
  revalidatePath(`/workouts/${saved.id}`);
  revalidatePath(`/workouts/${saved.id}/active`);
  return saved;
}

export async function startWorkoutAction(workoutId: string): Promise<ActionResult<string>> {
  const authenticatedUser = await requireUser();
  try {
    const sessionId = await prisma.$transaction(
      (tx) => startWorkoutSession(tx, workoutId, authenticatedUser.id),
      { isolationLevel: "Serializable" },
    );
    return { ok: true, value: sessionId };
  } catch {
    return { ok: false, error: "Не вдалося почати тренування" };
  }
}
