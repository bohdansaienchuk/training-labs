import test, { afterEach, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React, { act } from "react";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:3000/workouts" });
for (const name of ["window", "document", "HTMLElement", "HTMLInputElement", "Element", "Node", "MouseEvent", "KeyboardEvent", "Event", "MutationObserver", "navigator"]) {
  Object.defineProperty(globalThis, name, { value: dom.window[name], configurable: true });
}
globalThis.self = dom.window;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const { createRoot } = await import("react-dom/client");
const { AppRouterContext } = await import("next/dist/shared/lib/app-router-context.shared-runtime.js");
const { WorkoutsClient } = await import("../app/workouts/workouts-client.tsx");

let root;
let container;
let pushed;
let refreshes;
let workouts;
const router = {
  back() {}, forward() {}, replace() {}, prefetch() {},
  push(href) { pushed.push(href); },
  refresh() { refreshes += 1; },
};
const trigger = () => document.querySelector('[aria-label="Змінити список тренувань"]');
const menu = () => document.querySelector('[role="menu"]');
const rows = () => [...document.querySelectorAll("[data-workout-select]")];
const action = (label) => [...document.querySelectorAll('[role="menuitem"]')].find((item) => item.textContent.includes(label));
const order = () => [...document.querySelectorAll('[aria-label="Мої тренування"] h2')].map((heading) => heading.textContent);

function screen(deleteAction = async (id) => ({ ok: true, value: id })) {
  return React.createElement(AppRouterContext.Provider, { value: router },
    React.createElement(WorkoutsClient, { workouts, deleteAction }),
  );
}

async function pointerDown(element) {
  assert.ok(element);
  await act(async () => element.dispatchEvent(new MouseEvent("pointerdown", { bubbles: true })));
}

async function click(element) {
  await pointerDown(element);
  await act(async () => element.click());
}

async function key(element, value) {
  await act(async () => element.dispatchEvent(new KeyboardEvent("keydown", { key: value, bubbles: true, cancelable: true })));
}

async function flush() {
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 0)); });
}

beforeEach(async () => {
  pushed = [];
  refreshes = 0;
  workouts = [
    { id: "101", name: "Workout A", exerciseCount: 1, setCount: 2 },
    { id: "205", name: "Workout B", exerciseCount: 2, setCount: 4 },
    { id: "309", name: "Workout C", exerciseCount: 3, setCount: 6 },
  ];
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: 844, configurable: true });
  await act(async () => root.render(screen()));
  trigger().getBoundingClientRect = () => ({ right: 374, bottom: 55 });
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  assert.equal(menu(), null);
});

test("three-dot opens the portaled workout Action List and selection uses stable database IDs without navigation", async () => {
  assert.deepEqual([...document.querySelectorAll("[data-workout-link]")].map((link) => [link.dataset.workoutLink, link.getAttribute("href")]), [
    ["101", "/workouts/101"], ["205", "/workouts/205"], ["309", "/workouts/309"],
  ]);
  assert.equal(document.querySelector('[data-workout-link="205"]').classList.contains("bg-neutral-50"), true);
  await click(trigger());
  const openMenu = menu();
  assert.ok(openMenu);
  assert.equal(openMenu.parentElement, document.body);
  assert.equal(openMenu.classList.contains("z-50"), true);
  assert.equal(rows().length, 3);
  const defaultRadio = rows()[0].querySelector("[data-workout-selection-radio] svg");
  assert.equal(defaultRadio.classList.contains("text-neutral-50"), true);
  assert.equal(defaultRadio.classList.contains("text-primary-100"), false);
  assert.equal(defaultRadio.querySelector("circle").getAttribute("fill"), "none");
  await click(rows().find((row) => row.dataset.workoutId === "205"));
  const selectedRow = rows().find((row) => row.dataset.workoutId === "205");
  assert.equal(menu(), openMenu);
  assert.equal(selectedRow.getAttribute("aria-pressed"), "true");
  assert.equal(selectedRow.querySelector("[data-workout-card-surface]").classList.contains("bg-neutral-50"), true);
  assert.equal(selectedRow.classList.contains("appearance-none"), true);
  assert.equal(selectedRow.classList.contains("aria-pressed:bg-transparent"), true);
  assert.equal(selectedRow.classList.contains("focus-visible:outline-neutral-50"), true);
  assert.equal(selectedRow.classList.contains("focus-visible:outline-neutral-500"), false);
  assert.equal(selectedRow.classList.contains("focus-visible:outline-primary-500"), false);
  const selectedRadio = selectedRow.querySelector("[data-workout-selection-radio] svg");
  assert.equal(selectedRadio.classList.contains("text-neutral-50"), true);
  assert.equal(selectedRadio.classList.contains("text-neutral-500"), false);
  assert.equal(selectedRadio.classList.contains("text-primary-100"), false);
  assert.equal(selectedRadio.getAttribute("fill"), "none");
  assert.equal(selectedRadio.querySelector("circle").getAttribute("fill"), "currentColor");
  await click(rows().find((row) => row.dataset.workoutId === "309"));
  const newlySelectedRow = rows().find((row) => row.dataset.workoutId === "309");
  assert.equal(selectedRow.getAttribute("aria-pressed"), "false");
  assert.equal(newlySelectedRow.getAttribute("aria-pressed"), "true");
  assert.equal(newlySelectedRow.querySelector("[data-workout-selection-radio] svg").classList.contains("text-neutral-50"), true);
  assert.deepEqual(pushed, []);
});

test("workout rows toggle selection without closing Action List and restore disabled actions", async () => {
  await click(trigger());
  const openMenu = menu();
  const rowA = rows().find((row) => row.dataset.workoutId === "101");
  const rowB = rows().find((row) => row.dataset.workoutId === "205");
  const actions = () => [...document.querySelectorAll('[role="menuitem"]')];
  assert.deepEqual(rows().map((row) => row.getAttribute("aria-pressed")), ["false", "false", "false"]);
  assert.equal(actions().every((item) => item.disabled), true);

  await click(rowA);
  assert.equal(menu(), openMenu);
  assert.equal(rowA.getAttribute("aria-pressed"), "true");
  assert.equal(action("Редагувати тренування").disabled, false);
  assert.equal(action("Видалити тренування").disabled, false);

  await click(rowA);
  assert.equal(menu(), openMenu);
  assert.deepEqual(rows().map((row) => row.getAttribute("aria-pressed")), ["false", "false", "false"]);
  assert.equal(actions().every((item) => item.disabled), true);

  await click(rowA);
  await click(rowB);
  assert.equal(menu(), openMenu);
  assert.deepEqual(rows().map((row) => row.getAttribute("aria-pressed")), ["false", "true", "false"]);
  await click(rowB);
  assert.equal(rowB.getAttribute("aria-pressed"), "false");
  await click(rowB);
  assert.equal(rowB.getAttribute("aria-pressed"), "true");
});

test("consecutive Move Up keeps the menu open and the same database workout selected through the first boundary", async () => {
  await click(trigger()); await click(rows().find((row) => row.dataset.workoutId === "309"));
  const openMenu = menu();
  for (const expected of [["Workout A", "Workout C", "Workout B"], ["Workout C", "Workout A", "Workout B"]]) {
    await click(action("Перемістити вгору"));
    assert.deepEqual(order(), expected);
    assert.equal(menu(), openMenu);
    assert.equal(rows().find((row) => row.dataset.workoutId === "309").getAttribute("aria-pressed"), "true");
  }
  assert.equal(action("Перемістити вгору").disabled, true);
  await click(action("Перемістити вгору"));
  assert.equal(menu(), openMenu);
  assert.deepEqual(order(), ["Workout C", "Workout A", "Workout B"]);
});

test("consecutive Move Down keeps the menu open and the same database workout selected through the last boundary", async () => {
  await click(trigger()); await click(rows().find((row) => row.dataset.workoutId === "101"));
  const openMenu = menu();
  for (const expected of [["Workout B", "Workout A", "Workout C"], ["Workout B", "Workout C", "Workout A"]]) {
    await click(action("Перемістити вниз"));
    assert.deepEqual(order(), expected);
    assert.equal(menu(), openMenu);
    assert.equal(rows().find((row) => row.dataset.workoutId === "101").getAttribute("aria-pressed"), "true");
  }
  assert.equal(action("Перемістити вниз").disabled, true);
  await click(action("Перемістити вниз"));
  assert.equal(menu(), openMenu);
  assert.deepEqual(order(), ["Workout B", "Workout C", "Workout A"]);
});

test("outside click, trigger toggle, and Escape each close the menu, clear selection, and hide radio controls", async () => {
  await click(trigger()); await click(rows()[1]); await click(document.querySelector("h1"));
  assert.equal(menu(), null); assert.equal(rows().length, 0);

  await click(trigger()); await click(rows()[1]); await click(trigger());
  assert.equal(menu(), null); assert.equal(rows().length, 0);

  await click(trigger()); await click(rows()[1]); rows()[1].focus(); await key(rows()[1], "Escape");
  assert.equal(menu(), null); assert.equal(rows().length, 0); assert.equal(document.activeElement, trigger());
});

test("Edit is disabled without selection and routes the selected database workout through the existing editor", async () => {
  await click(trigger());
  assert.equal(action("Редагувати тренування").disabled, true);
  await click(action("Редагувати тренування"));
  assert.deepEqual(pushed, []);
  await click(rows().find((row) => row.dataset.workoutId === "205"));
  await click(action("Редагувати тренування"));
  assert.deepEqual(pushed, ["/workouts/205/edit"]);
  assert.equal(menu(), null);
  assert.equal(rows().length, 0);
});

test("successful Delete submits the selected ID once, removes it, refreshes database data, and resets selection", async () => {
  let finishDelete;
  const deleted = [];
  const deleteAction = (id) => {
    deleted.push(id);
    return new Promise((resolve) => { finishDelete = resolve; });
  };
  await act(async () => root.render(screen(deleteAction)));
  await click(trigger()); await click(rows().find((row) => row.dataset.workoutId === "205"));
  await act(async () => { action("Видалити тренування").click(); action("Видалити тренування").click(); });
  assert.deepEqual(deleted, ["205"]);
  assert.ok(menu());
  await act(async () => finishDelete({ ok: true, value: "205" }));
  assert.equal(menu(), null);
  assert.equal(rows().length, 0);
  assert.deepEqual(order(), ["Workout A", "Workout C"]);
  assert.equal(document.querySelector('[data-workout-link="205"]'), null);
  assert.equal(refreshes, 1);
  assert.deepEqual(pushed, []);
});

test("active-session-blocked Delete preserves selection and shows the specific conflict message", async () => {
  await act(async () => root.render(screen(async () => ({ ok: false, code: "WORKOUT_HAS_ACTIVE_SESSION", error: "conflict" }))));
  await click(trigger()); await click(rows().find((row) => row.dataset.workoutId === "205"));
  await click(action("Видалити тренування"));
  await flush();
  assert.ok(menu());
  assert.equal(rows().find((row) => row.dataset.workoutId === "205").getAttribute("aria-pressed"), "true");
  assert.deepEqual(order(), ["Workout A", "Workout B", "Workout C"]);
  assert.equal(document.querySelector('[role="alert"]').textContent, "Неможливо видалити тренування, поки воно не завершене");
  assert.deepEqual(pushed, []);
});

test("unexpected Delete failures keep the generic error", async () => {
  await act(async () => root.render(screen(async () => ({ ok: false, code: "WORKOUT_DELETE_FAILED", error: "failed" }))));
  await click(trigger()); await click(rows().find((row) => row.dataset.workoutId === "205"));
  await click(action("Видалити тренування"));
  await flush();
  assert.equal(document.querySelector('[role="alert"]').textContent, "Не вдалося видалити тренування");
});
