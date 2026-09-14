import Image from "next/image";
import Link from "next/link";

type WorkoutCardProps = {
  id: string;
  title: string;
  subtitle: string;
};

export function WorkoutCard({ id, title, subtitle }: WorkoutCardProps) {
  return (
    <li>
      <Link href={`/workouts/${encodeURIComponent(id)}`} className="flex flex-col gap-3 rounded-12 border border-neutral-500 bg-neutral-50 p-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500">
        <div className="flex items-center gap-2">
          <h2 className="type-heading-m min-w-0 flex-1 text-neutral-950">{title}</h2>
          <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center">
            <Image src="/icons/workouts/chevron-right.svg" alt="" width={22} height={22} unoptimized />
          </span>
        </div>
        <p className="type-body-m text-[#000000]">{subtitle}</p>
      </Link>
    </li>
  );
}
