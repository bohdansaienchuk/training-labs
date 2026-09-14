"use client";

import Image from "next/image";
import { useId, useState } from "react";
import { SetAction } from "@/components/workout-controls";

const columns = ["Підхід", "Вага", "Од", "Повтори", "Запас"];
const previousSets = [
  [1, 80, "кг", 10, 1],
  [2, 84, "кг", 8, 1],
  [3, 82, "кг", 10, 1],
  [4, 80, "кг", 10, "max"],
];

function PreviousResults() {
  return (
    <div className="flex flex-col items-center gap-2 overflow-hidden rounded-12 bg-primary-300 p-2 text-[#000000]">
      <h3 className="type-body-l whitespace-nowrap text-center">Результати попереднього тренування</h3>
      <div role="table" aria-label="Результати попереднього тренування" className="flex w-full flex-col items-center gap-2 font-body text-[10px] leading-4 font-normal text-center">
        <div role="row" className="grid w-full grid-cols-5 gap-2 rounded-8 bg-primary-100 text-neutral-900">
          {columns.map((label) => <span role="columnheader" key={label}>{label}</span>)}
        </div>
        {previousSets.map((set) => (
          <div role="row" key={set[0]} className="grid h-5 w-[calc(100%+16px)] grid-cols-5 items-center gap-2 rounded-12 bg-primary-100">
            {set.map((value, index) => <span role="cell" key={index}>{value}</span>)}
          </div>
        ))}
      </div>
    </div>
  );
}

function CurrentSetRow({ number }: { number: number }) {
  return (
    <div role="row" className="grid h-10 grid-cols-5 items-center gap-2">
      <span role="cell" className="type-body-m text-center">{number}</span>
      {columns.slice(1).map((label, index) => (
        <div role="cell" key={label} className="min-w-0">
          <input
            aria-label={`${label}, підхід ${number}`}
            inputMode={index === 0 ? "decimal" : index === 2 ? "numeric" : "text"}
            className="type-body-l h-10 w-full min-w-0 rounded-8 border border-primary-500 bg-neutral-50 px-2 text-center text-[#000000] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
          />
        </div>
      ))}
    </div>
  );
}

export function ActiveExerciseCard({ name }: { name: string }) {
  const titleId = useId();
  const [sets, setSets] = useState([1, 2, 3, 4]);

  return (
    <article aria-labelledby={titleId} className="flex w-full shrink-0 flex-col gap-3 rounded-12 bg-neutral-900 p-4 text-neutral-50">
      <header className="flex items-center gap-2">
        <h2 id={titleId} className="type-heading-m min-w-0 flex-1">{name}</h2>
        <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center">
          <Image src="/icons/workout-details/ellipsis.svg" alt="" width={4} height={18} unoptimized />
        </span>
      </header>
      <p className="type-body-m text-[#ffffff]">Верх · 6 вправ · ~45 хвилин</p>
      <PreviousResults />
      <div role="table" aria-label={`Поточні підходи: ${name}`} className="flex flex-col gap-2">
        <div role="row" className="type-body-m grid grid-cols-5 gap-2 text-center">
          {columns.map((label) => <span role="columnheader" key={label}>{label}</span>)}
        </div>
        {sets.map((number) => <CurrentSetRow key={number} number={number} />)}
      </div>
      <div className="flex gap-3">
        <SetAction icon="plus" onClick={() => setSets((current) => [...current, current.length + 1])}>Додати підхід</SetAction>
        <SetAction icon="minus" disabled={sets.length === 1} onClick={() => setSets((current) => current.length > 1 ? current.slice(0, -1) : current)}>Видалити підхід</SetAction>
      </div>
    </article>
  );
}
