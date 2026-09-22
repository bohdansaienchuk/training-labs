"use client";

import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction } from "react";
import type { Workout } from "@/lib/workout-template";

const WorkoutDraftContext = createContext<{
  draft: Workout | null;
  setDraft: Dispatch<SetStateAction<Workout | null>>;
  saved: Workout | null;
  setSaved: Dispatch<SetStateAction<Workout | null>>;
} | null>(null);

// Scoped by the [id] layout. No seeds, storage or writes: a reload restores DB data.
export function WorkoutDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState<Workout | null>(null);
  const [saved, setSaved] = useState<Workout | null>(null);
  return <WorkoutDraftContext.Provider value={{ draft, setDraft, saved, setSaved }}>{children}</WorkoutDraftContext.Provider>;
}

export function useWorkoutDraft(initialWorkout: Workout) {
  const context = useContext(WorkoutDraftContext);
  if (!context) throw new Error("WorkoutDraftProvider is required");
  const { draft, setDraft, saved, setSaved } = context;
  const workout = draft?.id === initialWorkout.id ? draft : initialWorkout;
  const baseline = saved?.id === initialWorkout.id ? saved : initialWorkout;
  return {
    workout,
    isDirty: JSON.stringify(workout) !== JSON.stringify(baseline),
    updateWorkout: (update: (workout: Workout) => Workout) => setDraft((current) =>
      update(current?.id === initialWorkout.id ? current : saved?.id === initialWorkout.id ? saved : initialWorkout)),
    markSaved: (workout: Workout) => { setSaved(workout); setDraft(workout); },
  };
}
