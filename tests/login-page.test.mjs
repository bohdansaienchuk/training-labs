import test from "node:test";
import assert from "node:assert/strict";
import {
  authenticatedLoginDestination,
  loginSuccessDestination,
  safeNextPath,
} from "../lib/login-page.ts";

test("authenticated /login visits redirect to Home", () => {
  assert.equal(authenticatedLoginDestination({ id: 1, email: "test@traininglabs.local", name: "Test User" }), "/");
});

test("unauthenticated visitors may render /login", () => {
  assert.equal(authenticatedLoginDestination(null), null);
});

test("safe local next paths are preserved for login success", () => {
  assert.equal(safeNextPath("/workouts/5?tab=sets"), "/workouts/5?tab=sets");
  assert.equal(loginSuccessDestination("/exercises/2"), "/exercises/2");
  assert.equal(
    authenticatedLoginDestination(
      { id: 1, email: "test@traininglabs.local", name: "Test User" },
      "/progress",
    ),
    "/progress",
  );
});

test("unsafe next paths fall back to Home", () => {
  for (const value of [
    "https://evil.example",
    "//evil.example",
    "javascript:alert(1)",
    "/\\evil.example",
    "/%5cevil.example",
    "/%2f%2fevil.example",
    "/%255cevil.example",
    "/%252f%252fevil.example",
    " /workouts",
    ["/workouts"],
  ]) {
    assert.equal(safeNextPath(value), null);
    assert.equal(loginSuccessDestination(value), "/");
  }
});
