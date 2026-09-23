import "server-only";

import { notFound } from "next/navigation";
import { prisma } from "./prisma";
import { loadActiveWorkoutSession, loadCompletedWorkoutSession } from "./workout-session";

export async function getActiveWorkoutSessionForUser(
  workoutId: string,
  sessionId: string,
  authenticatedUserId: number,
) {
  const session = await prisma.$transaction((tx) =>
    loadActiveWorkoutSession(tx, workoutId, sessionId, authenticatedUserId),
  );
  if (!session) notFound();
  return { session, initialNow: Date.now() };
}

export async function getCompletedWorkoutSessionForUser(
  sessionId: string,
  authenticatedUserId: number,
) {
  const session = await prisma.$transaction((tx) =>
    loadCompletedWorkoutSession(tx, sessionId, authenticatedUserId),
  );
  if (!session) notFound();
  return session;
}
