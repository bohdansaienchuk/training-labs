import Image from "next/image";
import Link from "next/link";
import { ExerciseListItem } from "@/components/exercise-list-item";
import { SearchField } from "@/components/search-field";

// Preserve the examples and repeated rows from Figma frame 59:3224.
const exercises = [
  { id: "1", name: "Жим штанги лежачи", muscleGroups: "Груди · Трицепс" },
  { id: "bench-dumbbell", name: "Жим гантелей лежачи", muscleGroups: "Груди · Трицепс" },
  { id: "lateral-raise", name: "Латеральні підйоми із-за спини", muscleGroups: "Дельти" },
  { id: "squat", name: "Присідання зі штангою", muscleGroups: "Квадріцепси · Сідниці" },
  ...Array.from({ length: 8 }, (_, index) => ({
    id: `pullover-${index + 1}`,
    name: "Пуловер кросовер",
    muscleGroups: "Найширший м'яз спини · Трапеція",
  })),
];

export default function Exercises() {
  return (
    <main className="mx-auto flex h-dvh w-full max-w-[390px] flex-col gap-8 overflow-hidden px-4 py-6">
      <header className="flex shrink-0 items-center gap-3">
        <Link href="/" aria-label="На головну" className="flex size-6 shrink-0 items-center justify-center rounded-8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500">
          <Image src="/icons/create-workout/back.svg" alt="" width={22} height={22} unoptimized />
        </Link>
        <h1 className="type-heading-xl min-w-0 flex-1 text-[#ffffff]">Вправи</h1>
      </header>
      <div className="shrink-0">
        <SearchField placeholder="Знайти вправу" label="Пошук вправ" />
      </div>
      <ul aria-label="Список вправ" tabIndex={0} className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto rounded-12 [scrollbar-width:none] focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:-outline-offset-2">
        {exercises.map(({ id, ...exercise }) => (
          <ExerciseListItem key={id} id={id} {...exercise} />
        ))}
      </ul>
    </main>
  );
}
