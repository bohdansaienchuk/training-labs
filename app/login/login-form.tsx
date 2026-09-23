"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/input";
import { authClient } from "@/lib/auth-client";
import {
  classifySignInError,
  INVALID_CREDENTIALS_MESSAGE,
  loginErrorMessage,
  type LoginAttemptResult,
  UNEXPECTED_LOGIN_MESSAGE,
  validateLoginInput,
} from "@/lib/login-policy";

type Authenticate = (email: string, password: string) => Promise<LoginAttemptResult>;

async function authenticateWithBetterAuth(email: string, password: string): Promise<LoginAttemptResult> {
  try {
    const { error } = await authClient.signIn.email({ email, password, rememberMe: true });
    return error ? classifySignInError(error) : "success";
  } catch {
    return "unexpected-error";
  }
}

export function LoginFormControl({
  authenticate,
  onAuthenticated,
}: {
  authenticate: Authenticate;
  onAuthenticated: () => void;
}) {
  const submitting = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;

    const form = new FormData(event.currentTarget);
    const emailValue = form.get("email");
    const passwordValue = form.get("password");
    const credentials = validateLoginInput(
      typeof emailValue === "string" ? emailValue : "",
      typeof passwordValue === "string" ? passwordValue : "",
    );

    if (!credentials) {
      setError(INVALID_CREDENTIALS_MESSAGE);
      return;
    }

    submitting.current = true;
    setPending(true);
    setError(null);
    try {
      const result = await authenticate(credentials.email, credentials.password);
      if (result === "success") {
        onAuthenticated();
        return;
      }
      setError(loginErrorMessage(result));
    } catch {
      setError(UNEXPECTED_LOGIN_MESSAGE);
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  const errorAttributes = error
    ? { "aria-describedby": "login-error", "aria-invalid": true as const }
    : {};

  return (
    <form
      className="relative z-10 flex w-full shrink-0 flex-col items-center gap-8 px-8"
      onSubmit={(event) => { void submit(event); }}
      aria-busy={pending}
      noValidate
    >
      <Input
        id="login-email"
        name="email"
        label="Логін"
        placeholder="Введіть логін"
        type="email"
        autoComplete="email"
        inputMode="email"
        maxLength={254}
        required
        {...errorAttributes}
      />
      <div className="relative w-full">
        <Input
          id="login-password"
          name="password"
          label="Пароль"
          placeholder="Введіть пароль"
          type="password"
          autoComplete="current-password"
          maxLength={128}
          required
          {...errorAttributes}
        />
        {error && (
          <p id="login-error" role="alert" aria-live="polite" className="type-caption absolute top-full mt-2 text-error">
            {error}
          </p>
        )}
      </div>
      <button
        type="submit"
        disabled={pending}
        aria-busy={pending}
        className="type-button inline-flex min-h-12 items-center justify-center rounded-12 bg-primary-500 px-6 py-3.5 text-neutral-950 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500"
      >
        Увійти
      </button>
    </form>
  );
}

export default function LoginForm() {
  const router = useRouter();
  return (
    <LoginFormControl
      authenticate={authenticateWithBetterAuth}
      onAuthenticated={() => {
        router.replace("/");
        router.refresh();
      }}
    />
  );
}
