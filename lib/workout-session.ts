import { Prisma } from "@prisma/client";
import type { ActiveWorkoutSession, CompletedWorkoutSession, PerformedSetInput, PreviousPerformedSet } from "./active-workout";
import { validatePerformedSet, weightToKilograms } from "./active-workout";

type Transaction = Prisma.TransactionClient;

export class WorkoutSessionError extends Error {}
export class IncompleteWorkoutError extends WorkoutSessionError {}

function databaseId(value: string): number | null {
  return /^[1-9]\d*$/.test(value) && Number(value) <= 2147483647 ? Number(value) : null;
}

type SessionExerciseTemplate = {
  exerciseId: number;
  position: number;
  sets: { setNumber: number }[];
};

async function createSessionExerciseFromTemplate(tx: Transaction, workoutSessionId: number, exercise: SessionExerciseTemplate) {
  const sessionExercise = await tx.sessionExercise.create({
    data: { workoutSessionId, exerciseId: exercise.exerciseId, position: exercise.position },
  });
  for (const set of exercise.sets) {
    await tx.performedSet.create({
      data: { sessionExerciseId: sessionExercise.id, setNumber: set.setNumber, weight: null, reps: null, rir: null, completed: false },
    });
  }
  return sessionExercise;
}

async function reconcileWorkoutSession(tx: Transaction, session: { id: number; exercises: { id: number; exerciseId: number; position: number }[] }, templateExercises: SessionExerciseTemplate[]) {
  const templateExerciseIds = new Set(templateExercises.map((exercise) => exercise.exerciseId));
  if (templateExerciseIds.size !== templateExercises.length) throw new WorkoutSessionError("Duplicate workout exercise");

  const retained = new Map<number, { id: number; exerciseId: number; position: number }>();
  for (const exercise of session.exercises) {
    if (!templateExerciseIds.has(exercise.exerciseId) || retained.has(exercise.exerciseId)) {
      await tx.sessionExercise.delete({ where: { id: exercise.id } });
    } else {
      retained.set(exercise.exerciseId, exercise);
    }
  }

  for (const exercise of retained.values()) {
    await tx.sessionExercise.update({ where: { id: exercise.id }, data: { position: -exercise.id } });
  }
  for (const templateExercise of templateExercises) {
    const exercise = retained.get(templateExercise.exerciseId);
    if (exercise) {
      await tx.sessionExercise.update({ where: { id: exercise.id }, data: { position: templateExercise.position } });
    } else {
      await createSessionExerciseFromTemplate(tx, session.id, templateExercise);
    }
  }
}

export async function startWorkoutSession(tx: Transaction, workoutIdValue: string, authenticatedUserId: number): Promise<string> {
  const workoutId = databaseId(workoutIdValue);
  if (!workoutId || !Number.isInteger(authenticatedUserId) || authenticatedUserId < 1) throw new WorkoutSessionError("Invalid workout session");

  const workout = await tx.workout.findFirst({
    where: { id: workoutId, userId: authenticatedUserId },
    include: { exercises: { orderBy: { position: "asc" }, include: { sets: { orderBy: { setNumber: "asc" } } } } },
  });
  if (!workout) throw new WorkoutSessionError("Workout not found");

  const existing = await tx.workoutSession.findFirst({
    where: { workoutId, userId: authenticatedUserId, completedAt: null },
    orderBy: [{ startedAt: "desc" }, { id: "desc" }],
    include: { exercises: { orderBy: { position: "asc" } } },
  });
  if (existing) {
    await reconcileWorkoutSession(tx, existing, workout.exercises);
    return String(existing.id);
  }

  const session = await tx.workoutSession.create({
    data: { workoutId, workoutName: workout.name, userId: authenticatedUserId },
  });
  for (const exercise of workout.exercises) {
    await createSessionExerciseFromTemplate(tx, session.id, exercise);
  }
  return String(session.id);
}

function performedData(input: PerformedSetInput) {
  const validation = validatePerformedSet(input);
  const kilograms = validation.weight ? weightToKilograms(input.weight!, input.weightUnit) : null;
  if (kilograms !== null && kilograms > 9999.99) throw new WorkoutSessionError("Invalid performed weight");
  return {
    weight: kilograms === null ? null : new Prisma.Decimal(kilograms.toFixed(2)),
    reps: validation.reps ? input.reps : null,
    rir: validation.rir ? Number(input.rir) : null,
    completed: validation.valid,
  };
}

async function ownedUnfinishedSet(tx: Transaction, workoutId: number, sessionId: number, authenticatedUserId: number, setId: number, sessionExerciseId: number) {
  return tx.performedSet.findFirst({
    where: {
      id: setId,
      sessionExerciseId,
      sessionExercise: {
        workoutSession: {
          id: sessionId,
          workoutId,
          userId: authenticatedUserId,
          completedAt: null,
          workout: { userId: authenticatedUserId },
        },
      },
    },
    select: { id: true },
  });
}

export async function savePerformedSet(tx: Transaction, workoutIdValue: string, sessionIdValue: string, authenticatedUserId: number, input: PerformedSetInput) {
  const workoutId = databaseId(workoutIdValue);
  const sessionId = databaseId(sessionIdValue);
  const setId = databaseId(input.id);
  const sessionExerciseId = databaseId(input.sessionExerciseId);
  if (!workoutId || !sessionId || !setId || !sessionExerciseId) throw new WorkoutSessionError("Invalid performed set");
  if (!await ownedUnfinishedSet(tx, workoutId, sessionId, authenticatedUserId, setId, sessionExerciseId)) throw new WorkoutSessionError("Performed set not found");
  const data = performedData(input);
  await tx.performedSet.update({ where: { id: setId }, data });
  return { completed: data.completed };
}

export async function addPerformedSet(tx: Transaction, workoutIdValue: string, sessionIdValue: string, sessionExerciseIdValue: string, expectedLastSetIdValue: string, authenticatedUserId: number) {
  const workoutId = databaseId(workoutIdValue);
  const sessionId = databaseId(sessionIdValue);
  const sessionExerciseId = databaseId(sessionExerciseIdValue);
  if (!workoutId || !sessionId || !sessionExerciseId) throw new WorkoutSessionError("Invalid session exercise");
  const exercise = await tx.sessionExercise.findFirst({
    where: {
      id: sessionExerciseId,
      workoutSession: {
        id: sessionId,
        workoutId,
        userId: authenticatedUserId,
        completedAt: null,
        workout: { userId: authenticatedUserId },
      },
    },
    include: { sets: { orderBy: { setNumber: "desc" }, take: 1 } },
  });
  if (!exercise) throw new WorkoutSessionError("Session exercise not found");
  const expectedLastSetId = databaseId(expectedLastSetIdValue);
  if (!expectedLastSetId) throw new WorkoutSessionError("Invalid performed set");
  if (exercise.sets[0]?.id !== expectedLastSetId) {
    const current = exercise.sets[0];
    if (!current) throw new WorkoutSessionError("Performed set not found");
    return { id: String(current.id), setNumber: current.setNumber };
  }
  const created = await tx.performedSet.create({
    data: { sessionExerciseId, setNumber: (exercise.sets[0]?.setNumber ?? 0) + 1, weight: null, reps: null, rir: null, completed: false },
  });
  return { id: String(created.id), setNumber: created.setNumber };
}

export async function removePerformedSet(tx: Transaction, workoutIdValue: string, sessionIdValue: string, sessionExerciseIdValue: string, setIdValue: string, authenticatedUserId: number) {
  const workoutId = databaseId(workoutIdValue);
  const sessionId = databaseId(sessionIdValue);
  const sessionExerciseId = databaseId(sessionExerciseIdValue);
  const setId = databaseId(setIdValue);
  if (!workoutId || !sessionId || !sessionExerciseId || !setId) throw new WorkoutSessionError("Invalid performed set");
  const exercise = await tx.sessionExercise.findFirst({
    where: {
      id: sessionExerciseId,
      workoutSession: {
        id: sessionId,
        workoutId,
        userId: authenticatedUserId,
        completedAt: null,
        workout: { userId: authenticatedUserId },
      },
    },
    include: { sets: { orderBy: { setNumber: "asc" } } },
  });
  if (!exercise) throw new WorkoutSessionError("Session exercise not found");
  if (exercise.sets.length <= 1) return false;
  const last = exercise.sets.at(-1)!;
  if (last.id !== setId) throw new WorkoutSessionError("Only the final set can be removed");
  await tx.performedSet.delete({ where: { id: setId } });
  return true;
}

async function ownedUnfinishedSessionExercises(tx: Transaction, workoutIdValue: string, sessionIdValue: string, sessionExerciseIdValue: string, authenticatedUserId: number) {
  const workoutId = databaseId(workoutIdValue);
  const sessionId = databaseId(sessionIdValue);
  const sessionExerciseId = databaseId(sessionExerciseIdValue);
  if (!workoutId || !sessionId || !sessionExerciseId) throw new WorkoutSessionError("Invalid session exercise");
  const session = await tx.workoutSession.findFirst({
    where: {
      id: sessionId,
      workoutId,
      userId: authenticatedUserId,
      completedAt: null,
      workout: { userId: authenticatedUserId },
    },
    include: { exercises: { orderBy: { position: "asc" } } },
  });
  if (!session || !session.exercises.some((exercise) => exercise.id === sessionExerciseId)) throw new WorkoutSessionError("Session exercise not found");
  return { sessionExerciseId, exercises: session.exercises };
}

export async function moveSessionExercise(tx: Transaction, workoutIdValue: string, sessionIdValue: string, sessionExerciseIdValue: string, authenticatedUserId: number, direction: -1 | 1) {
  if (direction !== -1 && direction !== 1) throw new WorkoutSessionError("Invalid exercise direction");
  const { sessionExerciseId, exercises } = await ownedUnfinishedSessionExercises(tx, workoutIdValue, sessionIdValue, sessionExerciseIdValue, authenticatedUserId);
  const index = exercises.findIndex((exercise) => exercise.id === sessionExerciseId);
  const targetIndex = index + direction;
  if (targetIndex < 0 || targetIndex >= exercises.length) return exercises.map((exercise) => String(exercise.id));
  const selected = exercises[index];
  const target = exercises[targetIndex];
  await tx.sessionExercise.update({ where: { id: selected.id }, data: { position: -selected.id } });
  await tx.sessionExercise.update({ where: { id: target.id }, data: { position: selected.position } });
  await tx.sessionExercise.update({ where: { id: selected.id }, data: { position: target.position } });
  const reordered = [...exercises];
  [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
  return reordered.map((exercise) => String(exercise.id));
}

export async function deleteSessionExercise(tx: Transaction, workoutIdValue: string, sessionIdValue: string, sessionExerciseIdValue: string, authenticatedUserId: number) {
  const { sessionExerciseId, exercises } = await ownedUnfinishedSessionExercises(tx, workoutIdValue, sessionIdValue, sessionExerciseIdValue, authenticatedUserId);
  await tx.sessionExercise.delete({ where: { id: sessionExerciseId } });
  const remaining = exercises.filter((exercise) => exercise.id !== sessionExerciseId);
  for (const [index, exercise] of remaining.entries()) {
    const position = index + 1;
    if (exercise.position !== position) await tx.sessionExercise.update({ where: { id: exercise.id }, data: { position } });
  }
  return remaining.map((exercise) => String(exercise.id));
}

export async function finishWorkoutSession(tx: Transaction, workoutIdValue: string, sessionIdValue: string, authenticatedUserId: number, inputs: PerformedSetInput[], completedAt = new Date()) {
  const workoutId = databaseId(workoutIdValue);
  const sessionId = databaseId(sessionIdValue);
  if (!workoutId || !sessionId) throw new WorkoutSessionError("Invalid workout session");
  const session = await tx.workoutSession.findFirst({
    where: {
      id: sessionId,
      workoutId,
      userId: authenticatedUserId,
      workout: { userId: authenticatedUserId },
    },
    include: { exercises: { include: { sets: true } } },
  });
  if (!session) throw new WorkoutSessionError("Workout session not found");
  if (session.completedAt) return String(session.id);
  const storedSets = session.exercises.flatMap((exercise) => exercise.sets.map((set) => ({ set, sessionExerciseId: exercise.id })));
  const inputById = new Map(inputs.map((input) => [databaseId(input.id), input]));
  if (storedSets.length === 0 || inputById.size !== storedSets.length) throw new IncompleteWorkoutError("Incomplete workout");
  const updates = storedSets.map(({ set, sessionExerciseId }) => {
    const input = inputById.get(set.id);
    if (!input || databaseId(input.sessionExerciseId) !== sessionExerciseId) throw new IncompleteWorkoutError("Incomplete workout");
    const data = performedData(input);
    if (!data.completed) throw new IncompleteWorkoutError("Incomplete workout");
    return { id: set.id, data };
  });
  for (const update of updates) await tx.performedSet.update({ where: { id: update.id }, data: update.data });
  await tx.workoutSession.update({ where: { id: session.id }, data: { completedAt } });
  return String(session.id);
}

function previousSet(set: { setNumber: number; weight: Prisma.Decimal | null; reps: number | null; rir: number | null }): PreviousPerformedSet {
  return { setNumber: set.setNumber, weight: set.weight?.toNumber() ?? null, weightUnit: "kg", reps: set.reps, rir: set.rir };
}

export async function loadActiveWorkoutSession(tx: Transaction, workoutIdValue: string, sessionIdValue: string, userId: number): Promise<ActiveWorkoutSession | null> {
  const workoutId = databaseId(workoutIdValue);
  const sessionId = databaseId(sessionIdValue);
  if (!workoutId || !sessionId) return null;
  const session = await tx.workoutSession.findFirst({
    where: {
      id: sessionId,
      workoutId,
      userId,
      completedAt: null,
      workout: { userId },
    },
    include: {
      workout: { select: { name: true } },
      exercises: { orderBy: { position: "asc" }, include: { exercise: true, sets: { orderBy: { setNumber: "asc" } } } },
    },
  });
  if (!session || session.workoutId === null || !session.workout) return null;
  const exerciseIds = session.exercises.map((exercise) => exercise.exerciseId);
  const history = exerciseIds.length ? await tx.workoutSession.findMany({
    where: { id: { not: session.id }, userId, completedAt: { not: null }, exercises: { some: { exerciseId: { in: exerciseIds } } } },
    orderBy: [{ completedAt: "desc" }, { id: "desc" }],
    include: { exercises: { where: { exerciseId: { in: exerciseIds } }, include: { sets: { where: { completed: true }, orderBy: { setNumber: "asc" } } } } },
  }) : [];
  const previous = new Map<number, PreviousPerformedSet[]>();
  for (const historicSession of history) {
    for (const exercise of historicSession.exercises) {
      if (!previous.has(exercise.exerciseId)) previous.set(exercise.exerciseId, exercise.sets.map(previousSet));
    }
  }
  return {
    id: String(session.id),
    workoutId: String(session.workoutId),
    workoutName: session.workout.name,
    startedAt: session.startedAt.toISOString(),
    exercises: session.exercises.map((exercise) => ({
      id: String(exercise.id),
      exerciseId: String(exercise.exerciseId),
      name: exercise.exercise.name,
      category: exercise.exercise.category,
      position: exercise.position,
      previousSets: previous.get(exercise.exerciseId) ?? [],
      sets: exercise.sets.map((set) => ({
        id: String(set.id), sessionExerciseId: String(exercise.id), setNumber: set.setNumber,
        weight: set.weight?.toNumber() ?? null, weightUnit: "kg", reps: set.reps,
        rir: set.rir === null ? "" : String(set.rir), completed: set.completed,
      })),
    })),
  };
}

export async function loadCompletedWorkoutSession(tx: Transaction, sessionIdValue: string, userId: number): Promise<CompletedWorkoutSession | null> {
  const sessionId = databaseId(sessionIdValue);
  if (!sessionId) return null;
  const session = await tx.workoutSession.findFirst({
    where: { id: sessionId, userId, completedAt: { not: null } },
    include: { exercises: { include: { sets: { where: { completed: true }, select: { id: true } } } } },
  });
  if (!session?.completedAt) return null;
  return {
    id: String(session.id), workoutId: session.workoutId === null ? null : String(session.workoutId), workoutName: session.workoutName,
    startedAt: session.startedAt.toISOString(), completedAt: session.completedAt.toISOString(),
    exerciseCount: session.exercises.length,
    setCount: session.exercises.reduce((count, exercise) => count + exercise.sets.length, 0),
  };
}
