import test, { afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React, { act } from "react";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:3000/workouts/new" });
for (const name of ["window", "document", "HTMLElement", "HTMLInputElement", "Element", "Node", "MouseEvent", "Event", "MutationObserver", "navigator"]) {
  Object.defineProperty(globalThis, name, { value: dom.window[name], configurable: true });
}
globalThis.self = dom.window;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { createRoot } = await import("react-dom/client");
const { AppRouterContext } = await import("next/dist/shared/lib/app-router-context.shared-runtime.js");
const { default: CreateWorkoutClient } = await import("../app/(authenticated)/workouts/new/create-workout-client.tsx");

let root;
let container;
let pushed;
const catalog = [
  { id: "10", name: "Bench", muscleGroups: "Chest" },
  { id: "12", name: "Row", muscleGroups: "Back" },
];
const router = {
  back() {}, forward() {}, refresh() {}, replace() {}, prefetch() {},
  push(href) { pushed.push(href); },
};

function screen(createAction) {
  return React.createElement(AppRouterContext.Provider, { value: router },
    React.createElement(CreateWorkoutClient, { catalog, createAction }),
  );
}

async function input(element, value) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function addBench() {
  const search = document.querySelector('input[placeholder="Знайти вправу"]');
  await act(async () => search.focus());
  await input(search, "Bench");
  await act(async () => document.querySelector('[aria-label="Додати вправу Bench"]').click());
}

async function flush() {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
}

beforeEach(() => {
  pushed = [];
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

test("Create starts empty, submits database-backed exercise IDs once, and navigates only after success", async () => {
  let finishCreate;
  let calls = 0;
  let submitted;
  const createAction = (draft) => {
    calls += 1;
    submitted = structuredClone(draft);
    return new Promise((resolve) => { finishCreate = resolve; });
  };
  await act(async () => root.render(screen(createAction)));
  assert.equal(document.querySelectorAll("section h3").length, 0, "latest Figma Create state starts without a selected exercise");
  await input(document.querySelector('input[placeholder="Назва тренування"]'), "Training B");
  await addBench();
  await input(document.querySelector('input[aria-label="Вага, підхід 1"]'), "55");
  await input(document.querySelector('input[aria-label="Повтори, підхід 1"]'), "8");

  const save = [...document.querySelectorAll("button")].find((button) => button.textContent.includes("Зберегти тренування"));
  await act(async () => { save.click(); save.click(); });
  assert.equal(calls, 1, "the in-flight guard must prevent duplicate Workout creation");
  assert.equal(save.disabled, true);
  assert.equal(pushed.length, 0, "navigation must wait for the PostgreSQL action");
  assert.equal(submitted.name, "Training B");
  assert.deepEqual(submitted.exercises.map((exercise) => exercise.exerciseId), ["10"]);
  assert.deepEqual(submitted.exercises[0].plannedSets.map((set) => [set.weight, set.reps]), [[55, 8]]);

  await act(async () => finishCreate({ ...submitted, id: "100" }));
  assert.deepEqual(pushed, ["/workouts"]);
});

test("failed creation preserves the full client draft, shows an error, and allows retry", async () => {
  let calls = 0;
  const createAction = async (draft) => {
    calls += 1;
    if (calls === 1) throw new Error("database unavailable");
    return { ...draft, id: "101" };
  };
  await act(async () => root.render(screen(createAction)));
  await input(document.querySelector('input[placeholder="Назва тренування"]'), "Retry Workout");
  await addBench();
  await input(document.querySelector('input[aria-label="Вага, підхід 1"]'), "62.5");
  const save = [...document.querySelectorAll("button")].find((button) => button.textContent.includes("Зберегти тренування"));

  await act(async () => save.click());
  await flush();
  assert.equal(document.querySelector('[role="alert"]').textContent, "Не вдалося зберегти тренування");
  assert.equal(document.querySelector('input[placeholder="Назва тренування"]').value, "Retry Workout");
  assert.equal(document.querySelector("section h3").textContent, "Bench");
  assert.equal(document.querySelector('input[aria-label="Вага, підхід 1"]').value, "62.5");
  assert.equal(save.disabled, false);
  assert.deepEqual(pushed, []);

  await act(async () => save.click());
  await flush();
  assert.equal(calls, 2);
  assert.deepEqual(pushed, ["/workouts"]);
});
