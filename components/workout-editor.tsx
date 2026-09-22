"use client";

import { useRef, useState } from "react";
import { newPlannedSet, normalizeExercisePositions, orderedExercises, removeWorkoutExercise, type Workout } from "@/lib/workout-template";
import { SearchField } from "@/components/search-field";
import { SelectedExerciseCard } from "@/components/selected-exercise-card";
import { WorkoutIcon } from "@/components/workout-controls";

import { EXERCISE_CATALOG, type CatalogExercise } from "@/lib/exercise-catalog";
import { matchesSearch, normalizeSearch } from "@/lib/search";

function ExerciseSearchItem({ exerciseName, onAdd }: { exerciseName: string; onAdd: () => void }) {
  return (
    <button type="button" onClick={onAdd} aria-label={`Додати вправу ${exerciseName}`} className="type-body-m flex w-full items-center gap-3 rounded-12 bg-primary-100 px-3 py-2.5 text-left text-[#000000] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500">
      <span className="min-w-0 flex-1">{exerciseName}</span>
      <WorkoutIcon name="plus-dark" />
    </button>
  );
}

export function WorkoutEditor({ workout, onChange, catalog = EXERCISE_CATALOG }: { workout: Workout; onChange: (update: (current: Workout) => Workout) => void; catalog?: readonly CatalogExercise[] }) {
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInput = useRef<HTMLInputElement>(null);
  const available = catalog.filter((exercise) =>
    matchesSearch(exercise.name, query) && !workout.exercises.some((added) => added.exerciseId === exercise.id));
  const showResults = searchOpen && normalizeSearch(query).length > 0;

  function addExercise(catalogExercise: CatalogExercise) {
    const exercise = { id: crypto.randomUUID(), position: 0, exerciseId: catalogExercise.id, name: catalogExercise.name, plannedSets: [newPlannedSet(crypto.randomUUID(), 1)] };
    onChange((current) => current.exercises.some((added) => added.exerciseId === catalogExercise.id)
      ? current
      : { ...current, exercises: normalizeExercisePositions([...current.exercises, exercise]) });
    searchInput.current?.focus();
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 [scrollbar-width:none]">
      <label className="flex shrink-0 flex-col gap-1.5">
        <span className="type-heading-l">Назва тренування</span>
        <input value={workout.name} onChange={(event) => onChange((current) => ({ ...current, name: event.target.value }))} placeholder="Назва тренування" className="type-placeholder h-12 w-full rounded-8 border border-neutral-800 bg-primary-300 px-4 text-neutral-950 placeholder:text-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500" />
      </label>
      <section aria-labelledby="exercises-heading" className="flex shrink-0 flex-col gap-3 pb-1">
        <h2 id="exercises-heading" className="type-heading-m text-[#ffffff]">Вправи</h2>
        <div className="flex flex-col gap-3" onFocus={() => setSearchOpen(true)}
          onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setSearchOpen(false); }}
          onKeyDown={(event) => { if (event.key === "Escape") { event.preventDefault(); searchInput.current?.focus(); setSearchOpen(false); } }}>
          <SearchField ref={searchInput} placeholder="Знайти вправу" label="Пошук вправ" value={query}
            onChange={(event) => { setQuery(event.target.value); setSearchOpen(true); }}
            aria-controls={showResults ? "exercise-search-results" : undefined} />
          {showResults && <ul id="exercise-search-results" aria-label="Результати пошуку вправ" className="flex flex-col gap-3">
            {available.length === 0 && <li role="status">Вправи не знайдено</li>}
            {available.map((exercise) => <li key={exercise.id}><ExerciseSearchItem exerciseName={exercise.name} onAdd={() => addExercise(exercise)} /></li>)}
          </ul>}
        </div>
        {orderedExercises(workout.exercises).map((exercise) => (
          <SelectedExerciseCard key={exercise.id} exercise={exercise}
            onSetsChange={(plannedSets) => onChange((current) => ({ ...current, exercises: current.exercises.map((item) => item.id === exercise.id ? { ...item, plannedSets } : item) }))}
            onRemove={() => onChange((current) => removeWorkoutExercise(current, exercise.id))} />
        ))}
      </section>
    </div>
  );
}
