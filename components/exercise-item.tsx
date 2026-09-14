type ExerciseItemProps = {
  name: string;
  sets: number;
};

const setPlural = new Intl.PluralRules("uk");

export function ExerciseItem({ name, sets }: ExerciseItemProps) {
  const plural = setPlural.select(sets);
  const setLabel = plural === "one" ? "підхід" : plural === "few" ? "підходи" : "підходів";

  return (
    <li className="flex w-full shrink-0 items-center gap-2 overflow-hidden rounded-12 bg-primary-100 px-3 py-2.5 text-[#000000]">
      <p className="type-body-l min-w-0 flex-1 break-words">{name}</p>
      <span className="type-body-m shrink-0 whitespace-nowrap text-right">{sets} {setLabel}</span>
    </li>
  );
}
