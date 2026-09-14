import Image from "next/image";
import Link from "next/link";
import { Input } from "@/components/input";

export default function Login() {
  return (
    <main className="relative mx-auto flex min-h-[844px] w-full max-w-[390px] flex-col gap-16 overflow-hidden bg-neutral-950 px-4 py-6">
      <header className="relative z-10 flex shrink-0 flex-col items-center gap-2 px-8 pt-8 text-center text-[#ffffff]">
        <h1 className="type-heading-xl whitespace-nowrap">Training Labs</h1>
        <p className="type-body-l">Твій прогрес починається тут</p>
      </header>
      <div className="relative z-10 flex w-full shrink-0 flex-col items-center gap-8 px-8">
        <Input label="Логін" placeholder="Введіть логін" type="text" autoComplete="username" />
        <Input label="Пароль" placeholder="Введіть пароль" type="password" autoComplete="current-password" />
        <Link href="/" className="type-button inline-flex min-h-12 items-center justify-center rounded-12 bg-primary-500 px-6 py-3.5 text-neutral-950 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500">
          Увійти
        </Link>
      </div>
      {/* Figma background 94:1171 exported with its crop and 25% opacity baked in. */}
      <Image
        src="/images/login/athlete.png"
        alt=""
        width={390}
        height={380}
        loading="eager"
        unoptimized
        className="pointer-events-none absolute left-0 top-[464px] h-[380px] w-full object-contain"
      />
    </main>
  );
}
