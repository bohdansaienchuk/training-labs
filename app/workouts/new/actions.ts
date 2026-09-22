"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { createWorkoutTemplate } from "@/lib/workout-write";
import type { Workout } from "@/lib/workout-template";
import { DEMO_USER_EMAIL } from "@/lib/demo-user";

export async function createWorkoutAction(draft: Workout): Promise<Workout> {
  const saved = await prisma.$transaction(async (tx) => {
    // Authentication is not implemented yet; the current app is scoped to its seeded demo user.
    const user = await tx.user.findUnique({ where: { email: DEMO_USER_EMAIL }, select: { id: true } });
    if (!user) throw new Error("Workout user not found");
    return createWorkoutTemplate(tx, draft, user.id);
  });
  revalidatePath("/workouts");
  revalidatePath(`/workouts/${saved.id}`);
  revalidatePath(`/workouts/${saved.id}/active`);
  return saved;
}
