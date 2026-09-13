import Link from "next/link";
import { WorkoutEditor } from "@/components/workout-editor";
import { PrimaryButton, WorkoutIcon } from "@/components/workout-controls";

export default function CreateWorkout() {
  return (
    <main className="mx-auto flex h-dvh min-h-[600px] w-full max-w-[390px] flex-col gap-16 px-4 py-6">
      <header className="flex shrink-0 items-center gap-3 px-4 py-2.5">
        <Link href="/workouts" aria-label="Назад до моїх тренувань" className="shrink-0 rounded-8 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500">
          <WorkoutIcon name="back" />
        </Link>
        <h1 className="type-heading-xl min-w-0 flex-1 text-center text-[#ffffff]">Створити тренування</h1>
      </header>
      <WorkoutEditor />
      <footer className="flex shrink-0 justify-center p-2.5">
        <PrimaryButton>Створити тренування</PrimaryButton>
      </footer>
    </main>
  );
}
