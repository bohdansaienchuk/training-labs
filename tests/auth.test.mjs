import test from "node:test";
import assert from "node:assert/strict";
import { memoryAdapter } from "better-auth/adapters/memory";
import { betterAuth } from "better-auth/minimal";
import {
  AUTH_PASSWORD_MAX_LENGTH,
  AUTH_PASSWORD_MIN_LENGTH,
  AUTH_SESSION_EXPIRES_IN,
  AUTH_SESSION_UPDATE_AGE,
  createAuthOptions,
  resolveAuthEnvironment,
} from "../lib/auth-options.ts";
import {
  authUserIdToInteger,
  requireResolvedUser,
  resolveCurrentUser,
  UnauthenticatedError,
} from "../lib/current-user-core.ts";

const testEnvironment = {
  NODE_ENV: "test",
  BETTER_AUTH_URL: "http://localhost:3000",
  BETTER_AUTH_SECRET: "test-only-secret-that-is-at-least-32-characters",
};

test("numeric Better Auth user IDs are converted strictly to Prisma integers", () => {
  assert.equal(authUserIdToInteger("1"), 1);
  for (const value of ["1abc", "1.5", "-1", "0", "", "01", "2147483648", "9007199254740992", 1, null, undefined]) {
    assert.throws(() => authUserIdToInteger(value), { name: "InvalidAuthUserIdError" });
  }
});

test("auth configuration enables credentials, database sessions, serial IDs, and signup denial", () => {
  const options = createAuthOptions(memoryAdapter({ user: [], session: [], account: [], verification: [] }), testEnvironment);

  assert.deepEqual(options.emailAndPassword, {
    enabled: true,
    disableSignUp: true,
    requireEmailVerification: false,
    minPasswordLength: AUTH_PASSWORD_MIN_LENGTH,
    maxPasswordLength: AUTH_PASSWORD_MAX_LENGTH,
  });
  assert.deepEqual(options.session, {
    expiresIn: AUTH_SESSION_EXPIRES_IN,
    updateAge: AUTH_SESSION_UPDATE_AGE,
    cookieCache: { enabled: false },
  });
  assert.equal(options.advanced.database.generateId, "serial");
  assert.equal(options.rateLimit.enabled, true);
  assert.equal(options.rateLimit.storage, "memory");
});

test("production auth configuration requires a strong secret and HTTPS origin", () => {
  assert.throws(() => resolveAuthEnvironment({ NODE_ENV: "production" }), /BETTER_AUTH_URL/);
  assert.throws(
    () => resolveAuthEnvironment({ NODE_ENV: "production", BETTER_AUTH_URL: "https://training.example" }),
    /BETTER_AUTH_SECRET/,
  );
  assert.throws(
    () => resolveAuthEnvironment({ NODE_ENV: "production", BETTER_AUTH_URL: "http://training.example", BETTER_AUTH_SECRET: "x".repeat(32) }),
    /HTTPS/,
  );
});

test("public email signup is disabled at the Better Auth endpoint", async () => {
  const database = { user: [], session: [], account: [], verification: [] };
  const auth = betterAuth(createAuthOptions(memoryAdapter(database), testEnvironment));
  const response = await auth.handler(new Request("http://localhost:3000/api/auth/sign-up/email", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000" },
    body: JSON.stringify({
      name: "Blocked caller",
      email: "blocked@example.com",
      password: "not-a-real-credential-123!",
    }),
  }));

  assert.equal(response.status, 400);
  assert.equal(database.user.length, 0);
  assert.equal(database.account.length, 0);
  const body = await response.json();
  assert.equal(body.code, "EMAIL_PASSWORD_SIGN_UP_DISABLED");
});

test("current user resolution revalidates the User and returns only safe fields", async () => {
  const safeUser = { id: 1, email: "test@traininglabs.local", name: "Test User" };
  let queriedId;
  const result = await resolveCurrentUser(
    async () => ({
      session: { token: "must-not-be-returned" },
      user: { id: "1", password: "must-not-be-returned" },
    }),
    async (id) => {
      queriedId = id;
      return safeUser;
    },
  );

  assert.equal(queriedId, 1);
  assert.deepEqual(result, safeUser);
  assert.deepEqual(Object.keys(result).sort(), ["email", "id", "name"]);
});

test("current user resolution returns null without a session or a live User", async () => {
  let queried = false;
  assert.equal(await resolveCurrentUser(async () => null, async () => {
    queried = true;
    return null;
  }), null);
  assert.equal(queried, false);

  assert.equal(await resolveCurrentUser(async () => ({ user: { id: "1" } }), async () => null), null);
  assert.equal(await resolveCurrentUser(async () => ({ user: { id: "malformed" } }), async () => {
    assert.fail("Malformed session identity must not reach Prisma");
  }), null);
});

test("requireResolvedUser returns the user or throws a stable unauthenticated error", async () => {
  const user = { id: 1, email: "test@traininglabs.local", name: "Test User" };
  assert.equal(await requireResolvedUser(async () => user), user);
  await assert.rejects(
    requireResolvedUser(async () => null),
    (error) => error instanceof UnauthenticatedError && error.code === "UNAUTHENTICATED" && error.status === 401,
  );
});
