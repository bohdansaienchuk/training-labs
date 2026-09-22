export type WeightUnit = "kg" | "lb";

export const WEIGHT_UNIT_LABELS: Record<WeightUnit, string> = {
  kg: "кг",
  lb: "ф",
};

export const WEIGHT_UNIT_OPTIONS = (["kg", "lb"] as const).map((value) => ({
  value,
  label: WEIGHT_UNIT_LABELS[value],
}));
