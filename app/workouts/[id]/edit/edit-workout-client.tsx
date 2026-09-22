"use client";

import Link from "next/link";
import { WorkoutEditor } from "@/components/workout-editor";
import { WorkoutIcon } from "@/components/workout-controls";
import { useWorkoutDraft } from "@/components/workout-draft-provider";
import type { CatalogExercise } from "@/lib/exercise-catalog";
import type { Workout } from "@/lib/workout-template";

export default function EditWorkoutClient({ initialWorkout, catalog }: { initialWorkout: Workout; catalog: readonly CatalogExercise[] }) {
  const { workout, updateWorkout } = useWorkoutDraft(initialWorkout);
  const detailsPath = `/workouts/${encodeURIComponent(workout.id)}`;

  return (
    <main className="mx-auto flex h-dvh min-h-[600px] w-full max-w-[390px] flex-col gap-16 px-4 py-6">
      <header className="flex shrink-0 items-center gap-3 px-4 py-2.5">
        <Link href={detailsPath} aria-label="Назад до деталей тренування" className="shrink-0 rounded-8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500">
          <WorkoutIcon name="back" />
        </Link>
        <h1 className="type-heading-xl min-w-0 flex-1 text-center text-[#ffffff]">Редагувати тренування</h1>
      </header>
      <WorkoutEditor workout={workout} onChange={updateWorkout} catalog={catalog} />
      <footer className="flex shrink-0 justify-center p-2.5">
        <Link href={detailsPath} className="type-button inline-flex min-h-12 items-center justify-center rounded-12 bg-primary-500 px-6 py-3.5 text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500">
          Зберегти тренування
        </Link>
      </footer>
    </main>
  );
}
