"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { deleteWorkoutTemplate } from "@/lib/workout-delete";

export async function deleteWorkoutAction(id: string): Promise<string> {
  const deletedId = await prisma.$transaction((tx) => deleteWorkoutTemplate(tx, id));
  revalidatePath("/workouts");
  revalidatePath(`/workouts/${deletedId}`);
  revalidatePath(`/workouts/${deletedId}/active`);
  return deletedId;
}
