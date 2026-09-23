import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  getRedirectUrl,
  unstable_doesMiddlewareMatch,
} from "next/experimental/testing/server";
import { proxy, config } from "../proxy.ts";
import { authenticatedPageRedirect } from "../lib/route-protection.ts";
import { resolveCurrentUser } from "../lib/current-user-core.ts";

const origin = "http://localhost:3000";

test("proxy matches every protected application page family", () => {
  for (const path of [
    "/",
    "/workouts",
    "/workouts/new",
    "/workouts/5",
    "/workouts/5/edit",
    "/workouts/5/active",
    "/workouts/5/completed",
    "/exercises",
    "/exercises/3",
    "/progress",
    "/logout",
  ]) {
    assert.equal(
      unstable_doesMiddlewareMatch({ config, url: `${origin}${path}` }),
      true,
      path,
    );
  }
});

test("public routes, static assets, and unknown routes are not intercepted", () => {
  for (const path of [
    "/login",
    "/api/auth/get-session",
    "/_next/static/chunks/app.js",
    "/_next/image?url=%2Fimages%2Flogin%2Fathlete.png",
    "/images/login/athlete.png",
    "/favicon.ico",
    "/unknown-route",
  ]) {
    assert.equal(
      unstable_doesMiddlewareMatch({ config, url: `${origin}${path}` }),
      false,
      path,
    );
  }
});

test("missing optimistic auth cookie redirects to login with the local destination", () => {
  const response = proxy(new NextRequest(`${origin}/workouts/5?tab=sets`));
  assert.equal(response.status, 307);
  assert.equal(
    getRedirectUrl(response),
    `${origin}/login?next=%2Fworkouts%2F5%3Ftab%3Dsets`,
  );
});

test("Better Auth development and secure session cookies pass the optimistic gate", () => {
  for (const cookieName of [
    "better-auth.session_token",
    "__Secure-better-auth.session_token",
  ]) {
    const response = proxy(new NextRequest(`${origin}/workouts`, {
      headers: { cookie: `${cookieName}=optimistic-only` },
    }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("x-middleware-next"), "1");
  }
});

test("authoritative boundary accepts a valid session and live User", async () => {
  const user = await resolveCurrentUser(
    async () => ({ user: { id: "1" } }),
    async () => ({ id: 1, email: "test@traininglabs.local", name: "Test User" }),
  );
  assert.equal(authenticatedPageRedirect(user), null);
});

test("authoritative boundary rejects missing, revoked, malformed, and deleted-User sessions", async () => {
  const cases = [
    await resolveCurrentUser(async () => null, async () => assert.fail("missing session queried User")),
    await resolveCurrentUser(async () => null, async () => assert.fail("revoked session queried User")),
    await resolveCurrentUser(
      async () => ({ user: { id: "malformed" } }),
      async () => assert.fail("malformed session queried User"),
    ),
    await resolveCurrentUser(
      async () => ({ user: { id: "1" } }),
      async () => null,
    ),
  ];

  for (const user of cases) {
    assert.equal(authenticatedPageRedirect(user), "/login");
  }
});
