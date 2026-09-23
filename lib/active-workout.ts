import type { WeightUnit } from "./weight-unit";
import { pluralizeUk } from "./pluralize-uk";

export type PerformedSetInput = {
  id: string;
  sessionExerciseId: string;
  weight: number | null;
  weightUnit: WeightUnit;
  reps: number | null;
  rir: string;
};

export type ActivePerformedSet = PerformedSetInput & {
  setNumber: number;
  completed: boolean;
};

export type PreviousPerformedSet = {
  setNumber: number;
  weight: number | null;
  weightUnit: WeightUnit;
  reps: number | null;
  rir: number | null;
};

export type ActiveSessionExercise = {
  id: string;
  exerciseId: string;
  name: string;
  category: string | null;
  position: number;
  sets: ActivePerformedSet[];
  previousSets: PreviousPerformedSet[];
};

export type ActiveWorkoutSession = {
  id: string;
  workoutId: string;
  workoutName: string;
  startedAt: string;
  exercises: ActiveSessionExercise[];
};

export type CompletedWorkoutSession = {
  id: string;
  workoutId: string | null;
  workoutName: string;
  startedAt: string;
  completedAt: string;
  exerciseCount: number;
  setCount: number;
};

export type SetValidation = {
  weight: boolean;
  reps: boolean;
  rir: boolean;
  valid: boolean;
};

export type ActionResult<T> = { ok: true; value: T } | { ok: false; error: string; code?: "incomplete" };

export function validatePerformedSet(input: PerformedSetInput): SetValidation {
  const weight = input.weight !== null && Number.isFinite(input.weight) && input.weight >= 0 && weightToKilograms(input.weight, input.weightUnit) <= 9999.99;
  const reps = input.reps !== null && Number.isInteger(input.reps) && input.reps >= 0 && input.reps <= 2147483647;
  const rir = /^\d+$/.test(input.rir) && Number.isSafeInteger(Number(input.rir)) && Number(input.rir) <= 2147483647;
  return { weight, reps, rir, valid: weight && reps && rir };
}

export function weightToKilograms(weight: number, unit: WeightUnit): number {
  return unit === "lb" ? weight / 2.2046226218 : weight;
}

export function convertWeight(weight: number, from: WeightUnit, to: WeightUnit): number {
  if (from === to) return weight;
  const kilograms = weightToKilograms(weight, from);
  return Number((to === "lb" ? kilograms * 2.2046226218 : kilograms).toFixed(2));
}

export function elapsedTimer(startedAt: string, now = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - new Date(startedAt).getTime()) / 1000));
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function completedDurationMinutes(startedAt: string, completedAt: string): number {
  return Math.max(0, Math.floor((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 60_000));
}

export function completedWorkoutBackHref(workoutId: string | null): string {
  return workoutId ? `/workouts/${encodeURIComponent(workoutId)}` : "/workouts";
}

export function countLabel(count: number, labels: [string, string, string]): string {
  return pluralizeUk(count, { one: labels[0], few: labels[1], many: labels[2] });
}
