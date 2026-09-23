import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:3000/login" });
for (const name of ["window", "document", "navigator", "HTMLElement", "HTMLInputElement", "Event", "FormData"]) {
  Object.defineProperty(globalThis, name, { value: dom.window[name], configurable: true });
}
globalThis.self = dom.window;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const React = await import("react");
const { act } = React;
const { createRoot } = await import("react-dom/client");
const { LoginFormControl } = await import("../app/login/login-form.tsx");
const { LogoutButtonControl } = await import("../components/logout-button.tsx");
const { INVALID_CREDENTIALS_MESSAGE, UNEXPECTED_LOGIN_MESSAGE } = await import("../lib/login-policy.ts");

let root;

afterEach(async () => {
  if (root) await act(async () => root.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

async function render(element) {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => root.render(element));
  return container;
}

function setInput(input, value) {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(input, value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

async function submit(form) {
  await act(async () => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
}

test("Login form preserves semantics, normalizes email, and navigates on success", async () => {
  const attempts = [];
  let authenticated = 0;
  const container = await render(React.createElement(LoginFormControl, {
    authenticate: async (...credentials) => {
      attempts.push(credentials);
      return "success";
    },
    onAuthenticated: () => { authenticated += 1; },
  }));

  const email = container.querySelector('input[name="email"]');
  const password = container.querySelector('input[name="password"]');
  assert.equal(email.type, "email");
  assert.equal(email.autocomplete, "email");
  assert.equal(password.type, "password");
  assert.equal(password.autocomplete, "current-password");

  setInput(email, "  TEST@TrainingLabs.Local ");
  setInput(password, "not-a-real-credential-123!");
  await submit(container.querySelector("form"));

  assert.deepEqual(attempts, [["test@traininglabs.local", "not-a-real-credential-123!"]]);
  assert.equal(authenticated, 1);
  assert.equal(container.textContent.includes("not-a-real-credential-123!"), false);
});

test("missing fields are rejected without an auth request", async () => {
  let attempts = 0;
  const container = await render(React.createElement(LoginFormControl, {
    authenticate: async () => { attempts += 1; return "success"; },
    onAuthenticated: () => assert.fail("Missing credentials must not authenticate"),
  }));

  await submit(container.querySelector("form"));
  assert.equal(attempts, 0);
  assert.equal(container.querySelector('[role="alert"]').textContent, INVALID_CREDENTIALS_MESSAGE);
  assert.equal(container.querySelector('input[name="email"]').getAttribute("aria-invalid"), "true");
});

test("invalid credentials show one generic message and never raw Better Auth details", async () => {
  const container = await render(React.createElement(LoginFormControl, {
    authenticate: async () => "invalid-credentials",
    onAuthenticated: () => assert.fail("Invalid credentials must not authenticate"),
  }));
  setInput(container.querySelector('input[name="email"]'), "missing@example.com");
  setInput(container.querySelector('input[name="password"]'), "not-a-real-credential-123!");
  await submit(container.querySelector("form"));

  assert.equal(container.querySelector('[role="alert"]').textContent, INVALID_CREDENTIALS_MESSAGE);
  assert.equal(container.textContent.includes("USER_NOT_FOUND"), false);
  assert.equal(container.textContent.includes("INVALID_PASSWORD"), false);
});

test("unexpected login failures use the safe fallback copy", async () => {
  const container = await render(React.createElement(LoginFormControl, {
    authenticate: async () => { throw new Error("database connection details"); },
    onAuthenticated: () => assert.fail("Failed login must not authenticate"),
  }));
  setInput(container.querySelector('input[name="email"]'), "test@traininglabs.local");
  setInput(container.querySelector('input[name="password"]'), "not-a-real-credential-123!");
  await submit(container.querySelector("form"));
  assert.equal(container.querySelector('[role="alert"]').textContent, UNEXPECTED_LOGIN_MESSAGE);
  assert.equal(container.textContent.includes("database connection details"), false);
});

test("pending login disables the button and guards duplicate submission", async () => {
  let attempts = 0;
  let resolveAttempt;
  const waiting = new Promise((resolve) => { resolveAttempt = resolve; });
  const container = await render(React.createElement(LoginFormControl, {
    authenticate: async () => { attempts += 1; return waiting; },
    onAuthenticated: () => {},
  }));
  setInput(container.querySelector('input[name="email"]'), "test@traininglabs.local");
  setInput(container.querySelector('input[name="password"]'), "not-a-real-credential-123!");
  const form = container.querySelector("form");

  await act(async () => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await Promise.resolve();
  });
  assert.equal(attempts, 1);
  assert.equal(container.querySelector("button").disabled, true);
  assert.equal(form.getAttribute("aria-busy"), "true");

  await act(async () => { resolveAttempt("invalid-credentials"); await waiting; });
  assert.equal(container.querySelector("button").disabled, false);
});

test("Logout control invalidates once and invokes post-logout navigation", async () => {
  let calls = 0;
  let navigations = 0;
  const container = await render(React.createElement(LogoutButtonControl, {
    signOut: async () => { calls += 1; return {}; },
    onSignedOut: () => { navigations += 1; },
  }));
  await act(async () => container.querySelector("button").click());
  assert.equal(calls, 1);
  assert.equal(navigations, 1);
});
