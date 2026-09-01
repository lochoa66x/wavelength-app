import assert from "node:assert/strict";
import test from "node:test";

import { reconcileEmploymentDetails } from "./employmentDetails.js";

test("full-time and a six-month contract are combined rather than treated as conflicting", () => {
  const result = reconcileEmploymentDetails("Contract (6 months)", [{
    field: "employment_type",
    values: [
      "Full-time (stated in header)",
      "Contract – 6 months (stated in Additional Information)",
    ],
  }]);

  assert.equal(result.reconciled, true);
  assert.equal(result.value, "Full-time contract (6 months)");
  assert.deepEqual(result.conflicts, []);
});

test("compatible source values reconcile even when the top-level type is unlabeled", () => {
  const result = reconcileEmploymentDetails("Unlabeled", [{
    field: "employment_type",
    values: ["Full-time", "6-month contract"],
  }]);

  assert.equal(result.reconciled, true);
  assert.equal(result.value, "Full-time contract (6 months)");
  assert.deepEqual(result.conflicts, []);
});

test("contradictory schedules remain a blocking source conflict", () => {
  const conflict = { field: "employment type", values: ["Full-time", "Part-time"] };
  const result = reconcileEmploymentDetails("Full-time", [conflict]);

  assert.equal(result.reconciled, false);
  assert.equal(result.value, "Full-time");
  assert.deepEqual(result.conflicts, [conflict]);
});

test("contradictory engagement types and durations are not silently combined", () => {
  const conflicts = [{
    field: "job_type",
    values: ["Permanent", "Contract – 12 months", "Contract – 6 months"],
  }];
  const result = reconcileEmploymentDetails("Contract (6 months)", conflicts);

  assert.equal(result.reconciled, false);
  assert.deepEqual(result.conflicts, conflicts);
});

test("unknown employment labels remain reviewable instead of being guessed", () => {
  const conflicts = [{ field: "type", values: ["Full-time", "Special appointment"] }];
  const result = reconcileEmploymentDetails("Special appointment", conflicts);

  assert.equal(result.reconciled, false);
  assert.deepEqual(result.conflicts, conflicts);
});
