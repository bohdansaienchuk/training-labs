import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const actionModules = [
  ["../app/(authenticated)/workouts/new/actions.ts", ["createWorkoutAction"]],
  ["../app/(authenticated)/workouts/actions.ts", ["deleteWorkoutAction"]],
  ["../app/(authenticated)/workouts/[id]/actions.ts", ["saveWorkoutAction", "startWorkoutAction"]],
  ["../app/(authenticated)/workouts/[id]/active/actions.ts", [
    "savePerformedSetAction",
    "addPerformedSetAction",
    "removePerformedSetAction",
    "moveSessionExerciseAction",
    "deleteSessionExerciseAction",
    "finishWorkoutAction",
  ]],
];

test("every workout Server Action authenticates before entering its mutation transaction", async () => {
  for (const [relativePath, exports] of actionModules) {
    const source = await readFile(new URL(relativePath, import.meta.url), "utf8");
    assert.match(source, /^"use server";/, relativePath);
    assert.doesNotMatch(source, /findDemoUserId|demo-user|DEMO_USER/, relativePath);

    for (const [index, exportName] of exports.entries()) {
      const start = source.indexOf(`export async function ${exportName}`);
      const next = index + 1 < exports.length
        ? source.indexOf(`export async function ${exports[index + 1]}`, start)
        : source.length;
      assert.notEqual(start, -1, `${exportName} must remain exported`);
      const body = source.slice(start, next);
      const authentication = body.indexOf("await requireUser()");
      const transaction = body.indexOf("prisma.$transaction");
      assert.ok(authentication !== -1, `${exportName} must authenticate direct calls`);
      assert.ok(transaction === -1 || authentication < transaction, `${exportName} must authenticate before mutating`);
    }
  }
});
