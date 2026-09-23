"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActiveExerciseCard } from "@/components/active-exercise-card";
import { WorkoutExerciseMenu } from "@/components/workout-exercise-menu";
import { elapsedTimer, validatePerformedSet, type ActionResult, type ActivePerformedSet, type ActiveWorkoutSession, type PerformedSetInput } from "@/lib/active-workout";

type ActiveActions = {
  saveSetAction: (workoutId: string, sessionId: string, input: PerformedSetInput) => Promise<ActionResult<{ completed: boolean }>>;
  addSetAction: (workoutId: string, sessionId: string, sessionExerciseId: string, expectedLastSetId: string) => Promise<ActionResult<{ id: string; setNumber: number }>>;
  removeSetAction: (workoutId: string, sessionId: string, sessionExerciseId: string, setId: string) => Promise<ActionResult<boolean>>;
  moveExerciseAction: (workoutId: string, sessionId: string, sessionExerciseId: string, direction: -1 | 1) => Promise<ActionResult<string[]>>;
  deleteExerciseAction: (workoutId: string, sessionId: string, sessionExerciseId: string) => Promise<ActionResult<string[]>>;
  finishAction: (workoutId: string, sessionId: string, inputs: PerformedSetInput[]) => Promise<ActionResult<string>>;
};

function inputFor(set: ActivePerformedSet): PerformedSetInput {
  return { id: set.id, sessionExerciseId: set.sessionExerciseId, weight: set.weight, weightUnit: set.weightUnit, reps: set.reps, rir: set.rir };
}

export default function ActiveWorkoutClient({ initialSession, initialNow, saveSetAction, addSetAction, removeSetAction, moveExerciseAction, deleteExerciseAction, finishAction }: { initialSession: ActiveWorkoutSession; initialNow: number } & ActiveActions) {
  const router = useRouter();
  const [session, setSession] = useState(initialSession);
  const [now, setNow] = useState(initialNow);
  const [validateAll, setValidateAll] = useState(false);
  const [saveErrors, setSaveErrors] = useState<Set<string>>(() => new Set());
  const [actionError, setActionError] = useState("");
  const [mutatingExerciseId, setMutatingExerciseId] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);
  const [finishing, setFinishing] = useState(false);
  const finishInFlight = useRef(false);
  const exerciseMutationInFlight = useRef(false);
  const menuTrigger = useRef<HTMLButtonElement>(null);
  const exerciseList = useRef<HTMLElement>(null);
  const saveTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const saveQueues = useRef(new Map<string, Promise<void>>());
  const workoutPath = `/workouts/${encodeURIComponent(session.workoutId)}`;
  const selectedExerciseIndex = session.exercises.findIndex((exercise) => exercise.id === selectedExerciseId);
  const closeMenu = useCallback(() => {
    setSelectedExerciseId(null);
  }, []);

  useEffect(() => {
    const catchUp = setTimeout(() => setNow(Date.now()), 0);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearTimeout(catchUp);
      clearInterval(timer);
    };
  }, []);

  useEffect(() => () => {
    for (const timer of saveTimers.current.values()) clearTimeout(timer);
    saveTimers.current.clear();
  }, []);

  async function persistSet(set: ActivePerformedSet) {
    const result = await saveSetAction(session.workoutId, session.id, inputFor(set));
    setSaveErrors((current) => {
      const next = new Set(current);
      if (result.ok) next.delete(set.id);
      else next.add(set.id);
      return next;
    });
    if (result.ok) {
      setSession((current) => ({ ...current, exercises: current.exercises.map((exercise) => ({
        ...exercise,
        sets: exercise.sets.map((item) => item.id === set.id ? { ...item, completed: result.value.completed } : item),
      })) }));
    }
  }

  function queueSetSave(set: ActivePerformedSet) {
    const previous = saveQueues.current.get(set.id) ?? Promise.resolve();
    const queued = previous.catch(() => undefined).then(() => persistSet(set)).finally(() => {
      if (saveQueues.current.get(set.id) === queued) saveQueues.current.delete(set.id);
    });
    saveQueues.current.set(set.id, queued);
  }

  function updateSet(exerciseId: string, updated: ActivePerformedSet, immediate = false) {
    const set = { ...updated, completed: validatePerformedSet(updated).valid };
    setSession((current) => ({ ...current, exercises: current.exercises.map((exercise) => exercise.id === exerciseId ? {
      ...exercise,
      sets: exercise.sets.map((item) => item.id === set.id ? set : item),
    } : exercise) }));
    const existing = saveTimers.current.get(set.id);
    if (existing) clearTimeout(existing);
    if (immediate) {
      saveTimers.current.delete(set.id);
      queueSetSave(set);
    } else {
      saveTimers.current.set(set.id, setTimeout(() => {
        saveTimers.current.delete(set.id);
        queueSetSave(set);
      }, 400));
    }
  }

  async function addSet(exerciseId: string) {
    if (mutatingExerciseId) return;
    setMutatingExerciseId(exerciseId);
    setActionError("");
    try {
      const exercise = session.exercises.find((item) => item.id === exerciseId);
      const lastSetId = exercise?.sets.at(-1)?.id;
      if (!lastSetId) return;
      const result = await addSetAction(session.workoutId, session.id, exerciseId, lastSetId);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      setSession((current) => ({ ...current, exercises: current.exercises.map((exercise) => exercise.id === exerciseId ? {
        ...exercise,
        sets: exercise.sets.some((set) => set.id === result.value.id) ? exercise.sets : [...exercise.sets, {
          id: result.value.id, sessionExerciseId: exerciseId, setNumber: result.value.setNumber,
          weight: null, weightUnit: exercise.sets.at(-1)?.weightUnit ?? "kg", reps: null, rir: "", completed: false,
        }],
      } : exercise) }));
    } finally {
      setMutatingExerciseId(null);
    }
  }

  async function removeSet(exerciseId: string, setId: string) {
    if (mutatingExerciseId) return;
    setMutatingExerciseId(exerciseId);
    setActionError("");
    try {
      const result = await removeSetAction(session.workoutId, session.id, exerciseId, setId);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      if (result.value) setSession((current) => ({ ...current, exercises: current.exercises.map((exercise) => exercise.id === exerciseId ? {
        ...exercise,
        sets: exercise.sets.filter((set) => set.id !== setId),
      } : exercise) }));
    } finally {
      setMutatingExerciseId(null);
    }
  }

  function applyExerciseOrder(exerciseIds: string[]) {
    setSession((current) => {
      const byId = new Map(current.exercises.map((exercise) => [exercise.id, exercise]));
      const exercises = exerciseIds.flatMap((id, index) => {
        const exercise = byId.get(id);
        return exercise ? [{ ...exercise, position: index + 1 }] : [];
      });
      return { ...current, exercises };
    });
  }

  async function performExerciseAction(action: "delete" | "up" | "down") {
    if (!selectedExerciseId || exerciseMutationInFlight.current) return;
    exerciseMutationInFlight.current = true;
    setMutatingExerciseId(selectedExerciseId);
    setActionError("");
    try {
      if (action === "delete") {
        const exercise = session.exercises.find((item) => item.id === selectedExerciseId);
        for (const set of exercise?.sets ?? []) {
          const timer = saveTimers.current.get(set.id);
          if (timer) clearTimeout(timer);
          saveTimers.current.delete(set.id);
          const queued = saveQueues.current.get(set.id);
          if (queued) await queued;
        }
        const result = await deleteExerciseAction(session.workoutId, session.id, selectedExerciseId);
        if (!result.ok) {
          setActionError(result.error);
          return;
        }
        applyExerciseOrder(result.value);
        closeMenu();
        menuTrigger.current?.focus();
        return;
      }
      const result = await moveExerciseAction(session.workoutId, session.id, selectedExerciseId, action === "up" ? -1 : 1);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      applyExerciseOrder(result.value);
    } finally {
      exerciseMutationInFlight.current = false;
      setMutatingExerciseId(null);
    }
  }

  async function finishWorkout() {
    if (finishInFlight.current) return;
    const sets = session.exercises.flatMap((exercise) => exercise.sets);
    const firstInvalid = sets.find((set) => !validatePerformedSet(set).valid);
    if (sets.length === 0 || firstInvalid) {
      setValidateAll(true);
      requestAnimationFrame(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    for (const timer of saveTimers.current.values()) clearTimeout(timer);
    saveTimers.current.clear();
    finishInFlight.current = true;
    setFinishing(true);
    setActionError("");
    try {
      await Promise.all(saveQueues.current.values());
      const result = await finishAction(session.workoutId, session.id, sets.map(inputFor));
      if (!result.ok) {
        if (result.code === "incomplete") setValidateAll(true);
        setActionError(result.error);
        return;
      }
      router.push(`${workoutPath}/completed?session=${encodeURIComponent(result.value)}`);
    } catch {
      setActionError("Не вдалося завершити тренування");
    } finally {
      finishInFlight.current = false;
      setFinishing(false);
    }
  }

  return (
    <main className="mx-auto flex h-dvh w-full max-w-[390px] flex-col gap-4 overflow-hidden bg-neutral-950 px-4 py-6">
      <header className="relative flex w-full shrink-0 items-center justify-between text-[#ffffff]">
        <Link href={workoutPath} aria-label="До деталей тренування" className="flex size-6 shrink-0 items-center justify-center rounded-8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500">
          <Image src="/icons/workout-details/back.svg" alt="" width={22} height={22} unoptimized />
        </Link>
        <h1 className="type-heading-xl pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap text-center">{session.workoutName}</h1>
        <span aria-label="Тривалість тренування" className="type-body-l shrink-0 whitespace-nowrap text-right tabular-nums">{elapsedTimer(session.startedAt, now)}</span>
      </header>
      <section ref={exerciseList} aria-label="Вправи активного тренування" tabIndex={0} className="flex min-h-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto p-2.5 [scrollbar-width:none] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-500">
        {session.exercises.map((exercise) => <ActiveExerciseCard key={exercise.id} exercise={exercise} validate={validateAll}
          saveErrors={saveErrors} mutating={mutatingExerciseId === exercise.id} menuOpen={selectedExerciseId === exercise.id}
          onMenuToggle={(exerciseId, trigger) => {
            if (selectedExerciseId === exerciseId) closeMenu();
            else { menuTrigger.current = trigger; setSelectedExerciseId(exerciseId); }
          }} onSetChange={updateSet}
          onAddSet={(exerciseId) => { void addSet(exerciseId); }} onRemoveSet={(exerciseId, setId) => { void removeSet(exerciseId, setId); }} />)}
      </section>
      {selectedExerciseIndex !== -1 && <WorkoutExerciseMenu key={selectedExerciseId} selected first={selectedExerciseIndex === 0}
        last={selectedExerciseIndex === session.exercises.length - 1} busy={mutatingExerciseId === selectedExerciseId}
        menuId="active-exercise-actions" selectionSelector="[data-active-exercise-menu-trigger]" anchor={menuTrigger}
        exerciseList={exerciseList} onAction={(action) => { void performExerciseAction(action); }} onClose={closeMenu} />}
      <footer className="flex w-full shrink-0 flex-col items-center gap-2 bg-neutral-950 p-2.5">
        {actionError && <span role="alert" className="type-caption text-error">{actionError}</span>}
        <button type="button" onClick={() => { void finishWorkout(); }} disabled={finishing} className="type-button inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-12 bg-primary-500 px-6 py-3.5 text-neutral-950 disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500">
          Завершити тренування
        </button>
      </footer>
    </main>
  );
}
