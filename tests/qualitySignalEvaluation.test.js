import test from "node:test";
import assert from "node:assert/strict";

import { buildQualitySignal } from "../src/qualitySignalContract.js";
import { evaluateQualitySignals } from "../src/qualitySignalEvaluation.js";

test("evaluation publishes only cohorts of ten or more", () => {
  const report = evaluateQualitySignals([
    { signal: buildQualitySignal("tailoring_completed", { route: "app" }), count: 12 },
    { signal: buildQualitySignal("export_failed", { route: "app", outcome: "failed" }), count: 3 },
  ]);
  assert.deepEqual(report.publishableGroups, { tailoring_completed: 12 });
  assert.deepEqual(report.suppression, { groups: 1, events: 3 });
  assert.equal(JSON.stringify(report).includes("export_failed"), false);
});
test("evaluation refuses a minimum cohort below the privacy floor", () => {
  assert.throws(() => evaluateQualitySignals([], { minCohort: 9 }), /at least 10/);
});
