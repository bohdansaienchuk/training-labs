import Image from "next/image";
import Link from "next/link";

type WorkoutCardProps = {
  id: string;
  title: string;
  subtitle: string;
  selecting?: boolean;
  selected?: boolean;
  onSelect?: () => void;
};

function WorkoutSelectionRadio({ selected }: { selected: boolean }) {
  return (
    <span aria-hidden="true" data-workout-selection-radio className="flex size-6 shrink-0 items-center justify-center">
      <svg viewBox="0 0 24 24" fill="none" className="size-6 text-neutral-50">
        <circle cx="12" cy="12" r="10" fill={selected ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" />
      </svg>
    </span>
  );
}

export function WorkoutCard({ id, title, subtitle, selecting = false, selected = false, onSelect }: WorkoutCardProps) {
  const content = <>
    <div className="flex items-center gap-2">
      <h2 className="type-heading-m min-w-0 flex-1 text-neutral-950">{title}</h2>
      <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center">
        <Image src="/icons/workouts/chevron-right.svg" alt="" width={22} height={22} unoptimized />
      </span>
    </div>
    <p className="type-body-m text-[#000000]">{subtitle}</p>
  </>;
  const surface = "flex min-w-0 flex-1 flex-col gap-3 rounded-12 border border-neutral-500 bg-neutral-50 p-4 text-left";
  return (
    <li className="w-full shrink-0">
      {selecting ? <button type="button" data-workout-select data-workout-id={id} aria-label={`Обрати тренування ${title}`} aria-pressed={selected} onClick={onSelect}
        className="flex w-full appearance-none items-center gap-2 rounded-12 bg-transparent hover:bg-transparent active:bg-transparent aria-pressed:bg-transparent focus-visible:outline-2 focus-visible:outline-neutral-50">
        <WorkoutSelectionRadio selected={selected} />
        <span data-workout-card-surface className={surface}>{content}</span>
      </button> : <Link data-workout-card-surface data-workout-link={id} href={`/workouts/${encodeURIComponent(id)}`} className={`${surface} focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500`}>
        {content}
      </Link>}
    </li>
  );
}
