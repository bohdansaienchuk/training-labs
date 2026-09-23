import { requireUser } from "@/lib/current-user";
import { getWorkoutForUser } from "@/lib/get-workout";
import WorkoutDetailsClient from "./workout-details-client";
import { saveWorkoutAction, startWorkoutAction } from "./actions";

export default async function WorkoutDetails({ params }: PageProps<"/workouts/[id]">) {
  const { id } = await params;
  const currentUser = await requireUser();
  const workout = await getWorkoutForUser(id, currentUser.id);
  return <WorkoutDetailsClient key={workout.id} initialWorkout={workout} saveAction={saveWorkoutAction} startAction={startWorkoutAction} />;
}
