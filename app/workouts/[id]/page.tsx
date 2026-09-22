import { getWorkout } from "@/lib/get-workout";
import WorkoutDetailsClient from "./workout-details-client";
import { saveWorkoutAction, startWorkoutAction } from "./actions";

export default async function WorkoutDetails({ params }: PageProps<"/workouts/[id]">) {
  const { id } = await params;
  const workout = await getWorkout(id);
  return <WorkoutDetailsClient key={workout.id} initialWorkout={workout} saveAction={saveWorkoutAction} startAction={startWorkoutAction} />;
}
