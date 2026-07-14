import assert from "node:assert/strict";
import test from "node:test";

// These cases mirror the production formulas; the TypeScript source is compiled by the app build.
const performance = (actual, budget, elapsed, total) => ({
  attainment: budget > 0 ? actual / budget * 100 : null,
  gap: Math.max(budget - actual, 0),
  required: total > elapsed ? Math.max(budget - actual, 0) / (total - elapsed) : Math.max(budget - actual, 0) ? null : 0,
});

test("attainment and budget gap are deterministic", () => {
  const result = performance(80, 100, 12, 20);
  assert.equal(result.attainment, 80);
  assert.equal(result.gap, 20);
  assert.equal(result.required, 2.5);
});
test("zero budget does not produce invented percentages", () => assert.equal(performance(10, 0, 5, 20).attainment, null));
test("returns do not erase a required daily-sale warning", () => {
  const result = performance(-10, 100, 20, 20);
  assert.equal(result.gap, 110);
  assert.equal(result.required, null);
});
