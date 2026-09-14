"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { WorkoutEditor } from "@/components/workout-editor";
import { PrimaryButton, WorkoutIcon } from "@/components/workout-controls";

export default function CreateWorkout() {
  const router = useRouter();

  function handleCreateWorkout() {
    // MVP navigation only; validation and saving can precede this redirect later.
    router.push("/workouts");
  }

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
        <PrimaryButton onClick={handleCreateWorkout}>Створити тренування</PrimaryButton>
      </footer>
    </main>
  );
}
