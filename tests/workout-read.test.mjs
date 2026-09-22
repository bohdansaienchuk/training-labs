import test from "node:test";
import assert from "node:assert/strict";
import { Prisma } from "@prisma/client";
import { resolveWorkout, serializeWorkout, workoutInclude } from "../lib/workout-read.ts";
import { initializeActiveSets } from "../lib/workout-template.ts";

export function databaseWorkout(id = 1) {
  return { id, name: `Database workout ${id}`, userId: 5, createdAt: new Date(), updatedAt: new Date(),
    exercises: [2, 1].map((position) => ({
      id: 100 + position, workoutId: id, exerciseId: 200 + position, position,
      exercise: { id: 200 + position, name: `DB exercise ${position}`, category: position === 1 ? "Груди" : null },
      sets: [2, 1].map((setNumber) => ({
        id: position * 10 + setNumber, workoutExerciseId: 100 + position, setNumber,
        targetWeight: setNumber === 1 ? new Prisma.Decimal("42.50") : null,
        targetReps: setNumber === 1 ? 8 : null, targetRir: setNumber === 1 ? 0 : null,
      })),
    })),
  };
}

test("route ID resolves the database record, including IDs that overlap old mock IDs", async () => {
  for (const id of [1, 2048]) {
    let query;
    const result = await resolveWorkout(String(id), async (args) => { query = args; return databaseWorkout(id); });
    assert.deepEqual(query, { where: { id }, include: workoutInclude });
    assert.equal(query.include.exercises.orderBy.position, "asc");
    assert.equal(query.include.exercises.include.sets.orderBy.setNumber, "asc");
    assert.equal(result.id, String(id));
    assert.equal(result.name, `Database workout ${id}`);
    assert.deepEqual(result.exercises.map(e => e.name), ["DB exercise 1", "DB exercise 2"]);
  }
});

test("absent database ID throws Next notFound even when a mock ID would exist", async () => {
  await assert.rejects(resolveWorkout("1", async () => null), { digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
});

test("invalid, UUID, fractional and out-of-range IDs are rejected before querying", async () => {
  for (const id of ["0", "-1", "01", "1.5", "1e2", " 1", "draft", "d81e74c5-b10d-473d-a702-101084701e4c", "2147483648"]) {
    await assert.rejects(resolveWorkout(id, async () => { assert.fail("invalid ID must not reach Prisma"); }), { digest: "NEXT_HTTP_ERROR_FALLBACK;404" });
  }
});

test("database errors propagate rather than becoming a mock workout or a 404", async () => {
  const failure = new Error("Database unavailable");
  await assert.rejects(resolveWorkout("1", async () => { throw failure; }), error => error === failure);
});

test("serialization retains IDs, category, order, set numbers, Decimal/null and planned RIR", () => {
  const input = databaseWorkout();
  const result = serializeWorkout(input);
  assert.deepEqual(result.exercises.map(e => [e.id, e.exerciseId, e.position, e.category]), [["101", "201", 1, "Груди"], ["102", "202", 2, null]]);
  assert.deepEqual(result.exercises[0].plannedSets, [
    { id: "11", position: 1, weight: 42.5, weightUnit: "kg", reps: 8, rir: 0 },
    { id: "12", position: 2, weight: null, weightUnit: "kg", reps: null, rir: null },
  ]);
  assert.deepEqual(JSON.parse(JSON.stringify(result)), result);
  assert.deepEqual(input.exercises.map(e => e.position), [2, 1], "serialization must not mutate Prisma results");
  for (const weight of ["0", "9999.99", "0.01"]) {
    input.exercises[0].sets[0].targetWeight = new Prisma.Decimal(weight);
    assert.equal(serializeWorkout(input).exercises[1].plannedSets[1].weight, Number(weight));
  }
});

test("Active initialization retains planned reps/RIR without recording them as performed", () => {
  const workout = serializeWorkout(databaseWorkout());
  const planned = workout.exercises[0].plannedSets;
  const active = initializeActiveSets(planned);
  assert.deepEqual(active.map(s => s.planned), planned);
  assert.equal(active[0].planned.rir, 0);
  assert.equal(active[0].actualWeight, 42.5);
  assert.equal(active[0].actualReps, null);
  assert.equal(active[0].reserve, "");
  active[0].planned.rir = 5;
  assert.equal(planned[0].rir, 0);
});
