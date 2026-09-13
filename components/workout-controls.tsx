import Image from "next/image";
import type { ButtonHTMLAttributes } from "react";

export function WorkoutIcon({ name }: { name: "back" | "trash" | "minus" | "plus" | "plus-dark" }) {
  const size = name === "trash" ? 24 : 22;
  const src = name === "plus" ? "/icons/workouts/circle-plus.svg" : `/icons/create-workout/${name}.svg`;
  return (
    <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center">
      <Image src={src} alt="" width={size} height={size} unoptimized />
    </span>
  );
}

export function PrimaryButton({ children, ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "type">) {
  return (
    <button type="button" className="type-button min-h-12 rounded-12 bg-primary-500 px-6 py-3.5 text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500" {...props}>
      {children}
    </button>
  );
}

export function SetAction({ icon, children, ...props }: Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "type"> & { icon: "plus" | "minus" }) {
  return (
    <button type="button" className="type-body-m flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-8 px-1 py-2 text-primary-500 focus-visible:outline-2 focus-visible:outline-primary-500" {...props}>
      <WorkoutIcon name={icon} />
      <span>{children}</span>
    </button>
  );
}
