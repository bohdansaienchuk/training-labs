import Image from "next/image";
import Link from "next/link";
import { SearchField } from "@/components/search-field";
import { WorkoutCard } from "@/components/workout-card";

const workouts = [
  { title: "Тренування A", subtitle: "Верх 6 вправ ~45 хв" },
  { title: "Тренування B", subtitle: "Низ 6 вправ ~45 хв" },
  { title: "Тренування C", subtitle: "Верх 6 вправ ~45 хв" },
];

export default function MyWorkouts() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col gap-4 px-4 py-6">
      <h1 className="type-heading-xl text-center">Мої тренування</h1>
      <SearchField placeholder="Знайти тренування" label="Пошук тренувань" />
      <Link
        href="/workouts/new"
        className="type-body-m flex items-center gap-1.5 p-2 text-primary-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
      >
        <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center">
          <Image src="/icons/workouts/circle-plus.svg" alt="" width={22} height={22} unoptimized />
        </span>
        Створити тренування
      </Link>
      <ul className="flex flex-col gap-3" aria-label="Мої тренування">
        {workouts.map((workout) => (
          <WorkoutCard key={workout.title} {...workout} />
        ))}
      </ul>
    </main>
  );
}
