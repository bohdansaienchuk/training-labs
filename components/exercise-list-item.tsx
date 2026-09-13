import Image from "next/image";

type ExerciseListItemProps = {
  name: string;
  muscleGroups: string;
};

export function ExerciseListItem({ name, muscleGroups }: ExerciseListItemProps) {
  return (
    <li className="flex shrink-0 items-center gap-3 rounded-12 bg-primary-100 p-3 text-[#000000]">
      <div className="flex min-w-0 flex-1 flex-col gap-1 break-words">
        <h2 className="type-body-l">{name}</h2>
        <p className="type-body-m">{muscleGroups}</p>
      </div>
      <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center">
        <Image src="/icons/home/chevron-right.svg" alt="" width={22} height={22} unoptimized />
      </span>
    </li>
  );
}
