import Image from "next/image";

type ExerciseItemProps = {
  name: string;
  sets: number;
  editing?: boolean;
  selected?: boolean;
  onSelect?: () => void;
};

const setPlural = new Intl.PluralRules("uk");

export function ExerciseItem({ name, sets, editing = false, selected = false, onSelect }: ExerciseItemProps) {
  const plural = setPlural.select(sets);
  const setLabel = plural === "one" ? "підхід" : plural === "few" ? "підходи" : "підходів";

  const content = <>
    <span className="type-body-l min-w-0 flex-1 break-words">{name}</span>
    <span className="type-body-m shrink-0 whitespace-nowrap text-right">{sets} {setLabel}</span>
  </>;
  const surface = "flex w-full min-w-0 items-center gap-2 rounded-12 bg-primary-100 px-3 py-2.5 text-[#000000]";
  return (
    <li className="w-full shrink-0">
      {editing ? <button type="button" data-workout-exercise-select aria-label={`Обрати вправу ${name}`} aria-pressed={selected} onClick={onSelect}
        className="flex w-full items-center gap-2 rounded-12 text-left focus-visible:outline-2 focus-visible:outline-primary-500">
        <Image src={`/icons/workout-details/${selected ? "selected" : "unselected"}.svg`} alt="" width={24} height={24} unoptimized className="size-6 shrink-0" />
        <span className={surface}>{content}</span>
      </button> : <div className={surface}>{content}</div>}
    </li>
  );
}
