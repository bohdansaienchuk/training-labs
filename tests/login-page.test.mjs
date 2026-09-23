import test from "node:test";
import assert from "node:assert/strict";
import { authenticatedLoginDestination } from "../lib/login-page.ts";

test("authenticated /login visits redirect to Home", () => {
  assert.equal(authenticatedLoginDestination({ id: 1, email: "test@traininglabs.local", name: "Test User" }), "/");
});

test("unauthenticated visitors may render /login", () => {
  assert.equal(authenticatedLoginDestination(null), null);
});
