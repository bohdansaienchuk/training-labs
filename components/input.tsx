import type { InputHTMLAttributes } from "react";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "className"> & {
  label: string;
};

export function Input({ label, ...props }: InputProps) {
  return (
    <label className="flex w-full flex-col gap-1.5">
      <span className="type-caption text-neutral-50">{label}</span>
      <input
        {...props}
        className="type-placeholder h-12 w-full min-w-0 rounded-8 border border-neutral-800 bg-primary-300 px-4 py-3 text-neutral-950 placeholder:text-neutral-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500"
      />
    </label>
  );
}
