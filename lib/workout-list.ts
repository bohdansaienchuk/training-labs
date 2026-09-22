export type WorkoutListRecord = {
  id: number;
  name: string;
  exercises: { _count: { sets: number } }[];
};

export function workoutListItems(workouts: readonly WorkoutListRecord[]) {
  return workouts.map((workout) => ({
    id: String(workout.id),
    name: workout.name,
    exerciseCount: workout.exercises.length,
    setCount: workout.exercises.reduce((total, exercise) => total + exercise._count.sets, 0),
  }));
}
