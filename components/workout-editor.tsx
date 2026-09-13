"use client";

import { useRef, useState } from "react";
import { SearchField } from "@/components/search-field";
import { SelectedExerciseCard } from "@/components/selected-exercise-card";
import { WorkoutIcon } from "@/components/workout-controls";

const exerciseName = "Жим штанги лежачи";

function ExerciseSearchItem({ onAdd }: { onAdd: () => void }) {
  return (
    <button type="button" onClick={onAdd} aria-label={`Додати вправу ${exerciseName}`} className="type-body-m flex w-full items-center gap-3 rounded-12 bg-primary-100 px-3 py-2.5 text-left text-[#000000] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500">
      <span className="min-w-0 flex-1">{exerciseName}</span>
      <WorkoutIcon name="plus-dark" />
    </button>
  );
}

export function WorkoutEditor() {
  const [exercises, setExercises] = useState([1]);
  const nextId = useRef(2);
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 [scrollbar-width:none]">
      <label className="flex shrink-0 flex-col gap-1.5">
        <span className="type-heading-l">Назва тренування</span>
        <input placeholder="Назва тренування" className="type-placeholder h-12 w-full rounded-8 border border-neutral-800 bg-primary-300 px-4 text-neutral-950 placeholder:text-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500" />
      </label>
      <section aria-labelledby="exercises-heading" className="flex shrink-0 flex-col gap-3 pb-1">
        <h2 id="exercises-heading" className="type-heading-m text-[#ffffff]">Вправи</h2>
        <SearchField placeholder="Знайти вправу" label="Пошук вправ" />
        <ExerciseSearchItem onAdd={() => {
          const id = nextId.current++;
          setExercises((current) => [...current, id]);
        }} />
        {exercises.map((id) => (
          <SelectedExerciseCard key={id} name={exerciseName} onRemove={() => setExercises((current) => current.filter((item) => item !== id))} />
        ))}
      </section>
    </div>
  );
}
