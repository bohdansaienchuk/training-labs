"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

type SignOut = () => Promise<{ error?: unknown } | void>;

export function LogoutButtonControl({
  signOut,
  onSignedOut,
}: {
  signOut: SignOut;
  onSignedOut: () => void;
}) {
  const submitting = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function logout() {
    if (submitting.current) return;
    submitting.current = true;
    setPending(true);
    setError(false);
    try {
      const result = await signOut();
      if (result && result.error) {
        setError(true);
        return;
      }
      onSignedOut();
    } catch {
      setError(true);
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={pending}
        aria-busy={pending}
        onClick={() => { void logout(); }}
        className="type-button inline-flex min-h-12 items-center justify-center rounded-12 bg-primary-500 px-6 py-3.5 text-neutral-950 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary-500"
      >
        Вийти
      </button>
      {error && <p role="alert" className="type-caption text-error">Не вдалося вийти. Спробуйте ще раз.</p>}
    </div>
  );
}

export function LogoutButton() {
  const router = useRouter();
  return (
    <LogoutButtonControl
      signOut={() => authClient.signOut()}
      onSignedOut={() => {
        router.replace("/login");
        router.refresh();
      }}
    />
  );
}
