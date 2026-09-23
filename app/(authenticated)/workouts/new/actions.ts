"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { createWorkoutTemplate } from "@/lib/workout-write";
import type { Workout } from "@/lib/workout-template";

export async function createWorkoutAction(draft: Workout): Promise<Workout> {
  const authenticatedUser = await requireUser();
  const saved = await prisma.$transaction((tx) =>
    createWorkoutTemplate(tx, draft, authenticatedUser.id),
  );
  revalidatePath("/workouts");
  revalidatePath(`/workouts/${saved.id}`);
  revalidatePath(`/workouts/${saved.id}/active`);
  return saved;
}
