import test from "node:test";
import assert from "node:assert/strict";

import { evidenceCoachEvent } from "./evidenceCoachTelemetry.js";

test("evidence coach telemetry permits only coarse allowlisted properties", () => {
  let event = null;
  const tracked = evidenceCoachEvent("proposed", {
    disposition: "reviewable",
    confidence: "high",
    answer: "private resume sentence",
    requirement_id: "private-requirement",
  }, (name, properties) => { event = { name, properties }; });
  assert.equal(tracked, true);
  assert.deepEqual(event, {
    name: "evidence_coach",
    properties: { outcome: "proposed", disposition: "reviewable", confidence: "high" },
  });
});

test("unknown outcomes are not emitted", () => {
  assert.equal(evidenceCoachEvent("private-text", {}, () => { throw new Error("must not run"); }), false);
});
