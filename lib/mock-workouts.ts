import { newPlannedSet, type Workout } from "./workout-template";

// Legacy Create Workout examples; never used to resolve database routes.
export const MOCK_SEARCH_EXERCISE = { exerciseId: "1", name: "Жим штанги лежачи" };

export function createWorkoutDraft(): Workout {
  return {
    id: "draft",
    name: "",
    exercises: [],
  };
}

// Legacy in-memory examples retained for the Create Workout provider and tests.
// Database-backed Details and Active never import this module.
const mockExerciseDefinitions = [
  { exerciseId: "lateral-raise", name: "Латеральні підйоми кроссовер з-за спини", sets: 4 },
  { ...MOCK_SEARCH_EXERCISE, sets: 3 },
  { exerciseId: "butterfly", name: "Метелик лікті", sets: 3 },
  { exerciseId: "pullover-1", name: "Пуловер кросовер", sets: 3 },
  { exerciseId: "triceps", name: "Розгинання на трицепс у блоці пряма рукоятка (статичний блок)", sets: 3 },
  { exerciseId: "biceps", name: "Біцепс на скам'ї Скотта EZ гриф", sets: 3 },
];

export const MOCK_WORKOUTS: Workout[] = ["A", "B", "C"].map((letter, index) => ({
  id: String(index + 1),
  name: `Тренування ${letter}`,
  focus: index === 1 ? "Низ" : "Верх",
  estimatedMinutes: 45,
  exercises: mockExerciseDefinitions.map(({ sets, ...exercise }, exerciseIndex) => ({
    ...exercise,
    id: `${index + 1}-exercise-${exerciseIndex + 1}`,
    position: exerciseIndex + 1,
    plannedSets: Array.from({ length: sets }, (_, setIndex) => newPlannedSet(`${index + 1}-${exerciseIndex + 1}-set-${setIndex + 1}`, setIndex + 1)),
  })),
}));
