import type { SafeCurrentUser } from "./current-user-core";

const LOCAL_REDIRECT_ORIGIN = "https://training-labs.invalid";

export function safeNextPath(value: unknown): string | null {
  if (
    typeof value !== "string" ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\u0000-\u001f\u007f]/.test(value) ||
    /%(?:25)*(?:2f|5c)/i.test(value)
  ) {
    return null;
  }

  try {
    const parsed = new URL(value, LOCAL_REDIRECT_ORIGIN);
    if (parsed.origin !== LOCAL_REDIRECT_ORIGIN) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

export function loginSuccessDestination(next: unknown): string {
  return safeNextPath(next) ?? "/";
}

export function authenticatedLoginDestination(
  user: SafeCurrentUser | null,
  next: unknown = null,
): string | null {
  return user ? loginSuccessDestination(next) : null;
}
