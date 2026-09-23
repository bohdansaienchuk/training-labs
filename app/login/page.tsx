import Image from "next/image";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { authenticatedLoginDestination } from "@/lib/login-page";
import LoginForm from "./login-form";

export default async function Login() {
  const destination = authenticatedLoginDestination(await getCurrentUser());
  if (destination) redirect(destination);

  return (
    <main className="relative mx-auto flex min-h-[844px] w-full max-w-[390px] flex-col gap-16 overflow-hidden bg-neutral-950 px-4 py-6">
      <header className="relative z-10 flex shrink-0 flex-col items-center gap-2 px-8 pt-8 text-center text-[#ffffff]">
        <h1 className="type-heading-xl whitespace-nowrap">Training Labs</h1>
        <p className="type-body-l">Твій прогрес починається тут</p>
      </header>
      <LoginForm />
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
