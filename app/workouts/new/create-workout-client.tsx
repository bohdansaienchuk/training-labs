"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { WorkoutEditor } from "@/components/workout-editor";
import { PrimaryButton, WorkoutIcon } from "@/components/workout-controls";
import type { CatalogExercise } from "@/lib/exercise-catalog";
import { createWorkoutDraft } from "@/lib/mock-workouts";
import type { Workout } from "@/lib/workout-template";

export default function CreateWorkoutClient({ catalog, createAction }: {
  catalog: readonly CatalogExercise[];
  createAction: (draft: Workout) => Promise<Workout>;
}) {
  const router = useRouter();
  const [workout, setWorkout] = useState(createWorkoutDraft);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const submissionInFlight = useRef(false);

  async function handleCreateWorkout() {
    if (submissionInFlight.current) return;
    submissionInFlight.current = true;
    setSaving(true);
    setSaveError(false);
    try {
      await createAction(workout);
      router.push("/workouts");
    } catch {
      submissionInFlight.current = false;
      setSaving(false);
      setSaveError(true);
    }
  }

  return (
    <main className="mx-auto flex h-dvh min-h-[600px] w-full max-w-[390px] flex-col gap-16 px-4 py-6">
      <header className="flex shrink-0 items-center gap-3 px-4 py-2.5">
        <Link href="/workouts" aria-label="Назад до моїх тренувань" className="shrink-0 rounded-8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500">
          <WorkoutIcon name="back" />
        </Link>
        <h1 className="type-heading-xl min-w-0 flex-1 text-center text-[#ffffff]">Створити тренування</h1>
      </header>
      <WorkoutEditor workout={workout} onChange={setWorkout} catalog={catalog} />
      <footer className="flex shrink-0 flex-col items-center gap-3 p-2.5">
        <PrimaryButton onClick={handleCreateWorkout} disabled={saving}>Зберегти тренування</PrimaryButton>
        {saveError && <span role="alert" className="type-caption text-error">Не вдалося зберегти тренування</span>}
      </footer>
    </main>
  );
}
