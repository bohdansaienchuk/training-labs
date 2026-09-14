import Image from "next/image";
import Link from "next/link";

type HomeMenuCardProps = {
  href: string;
  title: string;
  description: string;
  icon: "dumbbell" | "plus" | "chart" | "list";
};

export function HomeMenuCard({ href, title, description, icon }: HomeMenuCardProps) {
  return (
    <li>
      <Link
        href={href}
        className="flex min-h-[94px] items-center gap-4 rounded-12 bg-primary-100 p-3 text-[#000000] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500"
      >
        <span aria-hidden="true" className="flex size-16 shrink-0 items-center justify-center">
          <Image src={`/icons/home/${icon}.svg`} alt="" width={64} height={64} unoptimized />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-1 break-words">
          <h2 className="type-heading-m">{title}</h2>
          <p className="type-body-m">{description}</p>
        </div>
        <span aria-hidden="true" className="flex size-6 shrink-0 items-center justify-center">
          <Image src="/icons/home/chevron-right.svg" alt="" width={22} height={22} unoptimized />
        </span>
      </Link>
    </li>
  );
}
