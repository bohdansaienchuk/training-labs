import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/current-user";
import { authenticatedPageRedirect } from "@/lib/route-protection";

export default async function AuthenticatedLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  const destination = authenticatedPageRedirect(await getCurrentUser());
  if (destination) redirect(destination);

  return children;
}
