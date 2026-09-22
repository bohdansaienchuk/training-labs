import { SearchableList } from "@/components/searchable-list";
import { WEIGHT_UNIT_OPTIONS, type WeightUnit } from "@/lib/weight-unit";

export function WeightUnitSelect({ value, label, onChange }: { value: WeightUnit; label: string; onChange: (value: WeightUnit) => void }) {
  return <SearchableList value={value} options={WEIGHT_UNIT_OPTIONS} label={label} onChange={onChange} />;
}
