import type { SafeCurrentUser } from "./current-user-core";

export function authenticatedLoginDestination(user: SafeCurrentUser | null): "/" | null {
  return user ? "/" : null;
}
