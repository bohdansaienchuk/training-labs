import type { WeightUnit } from "./weight-unit";

export type PlannedSet = {
  id: string;
  position: number;
  weight: number | null;
  weightUnit: WeightUnit;
  reps: number | null;
  rir?: number | null;
};

export type WorkoutExercise = {
  id: string;
  exerciseId: string;
  position: number;
  name: string;
  category?: string | null;
  plannedSets: PlannedSet[];
};

export type Workout = {
  id: string;
  name: string;
  focus?: string;
  estimatedMinutes?: number;
  exercises: WorkoutExercise[];
};

// Active inputs are independent of the template, even when prefilled from it.
export type ActiveSet = {
  id: string;
  position: number;
  planned: PlannedSet | null;
  actualWeight: number | null;
  actualWeightUnit: WeightUnit;
  actualReps: number | null;
  reserve: string;
};

export function newPlannedSet(id: string, position: number, weightUnit: WeightUnit = "kg"): PlannedSet {
  return { id, position, weight: null, weightUnit, reps: null };
}

export function nextSetPosition(sets: readonly { position: number }[]): number {
  return Math.max(0, ...sets.map((set) => set.position)) + 1;
}

export function initializeActiveSets(plannedSets: readonly PlannedSet[]): ActiveSet[] {
  return [...plannedSets].sort((a, b) => a.position - b.position).map((planned) => ({
    id: planned.id,
    position: planned.position,
    planned: { ...planned },
    actualWeight: planned.weight,
    actualWeightUnit: planned.weightUnit,
    actualReps: null,
    reserve: "",
  }));
}

export function newActiveSet(id: string, position: number, weightUnit: WeightUnit = "kg"): ActiveSet {
  return { id, position, planned: null, actualWeight: null, actualWeightUnit: weightUnit, actualReps: null, reserve: "" };
}

export function workoutSummary(workout: Workout): string {
  const count = workout.exercises.length;
  const plural = new Intl.PluralRules("uk").select(count);
  const label = plural === "one" ? "вправа" : plural === "few" ? "вправи" : "вправ";
  return [workout.focus, `${count} ${label}`, workout.estimatedMinutes ? `~${workout.estimatedMinutes} хвилин` : null].filter(Boolean).join(" · ");
}

// Positions are one-based and contiguous; stable IDs and prescriptions survive edits.
export function orderedExercises(exercises: readonly WorkoutExercise[]): WorkoutExercise[] {
  return [...exercises].sort((a, b) => a.position - b.position);
}

export function normalizeExercisePositions(exercises: readonly WorkoutExercise[]): WorkoutExercise[] {
  return exercises.map((exercise, index) => exercise.position === index + 1 ? exercise : { ...exercise, position: index + 1 });
}

export function moveWorkoutExercise(workout: Workout, exerciseId: string, direction: -1 | 1): Workout {
  const exercises = orderedExercises(workout.exercises);
  const index = exercises.findIndex((exercise) => exercise.id === exerciseId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= exercises.length) return workout;
  [exercises[index], exercises[target]] = [exercises[target], exercises[index]];
  return { ...workout, exercises: normalizeExercisePositions(exercises) };
}

export function removeWorkoutExercise(workout: Workout, exerciseId: string): Workout {
  if (!workout.exercises.some((exercise) => exercise.id === exerciseId)) return workout;
  return { ...workout, exercises: normalizeExercisePositions(orderedExercises(workout.exercises).filter((exercise) => exercise.id !== exerciseId)) };
}
