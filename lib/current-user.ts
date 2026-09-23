import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { auth } from "./auth";
import {
  requireResolvedUser,
  resolveCurrentUser,
  type SafeCurrentUser,
} from "./current-user-core";
import { prisma } from "./prisma";

const resolveRequestUser = cache(async (): Promise<SafeCurrentUser | null> =>
  resolveCurrentUser(
    async () => auth.api.getSession({ headers: await headers() }),
    (id) =>
      prisma.user.findUnique({
        where: { id },
        select: { id: true, email: true, name: true },
      }),
  ),
);

export function getCurrentUser(): Promise<SafeCurrentUser | null> {
  return resolveRequestUser();
}

// Pages may later translate this stable error into a redirect; Server Actions
// can translate it into their own unauthenticated result without trusting input.
export function requireUser(): Promise<SafeCurrentUser> {
  return requireResolvedUser(resolveRequestUser);
}
