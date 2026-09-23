import {
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
} from "./auth-options";

export const INVALID_CREDENTIALS_MESSAGE = "Неправильна електронна пошта або пароль";
export const UNEXPECTED_LOGIN_MESSAGE = "Не вдалося увійти. Спробуйте ще раз.";
export const LOGIN_EMAIL_MAX_LENGTH = 254;

export type LoginAttemptResult = "success" | "invalid-credentials" | "unexpected-error";

export function normalizeLoginEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function validateLoginInput(
  emailValue: string,
  passwordValue: string,
): { email: string; password: string } | null {
  const email = normalizeLoginEmail(emailValue);
  if (
    !email ||
    email.length > LOGIN_EMAIL_MAX_LENGTH ||
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
    passwordValue.length < AUTH_PASSWORD_MIN_LENGTH ||
    passwordValue.length > AUTH_PASSWORD_MAX_LENGTH
  ) {
    return null;
  }
  return { email, password: passwordValue };
}

export function classifySignInError(error: unknown): LoginAttemptResult {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status?: unknown }).status;
    if (status === 400 || status === 401 || status === 403) {
      return "invalid-credentials";
    }
  }
  return "unexpected-error";
}

export function loginErrorMessage(result: Exclude<LoginAttemptResult, "success">): string {
  return result === "invalid-credentials"
    ? INVALID_CREDENTIALS_MESSAGE
    : UNEXPECTED_LOGIN_MESSAGE;
}
