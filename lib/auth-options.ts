import type { BetterAuthOptions } from "better-auth";

export const AUTH_SESSION_EXPIRES_IN = 60 * 60 * 24 * 7;
export const AUTH_SESSION_UPDATE_AGE = 60 * 60 * 24;
export const AUTH_PASSWORD_MIN_LENGTH = 12;
export const AUTH_PASSWORD_MAX_LENGTH = 128;

type AuthEnvironment = {
  BETTER_AUTH_SECRET?: string;
  BETTER_AUTH_URL?: string;
  NODE_ENV?: string;
};

export type AuthRuntimeEnvironment = {
  baseURL: string;
  isProduction: boolean;
  secret?: string;
};

export function resolveAuthEnvironment(
  environment: AuthEnvironment = process.env,
): AuthRuntimeEnvironment {
  const isProduction = environment.NODE_ENV === "production";
  const configuredURL = environment.BETTER_AUTH_URL?.trim();
  const secret = environment.BETTER_AUTH_SECRET?.trim();

  if (isProduction && !configuredURL) {
    throw new Error("BETTER_AUTH_URL is required in production");
  }
  if (isProduction && !secret) {
    throw new Error("BETTER_AUTH_SECRET is required in production");
  }
  if (secret && secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must be at least 32 characters");
  }

  const parsedURL = new URL(configuredURL || "http://localhost:3000");
  if (!["http:", "https:"].includes(parsedURL.protocol)) {
    throw new Error("BETTER_AUTH_URL must use HTTP or HTTPS");
  }
  if (parsedURL.username || parsedURL.password || parsedURL.search || parsedURL.hash) {
    throw new Error("BETTER_AUTH_URL must be a plain application origin");
  }
  if (parsedURL.pathname !== "/") {
    throw new Error("BETTER_AUTH_URL must not contain a path");
  }
  if (isProduction && parsedURL.protocol !== "https:") {
    throw new Error("BETTER_AUTH_URL must use HTTPS in production");
  }

  return {
    baseURL: parsedURL.origin,
    isProduction,
    ...(secret ? { secret } : {}),
  };
}

export function createAuthOptions(
  database: NonNullable<BetterAuthOptions["database"]>,
  environment: AuthEnvironment = process.env,
): BetterAuthOptions {
  const runtime = resolveAuthEnvironment(environment);

  return {
    database,
    baseURL: runtime.baseURL,
    trustedOrigins: [runtime.baseURL],
    ...(runtime.secret ? { secret: runtime.secret } : {}),
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      requireEmailVerification: false,
      minPasswordLength: AUTH_PASSWORD_MIN_LENGTH,
      maxPasswordLength: AUTH_PASSWORD_MAX_LENGTH,
    },
    session: {
      expiresIn: AUTH_SESSION_EXPIRES_IN,
      updateAge: AUTH_SESSION_UPDATE_AGE,
      cookieCache: {
        enabled: false,
      },
    },
    rateLimit: {
      enabled: true,
      storage: "memory",
      window: 60,
      max: 100,
      customRules: {
        "/sign-in/email": { window: 60, max: 5 },
        "/sign-up/email": { window: 60, max: 3 },
      },
    },
    advanced: {
      useSecureCookies: runtime.isProduction,
      database: {
        generateId: "serial",
      },
    },
  };
}
