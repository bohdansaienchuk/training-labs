import { getActiveWorkoutSession } from "@/lib/get-workout-session";
import ActiveWorkoutClient from "./active-workout-client";
import { addPerformedSetAction, finishWorkoutAction, removePerformedSetAction, savePerformedSetAction } from "./actions";

export default async function ActiveWorkout({ params, searchParams }: PageProps<"/workouts/[id]/active">) {
  const { id } = await params;
  const query = await searchParams;
  const sessionId = Array.isArray(query.session) ? query.session[0] : query.session;
  const { session, initialNow } = await getActiveWorkoutSession(id, sessionId ?? "");
  return <ActiveWorkoutClient key={session.id} initialSession={session} initialNow={initialNow} saveSetAction={savePerformedSetAction}
    addSetAction={addPerformedSetAction} removeSetAction={removePerformedSetAction} finishAction={finishWorkoutAction} />;
}
