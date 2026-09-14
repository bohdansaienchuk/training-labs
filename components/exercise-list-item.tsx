import Image from "next/image";
import Link from "next/link";

type ExerciseListItemProps = {
  id: string;
  name: string;
  muscleGroups: string;
};

export function ExerciseListItem({ id, name, muscleGroups }: ExerciseListItemProps) {
  return (
    <li className="shrink-0">
      <Link href={`/exercises/${encodeURIComponent(id)}`} className="flex items-center gap-3 rounded-12 bg-primary-100 p-3 text-[#000000] focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary-500">
        <div className="flex min-w-0 flex-1 flex-col gap-1 break-words">
          <h2 className="type-body-l">{name}</h2>
          <p className="type-body-m">{muscleGroups}</p>
        </div>
        <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center">
          <Image src="/icons/home/chevron-right.svg" alt="" width={22} height={22} unoptimized />
        </span>
      </Link>
    </li>
  );
}
