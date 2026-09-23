"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExerciseItem } from "@/components/exercise-item";

import { useWorkoutDraft } from "@/components/workout-draft-provider";
import type { Workout } from "@/lib/workout-template";
import { moveWorkoutExercise, orderedExercises, removeWorkoutExercise, workoutSummary } from "@/lib/workout-template";
import { WorkoutExerciseMenu } from "@/components/workout-exercise-menu";
import type { ActionResult } from "@/lib/active-workout";

export default function WorkoutDetailsClient({ initialWorkout, saveAction, startAction }: { initialWorkout: Workout; saveAction?: (draft: Workout) => Promise<Workout>; startAction?: (workoutId: string) => Promise<ActionResult<string>> }) {
  const router = useRouter();
  const { workout, updateWorkout, markSaved, isDirty } = useWorkoutDraft(initialWorkout);
  const id = workout.id;
  const [editing, setEditing] = useState(false);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [actionListOpen, setActionListOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const exerciseList = useRef<HTMLUListElement>(null);
  const startInFlight = useRef(false);
  const closeMenu = useCallback(() => {
    setActionListOpen(false);
    setSelectedExerciseId(null);
    setEditing(false);
  }, []);
  const exercises = orderedExercises(workout.exercises);
  const selectedIndex = exercises.findIndex((exercise) => exercise.id === selectedExerciseId);

  function performAction(action: "delete" | "up" | "down") {
    if (!selectedExerciseId) return;
    updateWorkout((current) => action === "delete" ? removeWorkoutExercise(current, selectedExerciseId) : moveWorkoutExercise(current, selectedExerciseId, action === "up" ? -1 : 1));
    if (action === "delete") {
      closeMenu();
      trigger.current?.focus();
    }
  }

  async function saveChanges() {
    if (!saveAction || saving) return;
    setSaving(true);
    setSaveError(false);
    try {
      markSaved(await saveAction(workout));
    } catch {
      setSaveError(true);
    } finally {
      setSaving(false);
    }
  }

  async function startWorkout() {
    if (!startAction || startInFlight.current) return;
    startInFlight.current = true;
    setStarting(true);
    setStartError(false);
    try {
      const result = await startAction(id);
      if (!result.ok) {
        setStartError(true);
        return;
      }
      router.push(`/workouts/${encodeURIComponent(id)}/active?session=${encodeURIComponent(result.value)}`);
    } catch {
      setStartError(true);
    } finally {
      startInFlight.current = false;
      setStarting(false);
    }
  }

  return (
    <main onKeyDown={(event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        trigger.current?.focus();
      }
    }} className="mx-auto flex h-dvh w-full max-w-[390px] flex-col items-center gap-16 overflow-hidden bg-neutral-950 px-4 py-6">
      <header className="flex w-full shrink-0 flex-col gap-3 text-[#ffffff]">
        <div className="relative flex w-full items-center gap-3">
          <Link href="/workouts" aria-label="До списку тренувань" className="flex size-6 shrink-0 items-center justify-center rounded-8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500">
            <Image src="/icons/workout-details/back.svg" alt="" width={22} height={22} unoptimized />
          </Link>
          <h1 className="type-heading-xl min-w-0 flex-1 text-center">{workout.name}</h1>
          <button ref={trigger} type="button" aria-label="Змінити тренування" aria-haspopup="menu" aria-expanded={actionListOpen} aria-controls={actionListOpen ? "workout-exercise-actions" : undefined}
            onClick={() => {
              if (actionListOpen) closeMenu();
              else { setEditing(true); setActionListOpen(true); }
            }}
            className="flex size-6 shrink-0 items-center justify-center rounded-8 focus-visible:outline-2 focus-visible:outline-primary-500">
            <Image src="/icons/workout-details/ellipsis.svg" alt="" width={4} height={18} unoptimized />
          </button>
          {actionListOpen && <WorkoutExerciseMenu selected={selectedIndex !== -1} first={selectedIndex === 0} last={selectedIndex === exercises.length - 1} anchor={trigger} exerciseList={exerciseList} onAction={performAction} onClose={closeMenu} />}
        </div>
        <p className="type-body-m text-center">{workoutSummary(workout)}</p>
      </header>
      <ul ref={exerciseList} aria-label="Вправи тренування" className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-y-auto [scrollbar-width:none]">
        {exercises.map((exercise) => <ExerciseItem key={exercise.id} name={exercise.name} sets={exercise.plannedSets.length} editing={editing} selected={selectedExerciseId === exercise.id}
          onSelect={() => setSelectedExerciseId((current) => current === exercise.id ? null : exercise.id)} />)}
      </ul>
      <footer className="flex w-full shrink-0 flex-col items-center gap-3 p-2.5">
        <Link href={`/workouts/${encodeURIComponent(id)}/edit`} className="type-button inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-12 border border-neutral-700 px-6 py-3.5 text-neutral-50 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500">
          Редагувати тренування
        </Link>
        <button type="button" onClick={saveChanges} disabled={saving || !saveAction} aria-label="Зберегти зміни" data-unsaved={isDirty}
          className="type-button inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-12 border border-neutral-700 px-6 py-3.5 text-neutral-50 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500">
          Зберегти зміни
        </button>
        <button type="button" onClick={() => { void startWorkout(); }} disabled={starting || !startAction} className="type-button inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-12 bg-primary-500 px-6 py-3.5 text-neutral-950 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500">
          Почати тренування
        </button>
        {saveError && <span role="alert" className="type-caption text-error">Не вдалося зберегти зміни</span>}
        {startError && <span role="alert" className="type-caption text-error">Не вдалося почати тренування</span>}
      </footer>
    </main>
  );
}
