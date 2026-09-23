import { Prisma } from "@prisma/client";
import type { Workout, PlannedSet } from "./workout-template";
import { orderedExercises } from "./workout-template";
import { serializeWorkout, workoutInclude } from "./workout-read";

type Transaction = Prisma.TransactionClient;

function databaseId(value: string): number | null {
  return /^[1-9]\d*$/.test(value) && Number(value) <= 2147483647 ? Number(value) : null;
}

function targetWeight(set: PlannedSet): Prisma.Decimal | null {
  if (set.weight === null) return null;
  const kilograms = set.weightUnit === "lb" ? set.weight / 2.2046226218 : set.weight;
  if (!Number.isFinite(kilograms) || kilograms < 0 || kilograms > 9999.99) throw new Error("Invalid planned weight");
  return new Prisma.Decimal(kilograms.toFixed(2));
}

function validateSet(set: PlannedSet) {
  if (set.reps !== null && (!Number.isInteger(set.reps) || set.reps < 1)) throw new Error("Invalid planned reps");
  if (set.rir != null && (!Number.isInteger(set.rir) || set.rir < 0)) throw new Error("Invalid planned RIR");
  if (set.weightUnit !== "kg" && set.weightUnit !== "lb") throw new Error("Invalid weight unit");
  targetWeight(set);
}

function prepareWorkoutDraft(draft: Workout, requireExercise: boolean) {
  const name = draft.name.trim();
  if (!name || !Array.isArray(draft.exercises)) throw new Error("Invalid workout");
  const exercises = orderedExercises(draft.exercises);
  if (requireExercise && exercises.length === 0) throw new Error("Workout requires an exercise");
  if (new Set(exercises.map((exercise) => exercise.id)).size !== exercises.length) throw new Error("Duplicate workout exercise ID");
  if (new Set(exercises.map((exercise) => exercise.exerciseId)).size !== exercises.length) throw new Error("Duplicate exercise ID");
  const preparedExercises = exercises.map((exercise, exerciseIndex) => {
    if (!exercise.id || exercise.position !== exerciseIndex + 1 || !databaseId(exercise.exerciseId)) throw new Error("Invalid exercise");
    if (!Array.isArray(exercise.plannedSets) || new Set(exercise.plannedSets.map((set) => set.id)).size !== exercise.plannedSets.length) throw new Error("Duplicate workout set ID");
    const sets = [...exercise.plannedSets].sort((a, b) => a.position - b.position);
    for (const [setIndex, set] of sets.entries()) {
      if (!set.id || set.position !== setIndex + 1) throw new Error("Invalid workout set order");
      validateSet(set);
    }
    return { ...exercise, plannedSets: sets };
  });
  return { name, exercises: preparedExercises };
}

async function validateCatalogExercises(tx: Transaction, exerciseIds: number[]) {
  const found = await tx.exercise.findMany({ where: { id: { in: exerciseIds } }, select: { id: true } });
  if (found.length !== exerciseIds.length) throw new Error("Exercise not found");
}

function workoutSetData(set: PlannedSet) {
  return { targetWeight: targetWeight(set), targetReps: set.reps, targetRir: set.rir ?? null };
}

export async function createWorkoutTemplate(tx: Transaction, draft: Workout, authenticatedUserId: number): Promise<Workout> {
  if (!Number.isInteger(authenticatedUserId) || authenticatedUserId < 1) throw new Error("Invalid user");
  const { name, exercises } = prepareWorkoutDraft(draft, true);
  const exerciseIds = exercises.map((exercise) => Number(exercise.exerciseId));
  await validateCatalogExercises(tx, exerciseIds);

  const workout = await tx.workout.create({ data: { name, userId: authenticatedUserId } });
  for (const [exerciseIndex, exercise] of exercises.entries()) {
    const entry = await tx.workoutExercise.create({
      data: { workoutId: workout.id, exerciseId: Number(exercise.exerciseId), position: exerciseIndex + 1 },
    });
    for (const [setIndex, set] of exercise.plannedSets.entries()) {
      await tx.workoutSet.create({
        data: { workoutExerciseId: entry.id, setNumber: setIndex + 1, ...workoutSetData(set) },
      });
    }
  }

  const saved = await tx.workout.findUnique({ where: { id: workout.id }, include: workoutInclude });
  if (!saved) throw new Error("Workout disappeared during save");
  return serializeWorkout(saved);
}

// Called inside one Prisma transaction. Existing entry/set IDs survive edits;
// temporary negative positions avoid unique-key collisions during reorders.
export async function updateWorkoutTemplate(tx: Transaction, draft: Workout, authenticatedUserId: number): Promise<Workout> {
  const workoutId = databaseId(draft.id);
  if (!workoutId || !Number.isInteger(authenticatedUserId) || authenticatedUserId < 1) throw new Error("Workout not found");
  const { name, exercises } = prepareWorkoutDraft(draft, false);

  const existing = await tx.workout.findUnique({
    where: { id: workoutId, userId: authenticatedUserId },
    include: workoutInclude,
  });
  if (!existing) throw new Error("Workout not found");
  const existingEntries = new Map(existing.exercises.map((entry) => [entry.id, entry]));
  const retained = new Set<number>();
  const newCatalogIds = new Set<number>();
  for (const exercise of exercises) {
    const id = databaseId(exercise.id);
    if (id) {
      const entry = existingEntries.get(id);
      if (!entry || entry.exerciseId !== Number(exercise.exerciseId)) throw new Error("Workout exercise does not belong to this workout");
      retained.add(id);
      const setIds = new Set(entry.sets.map((set) => set.id));
      for (const set of exercise.plannedSets) {
        const setId = databaseId(set.id);
        if (setId && !setIds.has(setId)) throw new Error("Workout set does not belong to this exercise");
      }
    } else {
      if (!exercise.id) throw new Error("Invalid new workout exercise ID");
      newCatalogIds.add(Number(exercise.exerciseId));
      if (exercise.plannedSets.some((set) => databaseId(set.id))) throw new Error("Existing set cannot be added to a new exercise");
    }
  }
  if (newCatalogIds.size) {
    await validateCatalogExercises(tx, [...newCatalogIds]);
  }

  await tx.workoutExercise.deleteMany({ where: { workoutId, id: { notIn: [...retained] } } });
  for (const id of retained) await tx.workoutExercise.update({ where: { id }, data: { position: -id } });

  for (const [index, exercise] of exercises.entries()) {
    const existingId = databaseId(exercise.id);
    const entry = existingId
      ? await tx.workoutExercise.update({ where: { id: existingId }, data: { position: index + 1 } })
      : await tx.workoutExercise.create({ data: { workoutId, exerciseId: Number(exercise.exerciseId), position: index + 1 } });
    const original = existingId ? existingEntries.get(existingId)! : null;
    const retainedSetIds = exercise.plannedSets.map((set) => databaseId(set.id)).filter((id): id is number => id !== null);
    if (original) {
      await tx.workoutSet.deleteMany({ where: { workoutExerciseId: entry.id, id: { notIn: retainedSetIds } } });
      for (const id of retainedSetIds) await tx.workoutSet.update({ where: { id }, data: { setNumber: -id } });
    }
    for (const [setIndex, set] of [...exercise.plannedSets].sort((a, b) => a.position - b.position).entries()) {
      const data = { setNumber: setIndex + 1, ...workoutSetData(set) };
      const setId = databaseId(set.id);
      if (setId) await tx.workoutSet.update({ where: { id: setId }, data });
      else await tx.workoutSet.create({ data: { workoutExerciseId: entry.id, ...data } });
    }
  }

  await tx.workout.update({
    where: { id: workoutId, userId: authenticatedUserId },
    data: { name },
  });
  const saved = await tx.workout.findUnique({
    where: { id: workoutId, userId: authenticatedUserId },
    include: workoutInclude,
  });
  if (!saved) throw new Error("Workout disappeared during save");
  return serializeWorkout(saved);
}
