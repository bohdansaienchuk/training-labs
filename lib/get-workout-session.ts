import "server-only";

import { notFound } from "next/navigation";
import { DEMO_USER_EMAIL } from "./demo-user";
import { prisma } from "./prisma";
import { findDemoUserId, loadActiveWorkoutSession, loadCompletedWorkoutSession } from "./workout-session";

export async function getActiveWorkoutSession(workoutId: string, sessionId: string) {
  const session = await prisma.$transaction(async (tx) => {
    const userId = await findDemoUserId(tx, DEMO_USER_EMAIL);
    return loadActiveWorkoutSession(tx, workoutId, sessionId, userId);
  });
  if (!session) notFound();
  return { session, initialNow: Date.now() };
}

export async function getCompletedWorkoutSession(workoutId: string, sessionId: string) {
  const session = await prisma.$transaction(async (tx) => {
    const userId = await findDemoUserId(tx, DEMO_USER_EMAIL);
    return loadCompletedWorkoutSession(tx, workoutId, sessionId, userId);
  });
  if (!session) notFound();
  return session;
}
