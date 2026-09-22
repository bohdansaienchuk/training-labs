import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import type { WeightUnit } from "./weight-unit";

type ExerciseHistoryTransaction = Pick<Prisma.TransactionClient, "exercise" | "workoutSession">;

export type ExerciseHistorySet = {
  setNumber: number;
  weight: number | null;
  unit: WeightUnit;
  reps: number | null;
  rir: number | null;
};

export type ExerciseHistoryEntry = {
  sessionId: string;
  startedAt: string;
  completedAt: string;
  workoutName: string;
  sets: ExerciseHistorySet[];
};

export type ExerciseDetailsData = {
  exercise: {
    id: string;
    name: string;
    category: string | null;
  };
  history: ExerciseHistoryEntry[];
};

type LoadExerciseDetails = (exerciseId: number) => Promise<ExerciseDetailsData | null>;

function databaseId(value: string): number | null {
  return /^[1-9]\d*$/.test(value) && Number(value) <= 2147483647 ? Number(value) : null;
}

export async function resolveExerciseDetails(id: string, load: LoadExerciseDetails): Promise<ExerciseDetailsData> {
  const exerciseId = databaseId(id);
  if (!exerciseId) notFound();
  const details = await load(exerciseId);
  if (!details) notFound();
  return details;
}

export async function loadExerciseDetails(
  tx: ExerciseHistoryTransaction,
  exerciseId: number,
  userId: number,
): Promise<ExerciseDetailsData | null> {
  const exercise = await tx.exercise.findUnique({
    where: { id: exerciseId },
    select: { id: true, name: true, category: true },
  });
  if (!exercise) return null;

  const sessions = await tx.workoutSession.findMany({
    where: {
      userId,
      completedAt: { not: null },
      exercises: { some: { exerciseId } },
    },
    orderBy: [{ completedAt: "desc" }, { id: "desc" }],
    select: {
      id: true,
      startedAt: true,
      completedAt: true,
      workout: { select: { name: true } },
      exercises: {
        where: { exerciseId },
        orderBy: { position: "asc" },
        take: 1,
        select: {
          sets: {
            where: { completed: true },
            orderBy: { setNumber: "asc" },
            select: { setNumber: true, weight: true, reps: true, rir: true },
          },
        },
      },
    },
  });

  return {
    exercise: {
      id: String(exercise.id),
      name: exercise.name,
      category: exercise.category,
    },
    history: sessions.map((session) => ({
      sessionId: String(session.id),
      startedAt: session.startedAt.toISOString(),
      completedAt: session.completedAt!.toISOString(),
      workoutName: session.workout.name,
      sets: (session.exercises[0]?.sets ?? []).map((set) => ({
        setNumber: set.setNumber,
        weight: set.weight?.toNumber() ?? null,
        unit: "kg",
        reps: set.reps,
        rir: set.rir,
      })),
    })),
  };
}

const ukrainianDateFormatter = new Intl.DateTimeFormat("uk-UA", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Kyiv",
});

export function formatExerciseHistoryDate(value: string | Date): string {
  const parts = ukrainianDateFormatter.formatToParts(typeof value === "string" ? new Date(value) : value);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  return `${values.get("day")} ${values.get("month")} ${values.get("year")}`;
}
