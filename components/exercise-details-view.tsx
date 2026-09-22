import Image from "next/image";
import Link from "next/link";
import { ExerciseHistoryCard } from "@/components/exercise-history-card";
import { formatExerciseHistoryDate, type ExerciseDetailsData } from "@/lib/exercise-history";

export function ExerciseDetailsView({ details }: { details: ExerciseDetailsData }) {
  return (
    <main className="mx-auto flex h-dvh w-full max-w-[390px] flex-col items-center gap-8 overflow-hidden bg-neutral-950 px-4 py-6 text-[#ffffff]">
      <header className="flex w-full shrink-0 items-center gap-4">
        <Link href="/exercises" aria-label="До списку вправ" className="flex size-6 shrink-0 items-center justify-center rounded-8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500">
          <Image src="/icons/create-workout/back.svg" alt="" width={22} height={22} unoptimized />
        </Link>
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <h1 className="type-heading-xl break-words">{details.exercise.name}</h1>
          <p className="type-body-l">{details.exercise.category ?? "—"}</p>
        </div>
      </header>
      <h2 id="exercise-history-heading" className="type-heading-m shrink-0 text-center">Історія виконання</h2>
      <section aria-labelledby="exercise-history-heading" tabIndex={0} className="flex min-h-0 w-full flex-1 flex-col gap-4 overflow-x-hidden overflow-y-auto [scrollbar-width:none] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-500">
        {details.history.length === 0 ? (
          <div role="status" className="flex w-full flex-col items-center gap-2 py-4 text-center">
            <h3 className="type-body-l">Ще немає історії виконання</h3>
            <p className="type-body-m text-neutral-300">Завершені тренування з цією вправою з&apos;являться тут</p>
          </div>
        ) : details.history.map((entry) => (
          <ExerciseHistoryCard
            key={entry.sessionId}
            date={formatExerciseHistoryDate(entry.startedAt)}
            dateTime={entry.startedAt}
            workoutName={entry.workoutName}
            sets={entry.sets}
          />
        ))}
        <div aria-hidden="true" className="h-[250px] w-full shrink-0" />
      </section>
    </main>
  );
}
