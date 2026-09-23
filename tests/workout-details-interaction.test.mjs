import test, { beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { JSDOM } from "jsdom";
import React, { act } from "react";

const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost:3000" });
for (const name of ["window", "document", "HTMLElement", "HTMLInputElement", "Element", "Node", "MouseEvent", "KeyboardEvent", "Event", "MutationObserver", "navigator"]) {
  Object.defineProperty(globalThis, name, { value: dom.window[name], configurable: true });
}
globalThis.self = dom.window;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const { createRoot } = await import("react-dom/client");
const { AppRouterContext } = await import("next/dist/shared/lib/app-router-context.shared-runtime.js");
const { default: WorkoutDetails } = await import("../app/(authenticated)/workouts/[id]/workout-details-client.tsx");
const { default: ActiveWorkout } = await import("../app/(authenticated)/workouts/[id]/active/active-workout-client.tsx");
const { default: EditWorkout } = await import("../app/(authenticated)/workouts/[id]/edit/edit-workout-client.tsx");
const { WorkoutDraftProvider, useWorkoutDraft } = await import("../components/workout-draft-provider.tsx");

let root;
let container;
let draft;
let fixture;
let pushed;
const router = { back() {}, forward() {}, refresh() {}, replace() {}, prefetch() {}, push(href) { pushed.push(href); } };
function ObserveDraft({ initialWorkout }) { draft = useWorkoutDraft(initialWorkout); return null; }
function activeSession(workout) {
  return {
    id: `session-${workout.id}`, workoutId: workout.id, workoutName: workout.name, startedAt: new Date(Date.now() - 65_000).toISOString(),
    exercises: workout.exercises.toSorted((a, b) => a.position - b.position).map((exercise) => ({
      id: `session-${exercise.id}`, exerciseId: exercise.exerciseId, name: exercise.name, category: exercise.category ?? null, position: exercise.position, previousSets: [],
      sets: exercise.plannedSets.toSorted((a, b) => a.position - b.position).map((set) => ({
        id: `performed-${set.id}`, sessionExerciseId: `session-${exercise.id}`, setNumber: set.position,
        weight: null, weightUnit: "kg", reps: null, rir: "", completed: false,
      })),
    })),
  };
}
function screen(Component = WorkoutDetails, initialWorkout = fixture, props = {}) {
  const componentProps = Component === ActiveWorkout ? {
    initialSession: activeSession(initialWorkout),
    saveSetAction: async () => ({ ok: true, value: { completed: false } }),
    addSetAction: async () => ({ ok: true, value: { id: "performed-added", setNumber: 2 } }),
    removeSetAction: async () => ({ ok: true, value: true }),
    finishAction: async () => ({ ok: true, value: `session-${initialWorkout.id}` }),
    ...props,
  } : { initialWorkout, saveAction: async (value) => value, startAction: async () => ({ ok: true, value: `session-${initialWorkout.id}` }), ...props };
  return React.createElement(AppRouterContext.Provider, { value: router }, React.createElement(WorkoutDraftProvider, { key: initialWorkout.id },
    React.createElement(ObserveDraft, { initialWorkout }),
    React.createElement(React.Suspense, { fallback: "Loading" }, React.createElement(Component, componentProps)),
  ),
  );
}
const trigger = () => document.querySelector('[aria-label="Змінити тренування"]');
const menu = () => document.querySelector('[role="menu"]');
const rows = () => [...document.querySelectorAll('[data-workout-exercise-select]')];
const action = (label) => [...document.querySelectorAll('[role="menuitem"]')].find((item) => item.textContent.includes(label));
const current = () => draft.workout;
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
async function input(element, value) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

beforeEach(async () => {
  pushed = [];
  fixture = { id: "2048", name: "Тестове тренування", exercises: ["A", "B", "C"].map((name, index) => ({
    id: `entry-${name}`, exerciseId: `catalog-${name}`, name, position: index + 1,
    plannedSets: [{ id: `set-${name}`, position: 1, weight: 42.5 + index, weightUnit: index === 1 ? "lb" : "kg", reps: 8 + index, rir: index }],
  })) };
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  await act(async () => root.render(screen()));
  // jsdom has no layout engine. Supply the actual 390 × 844 design anchor.
  Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });
  Object.defineProperty(window, "innerHeight", { value: 844, configurable: true });
  trigger().getBoundingClientRect = () => ({ x: 350, y: 31, left: 350, top: 31, right: 374, bottom: 55, width: 24, height: 24 });
});
afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  assert.equal(menu(), null, "portal must be cleaned up on unmount");
});

test("three-dot toggles menu and aria-expanded; native button supports keyboard activation", async () => {
  assert.equal(trigger().tagName, "BUTTON");
  assert.equal(trigger().getAttribute("type"), "button");
  assert.equal(trigger().getAttribute("aria-expanded"), "false");
  await click(trigger());
  assert.ok(menu());
  assert.equal(trigger().getAttribute("aria-expanded"), "true");
  assert.equal(trigger().getAttribute("aria-controls"), menu().id);
  await click(rows()[1]);
  assert.equal(rows()[1].getAttribute("aria-pressed"), "true");
  await click(trigger());
  assert.equal(menu(), null);
  assert.equal(trigger().getAttribute("aria-expanded"), "false");
  assert.equal(rows().length, 0, "closing from the trigger must hide selection controls");
  // Native Enter/Space activation generates click(detail=0); jsdom does not synthesize it.
  trigger().focus();
  await act(async () => trigger().dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 0 })));
  assert.ok(menu());
});

test("select A then B keeps the same menu mounted through pointerdown and click", async () => {
  await click(trigger());
  const original = menu();
  await click(rows()[0]);
  assert.equal(menu(), original);
  assert.equal(rows()[0].getAttribute("aria-pressed"), "true");
  await pointerDown(rows()[1].querySelector("img"));
  assert.equal(menu(), original, "must not temporarily close on pointerdown");
  await act(async () => rows()[1].click());
  assert.equal(menu(), original);
  assert.deepEqual(rows().map((row) => row.getAttribute("aria-pressed")), ["false", "true", "false"]);
});

test("exercise rows toggle selection without closing Action List and restore disabled actions", async () => {
  await click(trigger());
  const openMenu = menu();
  const rowA = rows()[0];
  const rowB = rows()[1];
  const actions = () => [...document.querySelectorAll('[role="menuitem"]')];
  assert.deepEqual(rows().map((row) => row.getAttribute("aria-pressed")), ["false", "false", "false"]);
  assert.equal(actions().every((item) => item.disabled), true);

  await click(rowA);
  assert.equal(menu(), openMenu);
  assert.equal(rowA.getAttribute("aria-pressed"), "true");
  assert.equal(action("Видалити").disabled, false);
  assert.equal(action("Опустити").disabled, false);

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

test("move up targets newly selected B, preserves all planned sets and normalizes ordering", async () => {
  const original = structuredClone(fixture);
  await click(trigger()); await click(rows()[0]); await click(rows()[1]);
  const openMenu = menu();
  await click(action("Підняти"));
  assert.deepEqual(current().exercises.map((e) => [e.id, e.position]), [["entry-B", 1], ["entry-A", 2], ["entry-C", 3]]);
  for (const exercise of current().exercises) assert.deepEqual(exercise.plannedSets, fixture.exercises.find((e) => e.id === exercise.id).plannedSets);
  assert.equal(rows()[0].getAttribute("aria-pressed"), "true");
  assert.equal(menu(), openMenu);
  assert.equal(trigger().getAttribute("aria-expanded"), "true");
  assert.deepEqual(fixture, original, "server template must remain unchanged");
});

test("two consecutive Move Up actions keep C selected and the same menu open at the first boundary", async () => {
  await click(trigger()); await click(rows()[2]);
  const openMenu = menu();
  for (const expected of [["A", "C", "B"], ["C", "A", "B"]]) {
    await click(action("Підняти"));
    assert.deepEqual(rows().map((row) => row.getAttribute("aria-label").replace("Обрати вправу ", "")), expected);
    assert.equal(rows().find((row) => row.getAttribute("aria-pressed") === "true")?.getAttribute("aria-label"), "Обрати вправу C");
    assert.equal(menu(), openMenu);
  }
  assert.ok(action("Підняти").disabled);
  await click(action("Підняти"));
  assert.equal(menu(), openMenu);
  assert.equal(rows()[0].getAttribute("aria-pressed"), "true");
  assert.deepEqual(current().exercises.map((exercise) => [exercise.id, exercise.position]), [["entry-C", 1], ["entry-A", 2], ["entry-B", 3]]);
});

test("two consecutive Move Down actions keep A selected while an Active snapshot remains server-backed", async () => {
  await click(trigger()); await click(rows()[0]);
  const openMenu = menu();
  for (const expected of [["B", "A", "C"], ["B", "C", "A"]]) {
    await click(action("Опустити"));
    assert.deepEqual(rows().map((row) => row.getAttribute("aria-label").replace("Обрати вправу ", "")), expected);
    assert.equal(rows().find((row) => row.getAttribute("aria-pressed") === "true")?.getAttribute("aria-label"), "Обрати вправу A");
    assert.equal(menu(), openMenu);
  }
  assert.ok(action("Опустити").disabled);
  await click(action("Опустити"));
  assert.equal(menu(), openMenu);
  assert.equal(rows()[2].getAttribute("aria-pressed"), "true");
  assert.deepEqual(current().exercises.map((exercise) => [exercise.id, exercise.position]), [["entry-B", 1], ["entry-C", 2], ["entry-A", 3]]);
  await act(async () => root.render(screen(ActiveWorkout)));
  assert.deepEqual([...document.querySelectorAll("article h2")].map((heading) => heading.textContent), ["A", "B", "C"]);
});

test("move down targets newly selected B while a new Active session starts with empty canonical inputs", async () => {
  await click(trigger()); await click(rows()[0]); await click(rows()[1]);
  const openMenu = menu();
  await click(action("Опустити"));
  assert.deepEqual(current().exercises.map((e) => [e.id, e.position]), [["entry-A", 1], ["entry-C", 2], ["entry-B", 3]]);
  assert.equal(menu(), openMenu);
  assert.equal(rows()[2].getAttribute("aria-pressed"), "true");
  const expected = structuredClone(current());
  await act(async () => root.render(screen(ActiveWorkout)));
  assert.deepEqual([...document.querySelectorAll("article h2")].map((el) => el.textContent), ["A", "B", "C"]);
  const cards = [...document.querySelectorAll("article")];
  assert.deepEqual(cards.map((card) => card.querySelector('input[aria-label="Вага, підхід 1"]').value), ["", "", ""]);
  assert.deepEqual(cards.map((card) => card.querySelector('[role="combobox"]').getAttribute("data-value")), ["kg", "kg", "kg"]);
  assert.ok(cards.every((card) => card.querySelector('input[aria-label="Повтори, підхід 1"]').value === ""));
  assert.deepEqual(current(), expected);
});

test("delete targets newly selected B only and preserves remaining prescriptions", async () => {
  await click(trigger()); await click(rows()[0]); await click(rows()[1]);
  await click(action("Видалити"));
  assert.deepEqual(current().exercises.map((e) => [e.id, e.position]), [["entry-A", 1], ["entry-C", 2]]);
  assert.deepEqual(current().exercises.map((e) => e.plannedSets), [fixture.exercises[0].plannedSets, fixture.exercises[2].plannedSets]);
  assert.equal(menu(), null);
  assert.equal(rows().length, 0, "Delete must close selection mode");
});

test("outside clicks and list gaps close menu, clear selection, and hide selection controls", async () => {
  await click(trigger()); await click(rows()[1]);
  await click(document.querySelector("h1"));
  assert.equal(menu(), null);
  assert.equal(rows().length, 0);
  await click(trigger()); await click(rows()[2]);
  await click(document.querySelector('[aria-label="Вправи тренування"]'));
  assert.equal(menu(), null);
  assert.equal(rows().length, 0);
});

test("clicking menu padding or disabled actions is not an outside click", async () => {
  await click(trigger());
  const original = menu();
  await click(menu());
  assert.equal(menu(), original);
  assert.ok(action("Видалити").disabled);
  await click(action("Видалити"));
  assert.equal(menu(), original);
});

test("Escape from exercise row closes menu, clears selection, hides controls, and returns focus", async () => {
  await click(trigger()); await click(rows()[1]);
  rows()[1].focus();
  await key(rows()[1], "Escape");
  assert.equal(menu(), null);
  assert.equal(rows().length, 0);
  assert.equal(document.activeElement, trigger());
});

test("Escape from portaled menu or elsewhere closes it and clears selection", async () => {
  await click(trigger()); await click(rows()[1]);
  await key(action("Видалити"), "Escape");
  assert.equal(menu(), null);
  assert.equal(rows().length, 0);
  await click(trigger()); await click(rows()[1]); await key(document.body, "Escape");
  assert.equal(menu(), null);
  assert.equal(rows().length, 0);
  assert.equal(document.activeElement, trigger());
});

test("keyboard menu navigation skips disabled boundaries without trapping exercise focus", async () => {
  await click(trigger());
  await key(menu(), "ArrowDown"); // no enabled actions yet
  await click(rows()[0]);
  assert.ok(action("Підняти").disabled);
  action("Видалити").focus();
  await key(action("Видалити"), "ArrowDown");
  assert.equal(document.activeElement, action("Опустити"));
  rows()[2].focus();
  await act(async () => rows()[2].click());
  assert.equal(document.activeElement, rows()[2]);
  assert.ok(action("Опустити").disabled);
  assert.equal(action("Підняти").disabled, false);
});

test("menu portal escapes clipped ancestors and retains design anchor on resize/scroll", async () => {
  container.style.overflow = "hidden";
  await click(trigger());
  assert.equal(menu().parentElement, document.body);
  assert.equal(menu().classList.contains("fixed"), true);
  assert.equal(menu().classList.contains("z-50"), true);
  assert.equal(menu().style.left, "174px");
  assert.equal(menu().style.top, "63px");
  trigger().getBoundingClientRect = () => ({ right: 400, bottom: 100 });
  await act(async () => window.dispatchEvent(new Event("resize")));
  assert.equal(menu().style.left, "182px", "clamp to viewport");
  assert.equal(menu().style.top, "108px");
  trigger().getBoundingClientRect = () => ({ right: 300, bottom: 50 });
  await act(async () => document.querySelector("ul").dispatchEvent(new Event("scroll")));
  assert.equal(menu().style.left, "100px");
  assert.equal(menu().style.top, "58px");
});

test("database-origin ID 1 displays its own name and data without a legacy provider", async () => {
  const { resolveWorkout } = await import("../lib/workout-read.ts");
  const { Prisma } = await import("@prisma/client");
  const loaded = await resolveWorkout("1", async ({ where }) => ({
    id: where.id, name: "Database-only workout", exercises: [{
      id: 901, exerciseId: 801, position: 1,
      exercise: { name: "Database-only exercise", category: "Груди" },
      sets: [{ id: 701, setNumber: 1, targetWeight: new Prisma.Decimal("77.25"), targetReps: 7, targetRir: 2 }],
    }],
  }));
  await act(async () => root.render(screen(WorkoutDetails, loaded)));
  assert.equal(document.querySelector("h1").textContent, "Database-only workout");
  await click([...document.querySelectorAll("button")].find((button) => button.textContent.includes("Почати тренування")));
  assert.deepEqual(pushed, ["/workouts/1/active?session=session-1"]);
  await act(async () => root.render(screen(ActiveWorkout, loaded)));
  assert.equal(document.querySelector("h1").textContent, "Database-only workout");
  assert.equal(document.querySelector("article h2").textContent, "Database-only exercise");
  assert.equal(document.querySelector('input[aria-label="Вага, підхід 1"]').value, "");
  assert.equal(current().exercises[0].plannedSets[0].rir, 2);
});

test("Edit route targets the database ID and prefills the shared editor from its ordered draft", async () => {
  assert.equal(document.querySelector('a[href="/workouts/2048/edit"]').textContent.trim(), "Редагувати тренування");
  await act(async () => root.render(screen(EditWorkout, fixture, { catalog: [
    { id: "catalog-A", name: "A" }, { id: "catalog-B", name: "B" }, { id: "catalog-C", name: "C" },
  ] })));
  assert.equal(document.querySelector("h1").textContent, "Редагувати тренування");
  assert.equal(document.querySelector('input[placeholder="Назва тренування"]').value, fixture.name);
  assert.deepEqual([...document.querySelectorAll("section h3")].map((heading) => heading.textContent), ["A", "B", "C"]);
  assert.deepEqual([...document.querySelectorAll('input[aria-label="Вага, підхід 1"]')].map((field) => field.value), ["42.5", "43.5", "44.5"]);
  assert.equal(current().exercises[1].plannedSets[0].rir, 1);
  assert.ok(document.querySelector('a[href="/workouts/2048"]'));
});

test("editor changes survive Details navigation but do not alter a server-backed Active snapshot unsaved", async () => {
  await act(async () => root.render(screen(EditWorkout)));
  await input(document.querySelector('input[placeholder="Назва тренування"]'), "Edited Training");
  await click(document.querySelector('[aria-label="Видалити вправу B"]'));
  await input(document.querySelector('input[aria-label="Вага, підхід 1"]'), "55");
  assert.equal(current().name, "Edited Training");
  assert.deepEqual(current().exercises.map((exercise) => exercise.name), ["A", "C"]);
  assert.equal(current().exercises[0].plannedSets[0].weight, 55);
  await act(async () => root.render(screen(WorkoutDetails, structuredClone(fixture))));
  assert.equal(document.querySelector("h1").textContent, "Edited Training");
  assert.equal(document.querySelectorAll('[aria-label="Вправи тренування"] li').length, 2);
  assert.equal(document.querySelector('[aria-label="Зберегти зміни"]').dataset.unsaved, "true");
  await act(async () => root.render(screen(ActiveWorkout, structuredClone(fixture))));
  assert.deepEqual([...document.querySelectorAll("article h2")].map((heading) => heading.textContent), ["A", "B", "C"]);
  assert.equal(document.querySelector('input[aria-label="Вага, підхід 1"]').value, "");
  assert.equal(current().exercises[0].plannedSets[0].rir, 0);
});

test("database catalog search adds an exercise and editor set controls update only the draft", async () => {
  const databaseWorkout = { ...fixture, exercises: fixture.exercises.map((exercise, index) => ({ ...exercise, exerciseId: String(index + 10) })) };
  await act(async () => root.render(screen(EditWorkout, databaseWorkout, { catalog: [
    { id: "10", name: "A" }, { id: "11", name: "B" }, { id: "12", name: "C" }, { id: "13", name: "Row" },
  ] })));
  const search = document.querySelector('input[placeholder="Знайти вправу"]');
  await act(async () => search.focus());
  await input(search, "Row");
  await click(document.querySelector('[aria-label="Додати вправу Row"]'));
  assert.equal(current().exercises.at(-1).exerciseId, "13");
  assert.equal(current().exercises.at(-1).position, 4);
  assert.equal(current().exercises.at(-1).plannedSets.length, 1);
  assert.equal(databaseWorkout.exercises.length, 3);
  const rowCard = [...document.querySelectorAll("section")].find((section) => section.querySelector("h3")?.textContent === "Row");
  await click([...rowCard.querySelectorAll("button")].find((button) => button.textContent.includes("Додати підхід")));
  assert.equal(current().exercises.at(-1).plannedSets.length, 2);
});

test("Details Save commits the current draft, updates its baseline, and Active receives saved data", async () => {
  await click(trigger()); await click(rows()[1]); await click(action("Видалити"));
  let submitted;
  await act(async () => root.render(screen(WorkoutDetails, fixture, { saveAction: async (value) => {
    submitted = structuredClone(value);
    return { ...value, name: "Saved Training" };
  } })));
  assert.equal(document.querySelector('[aria-label="Зберегти зміни"]').dataset.unsaved, "true");
  await click(document.querySelector('[aria-label="Зберегти зміни"]'));
  assert.deepEqual(submitted.exercises.map((exercise) => exercise.name), ["A", "C"]);
  assert.equal(document.querySelector("h1").textContent, "Saved Training");
  assert.equal(document.querySelector('[aria-label="Зберегти зміни"]').dataset.unsaved, "false");
  await act(async () => root.render(screen(ActiveWorkout, current())));
  assert.deepEqual([...document.querySelectorAll("article h2")].map((heading) => heading.textContent), ["A", "C"]);
});

test("a failed Details Save keeps the edited draft dirty and reports the failure", async () => {
  await click(trigger()); await click(rows()[1]); await click(action("Видалити"));
  let submitted;
  await act(async () => root.render(screen(WorkoutDetails, fixture, { saveAction: async (value) => {
    submitted = structuredClone(value);
    throw new Error("database unavailable");
  } })));
  await click(document.querySelector('[aria-label="Зберегти зміни"]'));
  assert.deepEqual(submitted.exercises.map((exercise) => exercise.name), ["A", "C"]);
  assert.deepEqual(current().exercises.map((exercise) => exercise.name), ["A", "C"]);
  assert.equal(document.querySelector('[aria-label="Зберегти зміни"]').dataset.unsaved, "true");
  assert.equal(document.querySelector('[role="alert"]').textContent, "Не вдалося зберегти зміни");
});

test("unsaved Details deletion never mutates Active session data and reload restores the template", async () => {
  await click(trigger()); await click(rows()[1]); await click(action("Видалити"));
  await act(async () => root.render(screen(ActiveWorkout, structuredClone(fixture))));
  assert.deepEqual([...document.querySelectorAll("article h2")].map(e => e.textContent), ["A", "B", "C"]);
  await act(async () => root.unmount());
  root = createRoot(container);
  await act(async () => root.render(screen(ActiveWorkout)));
  assert.deepEqual([...document.querySelectorAll("article h2")].map(e => e.textContent), ["A", "B", "C"]);
});

test("direct Active load uses server data; another ID cannot inherit the previous draft", async () => {
  await click(trigger()); await click(rows()[1]); await click(action("Видалити"));
  const other = { ...structuredClone(fixture), id: "4096", name: "Other database workout" };
  await act(async () => root.render(screen(ActiveWorkout, other)));
  assert.equal(document.querySelector("h1").textContent, other.name);
  assert.equal(document.querySelectorAll("article").length, 3);
  assert.equal(current().id, "4096");
  await act(async () => root.render(screen(WorkoutDetails, fixture)));
  assert.equal(document.querySelector('button[aria-expanded]').getAttribute("aria-expanded"), "false");
  assert.equal(current().exercises.length, 3);
});

test("Start submits once and navigates with stable session identity only after success", async () => {
  let resolveStart;
  let calls = 0;
  const startAction = () => {
    calls += 1;
    return new Promise((resolve) => { resolveStart = resolve; });
  };
  await act(async () => root.render(screen(WorkoutDetails, fixture, { startAction })));
  const start = [...document.querySelectorAll("button")].find((item) => item.textContent.includes("Почати тренування"));
  await act(async () => {
    start.click();
    start.click();
    await Promise.resolve();
  });
  assert.equal(calls, 1);
  assert.deepEqual(pushed, []);
  await act(async () => resolveStart({ ok: true, value: "987" }));
  assert.deepEqual(pushed, ["/workouts/2048/active?session=987"]);
});

test("A failed Start stays on Details, exposes an error, and permits retry", async () => {
  let calls = 0;
  const startAction = async () => ++calls === 1 ? { ok: false, error: "database" } : { ok: true, value: "988" };
  await act(async () => root.render(screen(WorkoutDetails, fixture, { startAction })));
  const start = () => [...document.querySelectorAll("button")].find((item) => item.textContent.includes("Почати тренування"));
  await click(start());
  assert.deepEqual(pushed, []);
  assert.equal(document.querySelector('[role="alert"]').textContent, "Не вдалося почати тренування");
  await click(start());
  assert.deepEqual(pushed, ["/workouts/2048/active?session=988"]);
});
