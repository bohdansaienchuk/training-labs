import { requireUser } from "@/lib/current-user";
import { getActiveWorkoutSessionForUser } from "@/lib/get-workout-session";
import ActiveWorkoutClient from "./active-workout-client";
import { addPerformedSetAction, deleteSessionExerciseAction, finishWorkoutAction, moveSessionExerciseAction, removePerformedSetAction, savePerformedSetAction } from "./actions";

export default async function ActiveWorkout({ params, searchParams }: PageProps<"/workouts/[id]/active">) {
  const { id } = await params;
  const query = await searchParams;
  const sessionId = Array.isArray(query.session) ? query.session[0] : query.session;
  const currentUser = await requireUser();
  const { session, initialNow } = await getActiveWorkoutSessionForUser(id, sessionId ?? "", currentUser.id);
  return <ActiveWorkoutClient key={session.id} initialSession={session} initialNow={initialNow} saveSetAction={savePerformedSetAction}
    addSetAction={addPerformedSetAction} removeSetAction={removePerformedSetAction} moveExerciseAction={moveSessionExerciseAction}
    deleteExerciseAction={deleteSessionExerciseAction} finishAction={finishWorkoutAction} />;
}
