import { LogoutButton } from "@/components/logout-button";

export default function LogoutPage() {
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col items-center justify-center gap-6 px-4 py-6 text-center">
      <h1 className="type-heading-l">Вихід</h1>
      <LogoutButton />
    </main>
  );
}
