import Image from "next/image";
import Link from "next/link";
import { completedDurationMinutes, completedWorkoutBackHref, countLabel, elapsedTimer } from "@/lib/active-workout";
import { requireUser } from "@/lib/current-user";
import { getCompletedWorkoutSessionForUser } from "@/lib/get-workout-session";

export default async function WorkoutCompleted({ searchParams }: PageProps<"/workouts/[id]/completed">) {
  const query = await searchParams;
  const sessionId = Array.isArray(query.session) ? query.session[0] : query.session;
  const currentUser = await requireUser();
  const session = await getCompletedWorkoutSessionForUser(sessionId ?? "", currentUser.id);
  const backHref = completedWorkoutBackHref(session.workoutId);
  const backLabel = session.workoutId ? "До деталей тренування" : "До моїх тренувань";
  const duration = completedDurationMinutes(session.startedAt, session.completedAt);
  const summary = [
    `${duration} хв`,
    countLabel(session.exerciseCount, ["вправа", "вправи", "вправ"]),
    countLabel(session.setCount, ["підхід", "підходи", "підходів"]),
  ].join(" · ");

  return (
    <main className="mx-auto flex h-dvh w-full max-w-[390px] flex-col gap-4 overflow-hidden bg-neutral-950 px-4 py-6">
      <header className="flex w-full shrink-0 items-center gap-3 text-[#ffffff]">
        <Link href={backHref} aria-label={backLabel} className="flex size-6 shrink-0 items-center justify-center rounded-8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500">
          <Image src="/icons/workout-details/back.svg" alt="" width={22} height={22} unoptimized />
        </Link>
        <h1 className="type-heading-xl min-w-0 flex-1 text-center">{session.workoutName}</h1>
        <span aria-label="Тривалість тренування" className="type-body-l shrink-0 text-right">{elapsedTimer(session.startedAt, new Date(session.completedAt).getTime())}</span>
      </header>
      <section aria-labelledby="completion-title" tabIndex={0} className="flex min-h-0 flex-1 flex-col items-center gap-4 overflow-x-hidden overflow-y-auto [scrollbar-width:none] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-500">
        <div className="flex w-full shrink-0 flex-col items-center justify-center gap-3 overflow-hidden p-2.5 text-center">
          <Image src="/icons/workout-completed/circle-check.svg" alt="" width={48} height={48} className="size-12 shrink-0" unoptimized />
          <h2 id="completion-title" className="type-heading-m w-full text-primary-500">Тренування завершено</h2>
          <p className="type-body-m whitespace-nowrap text-[#ffffff]">{summary}</p>
        </div>
      </section>
      <footer className="flex w-full shrink-0 items-start justify-center overflow-hidden bg-neutral-950 p-2.5">
        <Link href="/workouts" className="type-button inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-12 bg-primary-500 px-6 py-3.5 text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500">
          До моїх тренувань
        </Link>
      </footer>
    </main>
  );
}
