import Image from "next/image";
import Link from "next/link";
import { ExerciseHistoryCard } from "@/components/exercise-history-card";

// Static examples from Figma frame 59:3354; every id uses this preview for now.
const history = [
  { date: "27 вересня 2026", dateTime: "2026-09-27", workoutName: "Тренування А" },
  { date: "10 жовтня 2026", dateTime: "2026-10-10", workoutName: "Тренування A" },
  { date: "15 жовтня 2026", dateTime: "2026-10-15", workoutName: "Тренування A" },
];

const sets = Array.from({ length: 4 }, (_, index) => ({
  number: index + 1,
  weight: 80,
  unit: "кг",
  reps: 15,
  reserve: 1,
}));

export default function ExerciseDetails() {
  return (
    <main className="mx-auto flex h-dvh w-full max-w-[390px] flex-col items-center gap-8 overflow-hidden bg-neutral-950 px-4 py-6 text-[#ffffff]">
      <header className="flex w-full shrink-0 items-center gap-4">
        <Link href="/exercises" aria-label="До списку вправ" className="flex size-6 shrink-0 items-center justify-center rounded-8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500">
          <Image src="/icons/create-workout/back.svg" alt="" width={22} height={22} unoptimized />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h1 className="type-heading-xl break-words">Латеральні підйоми кросовер із-за спини</h1>
          <p className="type-body-l">Плечі</p>
        </div>
      </header>
      <h2 id="exercise-history-heading" className="type-heading-m shrink-0 text-center">Історія виконання</h2>
      <section aria-labelledby="exercise-history-heading" tabIndex={0} className="flex min-h-0 w-full flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto [scrollbar-width:none] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-500">
        {history.map((entry) => <ExerciseHistoryCard key={entry.dateTime} {...entry} sets={sets} />)}
        <div aria-hidden="true" className="h-[250px] w-full shrink-0" />
      </section>
    </main>
  );
}
