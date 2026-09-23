"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { ExerciseListItem } from "@/components/exercise-list-item";
import { SearchField } from "@/components/search-field";
import { matchesSearch } from "@/lib/search";

type Exercise = {
  id: number;
  name: string;
  category: string | null;
};

type ExercisesClientProps = {
  exercises: Exercise[];
};

export function ExercisesClient({ exercises }: ExercisesClientProps) {
  const [query, setQuery] = useState("");

  const filteredExercises = exercises.filter((exercise) =>
    matchesSearch(exercise.name, query),
  );

  return (
    <main className="mx-auto flex h-dvh w-full max-w-[390px] flex-col gap-8 overflow-hidden px-4 py-6">
      <header className="flex shrink-0 items-center gap-3">
        <Link
          href="/"
          aria-label="На головну"
          className="flex size-6 shrink-0 items-center justify-center rounded-8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500"
        >
          <Image
            src="/icons/create-workout/back.svg"
            alt=""
            width={22}
            height={22}
            unoptimized
          />
        </Link>

        <h1 className="type-heading-xl min-w-0 flex-1 text-[#ffffff]">
          Вправи
        </h1>
      </header>

      <div className="shrink-0">
        <SearchField
          placeholder="Знайти вправу"
          label="Пошук вправ"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </div>

      <ul
        aria-label="Список вправ"
        tabIndex={0}
        className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto rounded-12 [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:-outline-offset-2"
      >
        {filteredExercises.length === 0 && (
          <li role="status">Вправи не знайдено</li>
        )}

        {filteredExercises.map((exercise) => (
          <ExerciseListItem key={exercise.id} id={String(exercise.id)} name={exercise.name} muscleGroups={exercise.category ?? ""} />
        ))}
      </ul>
    </main>
  );
}
