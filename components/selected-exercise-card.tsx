"use client";

import { useId } from "react";
import { SetAction, WorkoutIcon } from "@/components/workout-controls";
import { WeightUnitSelect } from "@/components/weight-unit-select";
import { newPlannedSet, nextSetPosition, type PlannedSet, type WorkoutExercise } from "@/lib/workout-template";

function SetRow({ set, onChange }: { set: PlannedSet; onChange: (set: PlannedSet) => void }) {
  return (
    <div role="row" className="grid grid-cols-4 items-center gap-2">
      <span role="cell" className="type-body-l text-center text-primary-500">{set.position}</span>
      {[
        { label: "Вага", field: "weight" },
        { label: "Од", field: "weightUnit" },
        { label: "Повтори", field: "reps" },
      ].map(({ label, field }) => (
        <div role="cell" key={label} className="flex min-w-0 justify-center">
          {field === "weightUnit" ? (
            <div className="w-16 min-w-0 max-w-full">
              <WeightUnitSelect label={`${label}, підхід ${set.position}`} value={set.weightUnit} onChange={(weightUnit) => onChange({ ...set, weightUnit })} />
            </div>
          ) : <input
            aria-label={`${label}, підхід ${set.position}`}
            type="number" min={field === "weight" ? 0 : 1} step={field === "weight" ? "any" : 1}
            inputMode={field === "weight" ? "decimal" : "numeric"}
            value={(field === "weight" ? set.weight : set.reps) ?? ""}
            onChange={(event) => onChange({ ...set, [field]: Number.isNaN(event.target.valueAsNumber) ? null : event.target.valueAsNumber })}
            className="type-body-l [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none h-10 w-16 min-w-0 max-w-full rounded-8 border border-primary-500 bg-neutral-50 px-2 text-center text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
          />}
        </div>
      ))}
    </div>
  );
}

export function SelectedExerciseCard({ exercise, onSetsChange, onRemove }: { exercise: WorkoutExercise; onSetsChange: (sets: PlannedSet[]) => void; onRemove: () => void }) {
  const titleId = useId();
  const { name, plannedSets: sets } = exercise;
  return (
    <section aria-labelledby={titleId} className="flex flex-col gap-3 rounded-12 bg-neutral-900 p-4">
      <header className="flex items-center gap-2">
        <h3 id={titleId} className="type-body-l min-w-0 flex-1 text-primary-500">{name}</h3>
        <button type="button" onClick={onRemove} aria-label={`Видалити вправу ${name}`} className="rounded-8 focus-visible:outline-2 focus-visible:outline-primary-500">
          <WorkoutIcon name="trash" />
        </button>
      </header>
      <div role="table" aria-label={`Підходи: ${name}`} className="flex flex-col gap-2">
        <div role="row" className="type-body-m grid grid-cols-4 gap-2.5 text-center text-primary-500">
          {["Підхід", "Вага", "Од", "Повтори"].map((label) => <span role="columnheader" key={label}>{label}</span>)}
        </div>
        {sets.map((set) => <SetRow key={set.id} set={set} onChange={(updated) => onSetsChange(sets.map((item) => item.id === updated.id ? updated : item))} />)}
      </div>
      <div className="flex gap-3">
        <SetAction icon="plus" onClick={() => onSetsChange([...sets, newPlannedSet(crypto.randomUUID(), nextSetPosition(sets), sets.at(-1)?.weightUnit)])}>Додати підхід</SetAction>
        <SetAction icon="minus" onClick={() => onSetsChange(sets.slice(0, -1))}>Видалити підхід</SetAction>
      </div>
    </section>
  );
}
