import test from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { JSDOM } from "jsdom";
import { ExerciseDetailsView } from "../components/exercise-details-view.tsx";

function details(history = []) {
  return {
    exercise: { id: "20", name: "Жим штанги лежачи", category: "Груди" },
    history,
  };
}

function render(value) {
  const html = renderToStaticMarkup(React.createElement(ExerciseDetailsView, { details: value }));
  return new JSDOM(`<!doctype html><body>${html}</body>`).window.document;
}

test("Exercise Details renders database exercise data and one card per completed session", () => {
  const startedAt = "2026-09-26T22:30:00.000Z";
  const document = render(details([
    {
      sessionId: "102", startedAt, completedAt: "2026-09-27T10:00:00.000Z", workoutName: "Тренування B",
      sets: [{ setNumber: 2, weight: 82.5, unit: "kg", reps: 8, rir: 1 }],
    },
    {
      sessionId: "101", startedAt, completedAt: "2026-09-27T09:00:00.000Z", workoutName: "Тренування A",
      sets: [{ setNumber: 1, weight: null, unit: "kg", reps: null, rir: null }],
    },
  ]));

  assert.equal(document.querySelector("h1").textContent, "Жим штанги лежачи");
  assert.equal(document.querySelector("header p").textContent, "Груди");
  assert.equal(document.querySelectorAll("article").length, 2, "same-date sessions remain separate cards");
  assert.deepEqual([...document.querySelectorAll("article h3")].map((node) => node.textContent), ["Тренування B", "Тренування A"]);
  const time = document.querySelector("time");
  assert.equal(time.textContent, "27 вересня 2026");
  assert.equal(time.getAttribute("datetime"), startedAt);
  assert.equal(Number.isNaN(Date.parse(time.getAttribute("datetime"))), false);
  assert.match(document.body.textContent, /2\s*82\.5\s*кг\s*8\s*1/);
  assert.match(document.body.textContent, /1\s*—\s*кг\s*—\s*—/);
  assert.equal(document.querySelector('a[aria-label="До списку вправ"]').getAttribute("href"), "/exercises");
});

test("Exercise Details preserves the approved Figma layout structure", () => {
  const document = render(details());
  const main = document.querySelector("main");
  const history = document.querySelector('section[aria-labelledby="exercise-history-heading"]');
  const spacer = history.querySelector('[aria-hidden="true"]');

  for (const className of ["h-dvh", "max-w-[390px]", "gap-8", "px-4", "py-6"]) assert.equal(main.classList.contains(className), true);
  for (const className of ["gap-4", "overflow-y-auto", "overflow-x-hidden"]) assert.equal(history.classList.contains(className), true);
  assert.equal(spacer.classList.contains("h-[250px]"), true);
});

test("empty history keeps the page structure and renders the approved minimal state", () => {
  const document = render(details());
  const status = document.querySelector('[role="status"]');
  assert.ok(status);
  assert.equal(status.querySelector("h3").textContent, "Ще немає історії виконання");
  assert.equal(status.querySelector("p").textContent, "Завершені тренування з цією вправою з'являться тут");
  assert.equal(document.querySelectorAll("article").length, 0);
});
