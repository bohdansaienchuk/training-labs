import test, { afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React, { act } from "react";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:3000/workouts/10/active?session=100" });
for (const name of ["window", "document", "HTMLElement", "HTMLInputElement", "Element", "Node", "MouseEvent", "Event", "MutationObserver", "navigator"]) {
  Object.defineProperty(globalThis, name, { value: dom.window[name], configurable: true });
}
globalThis.self = dom.window;
globalThis.requestAnimationFrame = (callback) => callback();
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { createRoot, hydrateRoot } = await import("react-dom/client");
const { renderToString } = await import("react-dom/server");
const { AppRouterContext } = await import("next/dist/shared/lib/app-router-context.shared-runtime.js");
const { default: ActiveWorkoutClient } = await import("../app/workouts/[id]/active/active-workout-client.tsx");

let root;
let container;
let pushed;
let calls;
let session;
const router = { back() {}, forward() {}, refresh() {}, replace() {}, prefetch() {}, push(href) { pushed.push(href); } };

function initialSession() {
  return {
    id: "100", workoutId: "10", workoutName: "Database workout", startedAt: new Date(Date.now() - 65_000).toISOString(),
    exercises: [{
      id: "200", exerciseId: "20", name: "Bench", category: "Chest", position: 1,
      previousSets: [],
      sets: [
        { id: "300", sessionExerciseId: "200", setNumber: 1, weight: null, weightUnit: "kg", reps: null, rir: "", completed: false },
        { id: "301", sessionExerciseId: "200", setNumber: 2, weight: null, weightUnit: "kg", reps: null, rir: "", completed: false },
      ],
    }],
  };
}

function view(overrides = {}) {
  const props = {
    initialSession: session,
    initialNow: Date.now(),
    saveSetAction: async (...args) => { calls.save.push(args); return { ok: true, value: { completed: args[2].weight !== null && args[2].reps !== null && args[2].rir !== "" } }; },
    addSetAction: async (...args) => { calls.add.push(args); return { ok: true, value: { id: "302", setNumber: 3 } }; },
    removeSetAction: async (...args) => { calls.remove.push(args); return { ok: true, value: true }; },
    finishAction: async (...args) => { calls.finish.push(args); return { ok: true, value: "100" }; },
    ...overrides,
  };
  return React.createElement(AppRouterContext.Provider, { value: router }, React.createElement(ActiveWorkoutClient, props));
}

async function click(element) { assert.ok(element); await act(async () => element.click()); }
async function input(label, value) {
  const element = document.querySelector(`[aria-label="${label}"]`);
  assert.ok(element);
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function wait(milliseconds) { await act(async () => new Promise((resolve) => setTimeout(resolve, milliseconds))); }
const button = (label) => [...document.querySelectorAll("button")].find((item) => item.textContent.includes(label));

beforeEach(async () => {
  pushed = [];
  calls = { save: [], add: [], remove: [], finish: [] };
  session = initialSession();
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(view()));
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

test("Active renders an authoritative elapsed timer, empty actuals, and a clean no-history state", () => {
  assert.match(document.querySelector('[aria-label="Тривалість тренування"]').textContent, /^01:0[5-9]$/);
  assert.deepEqual([...document.querySelectorAll('input[aria-label^="Вага"]')].map((item) => item.value), ["", ""]);
  assert.equal(document.body.textContent.includes("Немає попередніх результатів"), true);
  assert.equal(document.body.textContent.includes("80"), false);
});

test("Active hydrates with the same initial timer text rendered by the server", async () => {
  const hydrationContainer = document.createElement("div");
  const recoverableErrors = [];
  const originalNow = Date.now;
  let hydratedRoot;
  try {
    Date.now = () => 1_000_000;
    session = initialSession();
    const serverHtml = renderToString(view({ initialNow: 1_000_000 }));
    hydrationContainer.innerHTML = serverHtml;

    Date.now = () => 1_002_000;
    await act(async () => {
      hydratedRoot = hydrateRoot(hydrationContainer, view({ initialNow: 1_000_000 }), {
        onRecoverableError: (error, info) => recoverableErrors.push({ error, info }),
      });
      await Promise.resolve();
    });
    await act(async () => new Promise((resolve) => setTimeout(resolve, 10)));

    assert.deepEqual(recoverableErrors, []);
    assert.equal(hydrationContainer.querySelector('[aria-label="Тривалість тренування"]').textContent, "01:07");
  } finally {
    Date.now = originalNow;
    if (hydratedRoot) await act(async () => hydratedRoot.unmount());
  }
});

test("Finish highlights only missing fields per row, stays put, and errors clear as each row becomes valid", async () => {
  await click(button("Завершити тренування"));
  assert.equal(calls.finish.length, 0);
  assert.equal(document.querySelectorAll('[aria-invalid="true"]').length, 6);
  assert.deepEqual([...document.querySelectorAll('[role="alert"]')].map((item) => item.textContent), ["Заповніть всі клітинки", "Заповніть всі клітинки"]);

  await input("Вага, підхід 1", "80");
  await input("Повтори, підхід 1", "8");
  assert.equal(document.querySelector('[aria-label="Вага, підхід 1"]').getAttribute("aria-invalid"), "false");
  assert.equal(document.querySelectorAll('[role="alert"]').length, 2);
  await input("Запас, підхід 1", "2");
  assert.equal(document.querySelectorAll('[role="alert"]').length, 1);
  assert.equal(pushed.length, 0);
});

test("Debounced edits persist one final valid row and a remount-shaped session restores it", async () => {
  await input("Вага, підхід 1", "90");
  await input("Повтори, підхід 1", "10");
  await input("Запас, підхід 1", "1");
  await wait(450);
  assert.equal(calls.save.length, 1);
  assert.deepEqual(calls.save[0].slice(0, 2), ["10", "100"]);
  assert.deepEqual(calls.save[0][2], { id: "300", sessionExerciseId: "200", weight: 90, weightUnit: "kg", reps: 10, rir: "1" });

  session = initialSession();
  Object.assign(session.exercises[0].sets[0], { weight: 90, reps: 10, rir: "1", completed: true });
  await act(async () => root.unmount());
  root = createRoot(container);
  await act(async () => root.render(view()));
  assert.equal(document.querySelector('[aria-label="Вага, підхід 1"]').value, "90");
  assert.equal(document.querySelector('[aria-label="Повтори, підхід 1"]').value, "10");
  assert.equal(document.querySelector('[aria-label="Запас, підхід 1"]').value, "1");
});

test("Add and Remove persist immediately with retry identity and preserve the one-set minimum", async () => {
  await click(button("Додати підхід"));
  assert.deepEqual(calls.add, [["10", "100", "200", "301"]]);
  assert.equal(document.querySelectorAll('input[aria-label^="Вага"]').length, 3);
  await click(button("Видалити підхід"));
  assert.deepEqual(calls.remove, [["10", "100", "200", "302"]]);
  assert.equal(document.querySelectorAll('input[aria-label^="Вага"]').length, 2);
});

test("A fully valid workout finishes once and routes only after the async transaction succeeds", async () => {
  for (const number of [1, 2]) {
    await input(`Вага, підхід ${number}`, String(80 + number));
    await input(`Повтори, підхід ${number}`, "8");
    await input(`Запас, підхід ${number}`, "2");
  }
  let resolveFinish;
  const finishAction = (...args) => {
    calls.finish.push(args);
    return new Promise((resolve) => { resolveFinish = resolve; });
  };
  await act(async () => root.render(view({ finishAction })));
  const finish = button("Завершити тренування");
  await act(async () => {
    finish.click();
    finish.click();
    await Promise.resolve();
  });
  assert.equal(calls.finish.length, 1);
  assert.deepEqual(pushed, []);
  await act(async () => resolveFinish({ ok: true, value: "100" }));
  assert.deepEqual(pushed, ["/workouts/10/completed?session=100"]);
});

test("Save failures retain entered values and remain visibly retryable", async () => {
  await act(async () => root.render(view({ saveSetAction: async (...args) => { calls.save.push(args); return { ok: false, error: "Не вдалося зберегти зміни" }; } })));
  await input("Вага, підхід 1", "75");
  await wait(450);
  assert.equal(document.body.textContent.includes("Не вдалося зберегти зміни"), true);
  assert.equal(document.querySelector('[aria-label="Вага, підхід 1"]').value, "75");
  assert.deepEqual(pushed, []);
});

test("Finish failures retain every entered value, stay Active, and allow retry", async () => {
  for (const number of [1, 2]) {
    await input(`Вага, підхід ${number}`, String(70 + number));
    await input(`Повтори, підхід ${number}`, "7");
    await input(`Запас, підхід ${number}`, "1");
  }
  let attempts = 0;
  const finishAction = async (...args) => {
    calls.finish.push(args);
    attempts += 1;
    return attempts === 1 ? { ok: false, error: "Не вдалося завершити тренування" } : { ok: true, value: "100" };
  };
  await act(async () => root.render(view({ finishAction })));
  await click(button("Завершити тренування"));
  assert.deepEqual(pushed, []);
  assert.equal(document.body.textContent.includes("Не вдалося завершити тренування"), true);
  assert.equal(document.querySelector('[aria-label="Вага, підхід 1"]').value, "71");
  await click(button("Завершити тренування"));
  assert.deepEqual(pushed, ["/workouts/10/completed?session=100"]);
});
