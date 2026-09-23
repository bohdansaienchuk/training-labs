import { redirect } from "next/navigation";
import { LogoutButton } from "@/components/logout-button";
import { getCurrentUser } from "@/lib/current-user";

export default async function LogoutPage() {
  if (!await getCurrentUser()) redirect("/login");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-[390px] flex-col items-center justify-center gap-6 px-4 py-6 text-center">
      <h1 className="type-heading-l">Вихід</h1>
      <LogoutButton />
    </main>
  );
}
