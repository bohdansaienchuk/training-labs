// Preserve the examples and repeated rows from Figma frame 59:3224.
export type CatalogExercise = { id: string; name: string; muscleGroups?: string };

export const EXERCISE_CATALOG: CatalogExercise[] = [
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

