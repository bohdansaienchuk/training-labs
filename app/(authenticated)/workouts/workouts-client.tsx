"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { SearchField } from "@/components/search-field";
import { WorkoutCard } from "@/components/workout-card";
import { WorkoutListMenu, type WorkoutListAction } from "@/components/workout-list-menu";
import { matchesSearch } from "@/lib/search";
import type { WorkoutDeleteResult } from "@/lib/workout-delete";
import { pluralizeUk } from "@/lib/pluralize-uk";

type WorkoutListItem = {
  id: string;
  name: string;
  exerciseCount: number;
  setCount: number;
  repCount: number;
};

type WorkoutsClientProps = {
  workouts: WorkoutListItem[];
  deleteAction: (id: string) => Promise<WorkoutDeleteResult>;
};

function workoutSummary({ exerciseCount, setCount, repCount }: WorkoutListItem) {
  return [
    pluralizeUk(exerciseCount, { one: "вправа", few: "вправи", many: "вправ" }),
    pluralizeUk(setCount, { one: "підхід", few: "підходи", many: "підходів" }),
    pluralizeUk(repCount, { one: "повтор", few: "повтори", many: "повторів" }),
  ].join(" · ");
}

export function WorkoutsClient({ workouts, deleteAction }: WorkoutsClientProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [orderedWorkouts, setOrderedWorkouts] = useState(workouts);
  const [actionListOpen, setActionListOpen] = useState(false);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const workoutList = useRef<HTMLUListElement>(null);
  const deleteInFlight = useRef(false);

  const closeMenu = useCallback(() => {
    setActionListOpen(false);
    setSelectedWorkoutId(null);
    setActionError(null);
  }, []);

  const selectedIndex = orderedWorkouts.findIndex((workout) => workout.id === selectedWorkoutId);

  async function performAction(action: WorkoutListAction) {
    if (!selectedWorkoutId) return;
    if (action === "edit") {
      const id = selectedWorkoutId;
      closeMenu();
      router.push(`/workouts/${encodeURIComponent(id)}/edit`);
      return;
    }
    if (action === "up" || action === "down") {
      const direction = action === "up" ? -1 : 1;
      setOrderedWorkouts((current) => {
        const index = current.findIndex((workout) => workout.id === selectedWorkoutId);
        const target = index + direction;
        if (index < 0 || target < 0 || target >= current.length) return current;
        const reordered = [...current];
        [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
        return reordered;
      });
      return;
    }
    if (deleteInFlight.current) return;
    deleteInFlight.current = true;
    setDeleting(true);
    setActionError(null);
    try {
      const result = await deleteAction(selectedWorkoutId);
      if (!result.ok) {
        setActionError(result.code === "WORKOUT_HAS_ACTIVE_SESSION"
          ? "Неможливо видалити тренування, поки воно не завершене"
          : "Не вдалося видалити тренування");
        return;
      }
      const deletedId = result.value;
      setOrderedWorkouts((current) => current.filter((workout) => workout.id !== deletedId));
      closeMenu();
      trigger.current?.focus();
      router.refresh();
    } catch {
      setActionError("Не вдалося видалити тренування");
    } finally {
      deleteInFlight.current = false;
      setDeleting(false);
    }
  }

  const visibleWorkouts = orderedWorkouts.filter((workout) =>
    matchesSearch(workout.name, query),
  );

  return (
    <main onKeyDown={(event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMenu();
        trigger.current?.focus();
      }
    }} className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col gap-4 px-4 py-6">
      <header className="flex w-full shrink-0 items-center gap-2.5">
        <Link
          href="/"
          aria-label="На головну"
          className="flex size-6 shrink-0 items-center justify-center rounded-8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500"
        >
          <Image
            src="/icons/workouts/back.svg"
            alt=""
            width={24}
            height={24}
            unoptimized
          />
        </Link>

        <h1 className="type-heading-xl min-w-0 flex-1 text-center">
          Мої тренування
        </h1>
        <button ref={trigger} type="button" aria-label="Змінити список тренувань" aria-haspopup="menu" aria-expanded={actionListOpen}
          aria-controls={actionListOpen ? "workout-list-actions" : undefined}
          onClick={() => {
            if (actionListOpen) closeMenu();
            else { setActionError(null); setActionListOpen(true); }
          }}
          className="flex size-6 shrink-0 items-center justify-center rounded-8 focus-visible:outline-2 focus-visible:outline-primary-500">
          <Image src="/icons/workout-details/ellipsis.svg" alt="" width={4} height={18} unoptimized />
        </button>
        {actionListOpen && <WorkoutListMenu selected={selectedIndex !== -1} first={selectedIndex === 0} last={selectedIndex === orderedWorkouts.length - 1}
          deleting={deleting} anchor={trigger} workoutList={workoutList} onAction={(action) => { void performAction(action); }} onClose={closeMenu} />}
      </header>

      <SearchField
        placeholder="Знайти тренування"
        label="Пошук тренувань"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <Link
        href="/workouts/new"
        className="type-body-m flex items-center gap-1.5 p-2 text-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
      >
        <span
          aria-hidden="true"
          className="flex size-6 shrink-0 items-center justify-center"
        >
          <Image
            src="/icons/workouts/circle-plus.svg"
            alt=""
            width={22}
            height={22}
            unoptimized
          />
        </span>
        Створити тренування
      </Link>

      <ul ref={workoutList} className="flex flex-col gap-3" aria-label="Мої тренування">
        {visibleWorkouts.length === 0 && (
          <li role="status">Тренування не знайдено</li>
        )}

        {visibleWorkouts.map((workout) => (
          <WorkoutCard
            key={workout.id}
            id={workout.id}
            title={workout.name}
            subtitle={workoutSummary(workout)}
            selecting={actionListOpen}
            selected={selectedWorkoutId === workout.id}
            onSelect={() => setSelectedWorkoutId((current) => current === workout.id ? null : workout.id)}
          />
        ))}
      </ul>
      {actionError && <span role="alert" className="type-caption text-error">{actionError}</span>}
    </main>
  );
}
