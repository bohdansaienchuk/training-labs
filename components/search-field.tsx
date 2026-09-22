import type { ComponentProps } from "react";
import Image from "next/image";

type SearchFieldProps = Omit<ComponentProps<"input">, "className" | "type"> & {
  placeholder: string;
  label: string;
};

export function SearchField({ placeholder, label, ...inputProps }: SearchFieldProps) {
  return (
    <label className="flex h-12 items-center gap-3 rounded-12 bg-neutral-50 px-4 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-primary-500">
      <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center">
        <Image src="/icons/workouts/search-check.svg" alt="" width={20} height={20} unoptimized />
      </span>
      <span className="sr-only">{label}</span>
      <input
        {...inputProps}
        type="search"
        placeholder={placeholder}
        className="type-placeholder min-w-0 flex-1 bg-transparent text-neutral-950 outline-none placeholder:text-neutral-500"
      />
    </label>
  );
}
