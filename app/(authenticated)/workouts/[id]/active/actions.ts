"use server";

import type { ActionResult, PerformedSetInput } from "@/lib/active-workout";
import { DEMO_USER_EMAIL } from "@/lib/demo-user";
import { prisma } from "@/lib/prisma";
import { addPerformedSet, deleteSessionExercise, findDemoUserId, finishWorkoutSession, IncompleteWorkoutError, moveSessionExercise, removePerformedSet, savePerformedSet } from "@/lib/workout-session";

export async function savePerformedSetAction(workoutId: string, sessionId: string, input: PerformedSetInput): Promise<ActionResult<{ completed: boolean }>> {
  try {
    const value = await prisma.$transaction(async (tx) => {
      const userId = await findDemoUserId(tx, DEMO_USER_EMAIL);
      return savePerformedSet(tx, workoutId, sessionId, userId, input);
    });
    return { ok: true, value };
  } catch {
    return { ok: false, error: "Не вдалося зберегти зміни" };
  }
}

export async function addPerformedSetAction(workoutId: string, sessionId: string, sessionExerciseId: string, expectedLastSetId: string): Promise<ActionResult<{ id: string; setNumber: number }>> {
  try {
    const value = await prisma.$transaction(async (tx) => {
      const userId = await findDemoUserId(tx, DEMO_USER_EMAIL);
      return addPerformedSet(tx, workoutId, sessionId, sessionExerciseId, expectedLastSetId, userId);
    }, { isolationLevel: "Serializable" });
    return { ok: true, value };
  } catch {
    return { ok: false, error: "Не вдалося додати підхід" };
  }
}

export async function removePerformedSetAction(workoutId: string, sessionId: string, sessionExerciseId: string, setId: string): Promise<ActionResult<boolean>> {
  try {
    const value = await prisma.$transaction(async (tx) => {
      const userId = await findDemoUserId(tx, DEMO_USER_EMAIL);
      return removePerformedSet(tx, workoutId, sessionId, sessionExerciseId, setId, userId);
    }, { isolationLevel: "Serializable" });
    return { ok: true, value };
  } catch {
    return { ok: false, error: "Не вдалося видалити підхід" };
  }
}

export async function moveSessionExerciseAction(workoutId: string, sessionId: string, sessionExerciseId: string, direction: -1 | 1): Promise<ActionResult<string[]>> {
  try {
    const value = await prisma.$transaction(async (tx) => {
      const userId = await findDemoUserId(tx, DEMO_USER_EMAIL);
      return moveSessionExercise(tx, workoutId, sessionId, sessionExerciseId, userId, direction);
    }, { isolationLevel: "Serializable" });
    return { ok: true, value };
  } catch {
    return { ok: false, error: "Не вдалося перемістити вправу" };
  }
}

export async function deleteSessionExerciseAction(workoutId: string, sessionId: string, sessionExerciseId: string): Promise<ActionResult<string[]>> {
  try {
    const value = await prisma.$transaction(async (tx) => {
      const userId = await findDemoUserId(tx, DEMO_USER_EMAIL);
      return deleteSessionExercise(tx, workoutId, sessionId, sessionExerciseId, userId);
    }, { isolationLevel: "Serializable" });
    return { ok: true, value };
  } catch {
    return { ok: false, error: "Не вдалося видалити вправу" };
  }
}

export async function finishWorkoutAction(workoutId: string, sessionId: string, inputs: PerformedSetInput[]): Promise<ActionResult<string>> {
  try {
    const value = await prisma.$transaction(async (tx) => {
      const userId = await findDemoUserId(tx, DEMO_USER_EMAIL);
      return finishWorkoutSession(tx, workoutId, sessionId, userId, inputs);
    }, { isolationLevel: "Serializable" });
    return { ok: true, value };
  } catch (error) {
    if (error instanceof IncompleteWorkoutError) return { ok: false, code: "incomplete", error: "Заповніть всі клітинки" };
    return { ok: false, error: "Не вдалося завершити тренування" };
  }
}
