import assert from "node:assert/strict";
import { calculateAttendanceComparison } from "./metrics.ts";

function test(name, run) {
  try {
    run();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("calculates positive attendance variance and rate", () => {
  assert.deepEqual(calculateAttendanceComparison(100, 125), {
    expected: 100,
    actual: 125,
    variance: 25,
    rate: 1.25,
  });
});

test("calculates negative attendance variance and rate", () => {
  assert.deepEqual(calculateAttendanceComparison(200, 150), {
    expected: 200,
    actual: 150,
    variance: -50,
    rate: 0.75,
  });
});

test("returns a zero rate when expected attendance is zero", () => {
  assert.deepEqual(calculateAttendanceComparison(0, 12), {
    expected: 0,
    actual: 12,
    variance: 12,
    rate: 0,
  });
});
