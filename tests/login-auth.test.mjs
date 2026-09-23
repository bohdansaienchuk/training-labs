import test from "node:test";
import assert from "node:assert/strict";
import { memoryAdapter } from "better-auth/adapters/memory";
import { hashPassword } from "better-auth/crypto";
import { betterAuth } from "better-auth/minimal";
import { createAuthOptions } from "../lib/auth-options.ts";
import {
  classifySignInError,
  INVALID_CREDENTIALS_MESSAGE,
  loginErrorMessage,
  normalizeLoginEmail,
  validateLoginInput,
} from "../lib/login-policy.ts";

const origin = "http://localhost:3000";
const email = "test@traininglabs.local";
const password = "not-a-real-credential-123!";

function request(path, body, cookie) {
  return new Request(`${origin}/api/auth${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin,
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function authFixture() {
  const now = new Date();
  const database = {
    user: [{ id: 1, name: "Test User", email, emailVerified: false, image: null, createdAt: now, updatedAt: now }],
    account: [{
      id: 1,
      accountId: "1",
      providerId: "credential",
      userId: 1,
      password: await hashPassword(password),
      accessToken: null,
      refreshToken: null,
      idToken: null,
      accessTokenExpiresAt: null,
      refreshTokenExpiresAt: null,
      scope: null,
      createdAt: now,
      updatedAt: now,
    }],
    session: [],
    verification: [],
  };
  const auth = betterAuth(createAuthOptions(memoryAdapter(database), {
    NODE_ENV: "test",
    BETTER_AUTH_URL: origin,
    BETTER_AUTH_SECRET: "test-only-secret-that-is-at-least-32-characters",
  }));
  return { auth, database };
}

test("login policy normalizes email and rejects missing or unsafe input lengths", () => {
  assert.equal(normalizeLoginEmail("  TEST@TrainingLabs.Local "), email);
  assert.deepEqual(validateLoginInput("  TEST@TrainingLabs.Local ", password), { email, password });
  for (const credentials of [["", password], [email, ""], ["invalid", password], [email, "short"]]) {
    assert.equal(validateLoginInput(credentials[0], credentials[1]), null);
  }
});

test("invalid Better Auth responses map to one generic Ukrainian UI error", () => {
  for (const error of [
    { status: 400, message: "user not found" },
    { status: 401, message: "invalid password" },
    { status: 403, message: "credential disabled" },
  ]) {
    const result = classifySignInError(error);
    assert.equal(result, "invalid-credentials");
    assert.equal(loginErrorMessage(result), INVALID_CREDENTIALS_MESSAGE);
    assert.equal(loginErrorMessage(result).includes(error.message), false);
  }
  assert.equal(classifySignInError({ status: 500, message: "database details" }), "unexpected-error");
});

test("valid Better Auth credentials create a database session and logout revokes it", async () => {
  const { auth, database } = await authFixture();
  const signIn = await auth.handler(request("/sign-in/email", { email, password, rememberMe: true }));

  assert.equal(signIn.status, 200);
  assert.equal(database.session.length, 1);
  const body = await signIn.clone().json();
  assert.equal(body.user.email, email);
  assert.equal("password" in body, false);
  assert.equal("password" in body.user, false);

  const setCookies = signIn.headers.getSetCookie();
  assert.ok(setCookies.some((value) => value.includes("session_token=")));
  assert.equal(setCookies.join(";").includes(password), false);
  assert.equal(setCookies.join(";").includes(database.account[0].password), false);
  const cookie = setCookies.map((value) => value.split(";", 1)[0]).join("; ");

  const signOut = await auth.handler(request("/sign-out", {}, cookie));
  assert.equal(signOut.status, 200);
  assert.equal(database.session.length, 0);
  assert.ok(signOut.headers.getSetCookie().some((value) => /session_token=.*Max-Age=0/i.test(value)));
});

test("unknown email and incorrect password create no session", async () => {
  for (const body of [
    { email: "missing@example.com", password, rememberMe: true },
    { email, password: "incorrect-but-long-enough", rememberMe: true },
  ]) {
    const { auth, database } = await authFixture();
    const response = await auth.handler(request("/sign-in/email", body));
    assert.ok(response.status === 400 || response.status === 401);
    assert.equal(database.session.length, 0);
  }
});

test("public signup remains disabled", async () => {
  const { auth, database } = await authFixture();
  const response = await auth.handler(request("/sign-up/email", {
    name: "Blocked",
    email: "blocked@example.com",
    password,
  }));
  assert.equal(response.status, 400);
  assert.equal((await response.json()).code, "EMAIL_PASSWORD_SIGN_UP_DISABLED");
  assert.equal(database.user.length, 1);
  assert.equal(database.account.length, 1);
});
