"use client";

import { useId, useState } from "react";
import { SetAction, WorkoutIcon } from "@/components/workout-controls";

function SetRow({ number }: { number: number }) {
  return (
    <div role="row" className="grid grid-cols-4 items-center gap-2">
      <span role="cell" className="type-body-l text-center text-primary-500">{number}</span>
      {[
        { label: "Вага", mode: "decimal" },
        { label: "Од", mode: "text" },
        { label: "Повтори", mode: "numeric" },
      ].map(({ label, mode }) => (
        <div role="cell" key={label} className="flex min-w-0 justify-center">
          <input
            aria-label={`${label}, підхід ${number}`}
            inputMode={mode as "decimal" | "text" | "numeric"}
            className="type-body-l h-10 w-16 min-w-0 max-w-full rounded-8 border border-primary-500 bg-neutral-50 px-2 text-center text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
          />
        </div>
      ))}
    </div>
  );
}

export function SelectedExerciseCard({ name, onRemove }: { name: string; onRemove: () => void }) {
  const titleId = useId();
  const [sets, setSets] = useState([1]);
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
        {sets.map((number) => <SetRow key={number} number={number} />)}
      </div>
      <div className="flex gap-3">
        <SetAction icon="plus" onClick={() => setSets((current) => [...current, (current.at(-1) ?? 0) + 1])}>Додати підхід</SetAction>
        <SetAction icon="minus" onClick={() => setSets((current) => current.slice(0, -1))}>Видалити підхід</SetAction>
      </div>
    </section>
  );
}
