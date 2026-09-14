import Image from "next/image";
import Link from "next/link";
import { ActiveExerciseCard } from "@/components/active-exercise-card";

const exercises = [
  "Латеральні підйоми кроссовер з-за спини",
  "Жим штанги лежачи",
  "Метелик лікті",
];

export default async function ActiveWorkout({ params }: PageProps<"/workouts/[id]/active">) {
  const { id } = await params;
  const workoutPath = `/workouts/${encodeURIComponent(id)}`;
  return (
    <main className="mx-auto flex h-dvh w-full max-w-[390px] flex-col gap-4 overflow-hidden bg-neutral-950 px-4 py-6">
      <header className="flex w-full shrink-0 items-center gap-3 text-[#ffffff]">
        <Link href={workoutPath} aria-label="До деталей тренування" className="flex size-6 shrink-0 items-center justify-center rounded-8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500">
          <Image src="/icons/workout-details/back.svg" alt="" width={22} height={22} unoptimized />
        </Link>
        <h1 className="type-heading-xl min-w-0 flex-1 text-center">Тренування А</h1>
        <span aria-label="Тривалість тренування" className="type-body-l shrink-0 text-right">00:00</span>
      </header>
      <section aria-label="Вправи активного тренування" tabIndex={0} className="flex min-h-0 flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto p-2.5 [scrollbar-width:none] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-500">
        {exercises.map((name) => <ActiveExerciseCard key={name} name={name} />)}
      </section>
      <footer className="flex w-full shrink-0 items-center justify-center bg-neutral-950 p-2.5">
        <Link href={`${workoutPath}/completed`} className="type-button inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-12 bg-primary-500 px-6 py-3.5 text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500">
          Завершити тренування
        </Link>
      </footer>
    </main>
  );
}
