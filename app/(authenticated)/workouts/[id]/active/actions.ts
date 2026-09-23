"use server";

import type { ActionResult, PerformedSetInput } from "@/lib/active-workout";
import { requireUser } from "@/lib/current-user";
import { prisma } from "@/lib/prisma";
import { addPerformedSet, deleteSessionExercise, finishWorkoutSession, IncompleteWorkoutError, moveSessionExercise, removePerformedSet, savePerformedSet } from "@/lib/workout-session";

export async function savePerformedSetAction(workoutId: string, sessionId: string, input: PerformedSetInput): Promise<ActionResult<{ completed: boolean }>> {
  const authenticatedUser = await requireUser();
  try {
    const value = await prisma.$transaction(
      (tx) => savePerformedSet(tx, workoutId, sessionId, authenticatedUser.id, input),
      { isolationLevel: "Serializable" },
    );
    return { ok: true, value };
  } catch {
    return { ok: false, error: "Не вдалося зберегти зміни" };
  }
}

export async function addPerformedSetAction(workoutId: string, sessionId: string, sessionExerciseId: string, expectedLastSetId: string): Promise<ActionResult<{ id: string; setNumber: number }>> {
  const authenticatedUser = await requireUser();
  try {
    const value = await prisma.$transaction(
      (tx) => addPerformedSet(tx, workoutId, sessionId, sessionExerciseId, expectedLastSetId, authenticatedUser.id),
      { isolationLevel: "Serializable" },
    );
    return { ok: true, value };
  } catch {
    return { ok: false, error: "Не вдалося додати підхід" };
  }
}

export async function removePerformedSetAction(workoutId: string, sessionId: string, sessionExerciseId: string, setId: string): Promise<ActionResult<boolean>> {
  const authenticatedUser = await requireUser();
  try {
    const value = await prisma.$transaction(
      (tx) => removePerformedSet(tx, workoutId, sessionId, sessionExerciseId, setId, authenticatedUser.id),
      { isolationLevel: "Serializable" },
    );
    return { ok: true, value };
  } catch {
    return { ok: false, error: "Не вдалося видалити підхід" };
  }
}

export async function moveSessionExerciseAction(workoutId: string, sessionId: string, sessionExerciseId: string, direction: -1 | 1): Promise<ActionResult<string[]>> {
  const authenticatedUser = await requireUser();
  try {
    const value = await prisma.$transaction(
      (tx) => moveSessionExercise(tx, workoutId, sessionId, sessionExerciseId, authenticatedUser.id, direction),
      { isolationLevel: "Serializable" },
    );
    return { ok: true, value };
  } catch {
    return { ok: false, error: "Не вдалося перемістити вправу" };
  }
}

export async function deleteSessionExerciseAction(workoutId: string, sessionId: string, sessionExerciseId: string): Promise<ActionResult<string[]>> {
  const authenticatedUser = await requireUser();
  try {
    const value = await prisma.$transaction(
      (tx) => deleteSessionExercise(tx, workoutId, sessionId, sessionExerciseId, authenticatedUser.id),
      { isolationLevel: "Serializable" },
    );
    return { ok: true, value };
  } catch {
    return { ok: false, error: "Не вдалося видалити вправу" };
  }
}

export async function finishWorkoutAction(workoutId: string, sessionId: string, inputs: PerformedSetInput[]): Promise<ActionResult<string>> {
  const authenticatedUser = await requireUser();
  try {
    const value = await prisma.$transaction(
      (tx) => finishWorkoutSession(tx, workoutId, sessionId, authenticatedUser.id, inputs),
      { isolationLevel: "Serializable" },
    );
    return { ok: true, value };
  } catch (error) {
    if (error instanceof IncompleteWorkoutError) return { ok: false, code: "incomplete", error: "Заповніть всі клітинки" };
    return { ok: false, error: "Не вдалося завершити тренування" };
  }
}
