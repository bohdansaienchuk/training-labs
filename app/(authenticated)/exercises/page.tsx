import { connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { ExercisesClient } from "./exercises-client";

export default async function ExercisesPage() {
  await connection();
  const exercises = await prisma.exercise.findMany({
    select: { id: true, name: true, category: true },
    orderBy: {
      name: "asc",
    },
  });

  return <ExercisesClient exercises={exercises} />;
}
