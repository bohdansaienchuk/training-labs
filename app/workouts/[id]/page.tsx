import Image from "next/image";
import Link from "next/link";
import { ExerciseItem } from "@/components/exercise-item";

// Static content from Figma Workout Details, frame 31:418.
const exercises = [
  { name: "Латеральні підйоми кроссовер з-за спини", sets: 4 },
  { name: "Жим штанги лежачи", sets: 3 },
  { name: "Метелик лікті", sets: 3 },
  { name: "Пуловер кросовер", sets: 3 },
  { name: "Розгинання на трицепс у блоці пряма рукоятка (статичний блок)", sets: 3 },
  { name: "Біцепс на скам'ї Скотта EZ гриф", sets: 3 },
];

export default async function WorkoutDetails({ params }: PageProps<"/workouts/[id]">) {
  const { id } = await params;

  return (
    <main className="mx-auto flex h-dvh w-full max-w-[390px] flex-col items-center gap-16 overflow-hidden bg-neutral-950 px-4 py-6">
      <header className="flex w-full shrink-0 flex-col gap-3 text-[#ffffff]">
        <div className="flex w-full items-center gap-3">
          <Link href="/workouts" aria-label="До списку тренувань" className="flex size-6 shrink-0 items-center justify-center rounded-8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500">
            <Image src="/icons/workout-details/back.svg" alt="" width={22} height={22} unoptimized />
          </Link>
          <h1 className="type-heading-xl min-w-0 flex-1 text-center">Тренування А</h1>
          <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center">
            <Image src="/icons/workout-details/ellipsis.svg" alt="" width={4} height={18} unoptimized />
          </span>
        </div>
        <p className="type-body-m text-center">Верх · 6 вправ · ~45 хвилин</p>
      </header>
      <ul aria-label="Вправи тренування" className="flex min-h-0 w-full flex-1 flex-col gap-3 overflow-hidden">
        {exercises.map((exercise) => <ExerciseItem key={exercise.name} {...exercise} />)}
      </ul>
      <footer className="flex w-full shrink-0 items-center justify-center p-2.5">
        <Link href={`/workouts/${encodeURIComponent(id)}/active`} className="type-button inline-flex min-h-12 items-center justify-center whitespace-nowrap rounded-12 bg-primary-500 px-6 py-3.5 text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500">
          Почати тренування
        </Link>
      </footer>
    </main>
  );
}
