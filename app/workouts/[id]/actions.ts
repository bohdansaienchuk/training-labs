"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { updateWorkoutTemplate } from "@/lib/workout-write";
import type { Workout } from "@/lib/workout-template";
import type { ActionResult } from "@/lib/active-workout";
import { DEMO_USER_EMAIL } from "@/lib/demo-user";
import { findDemoUserId, startWorkoutSession } from "@/lib/workout-session";

export async function saveWorkoutAction(draft: Workout): Promise<Workout> {
  const saved = await prisma.$transaction((tx) => updateWorkoutTemplate(tx, draft));
  revalidatePath("/workouts");
  revalidatePath(`/workouts/${saved.id}`);
  revalidatePath(`/workouts/${saved.id}/active`);
  return saved;
}

export async function startWorkoutAction(workoutId: string): Promise<ActionResult<string>> {
  try {
    const sessionId = await prisma.$transaction(async (tx) => {
      const userId = await findDemoUserId(tx, DEMO_USER_EMAIL);
      return startWorkoutSession(tx, workoutId, userId);
    }, { isolationLevel: "Serializable" });
    return { ok: true, value: sessionId };
  } catch {
    return { ok: false, error: "Не вдалося почати тренування" };
  }
}
