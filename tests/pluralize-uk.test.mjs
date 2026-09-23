import test from "node:test";
import assert from "node:assert/strict";
import { pluralizeUk } from "../lib/pluralize-uk.ts";

const cases = [
  [0, "many"], [1, "one"], [2, "few"], [4, "few"], [5, "many"],
  [10, "many"], [11, "many"], [14, "many"], [21, "one"], [22, "few"],
  [25, "many"], [101, "one"], [111, "many"],
];

for (const [label, forms] of [
  ["exercise", { one: "вправа", few: "вправи", many: "вправ" }],
  ["set", { one: "підхід", few: "підходи", many: "підходів" }],
  ["repetition", { one: "повтор", few: "повтори", many: "повторів" }],
]) {
  test(`Ukrainian ${label} pluralization handles zero, teens, and compound counts`, () => {
    for (const [count, form] of cases) {
      assert.equal(pluralizeUk(count, forms), `${count} ${forms[form]}`);
    }
  });
}
