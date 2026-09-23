import type { SafeCurrentUser } from "./current-user-core";

export function authenticatedPageRedirect(
  user: SafeCurrentUser | null,
): "/login" | null {
  return user ? null : "/login";
}
