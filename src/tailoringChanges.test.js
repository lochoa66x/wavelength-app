import assert from "node:assert/strict";
import test from "node:test";

import {
  applyTailoringChangeDecision,
  hasTailoringChangeAdjustments,
  reviewAfterTailoringChange,
  tailoringChangeCurrentText,
} from "./tailoringChanges.js";

const change = {
  id: "experience-0-bullet-0",
  section: "experience",
  experience_index: 0,
  bullet_index: 0,
  change_type: "rephrased",
  original: "Supported integration testing for a new interface.",
  proposed: "Supported end-to-end integration testing for a new interface.",
};

const baselineResume = {
  experience: [{ role: "Consultant", bullets: [change.proposed] }],
};

const baselineReview = {
  application_ready: true,
  tailoring_changes: [change],
  export_readiness: { status: "ready", application_ready: true, blockers: [] },
};

test("using verified original wording preserves immutable resume structure", () => {
  const adjusted = applyTailoringChangeDecision(baselineResume, change, "original");

  assert.equal(tailoringChangeCurrentText(adjusted, change), change.original);
  assert.equal(tailoringChangeCurrentText(baselineResume, change), change.proposed);
  assert.notEqual(adjusted, baselineResume);
  assert.notEqual(adjusted.experience, baselineResume.experience);
});

test("a user wording adjustment makes the export preliminary until restored", () => {
  const adjusted = applyTailoringChangeDecision(baselineResume, change, "original");
  const preliminary = reviewAfterTailoringChange(baselineReview, adjusted);

  assert.equal(hasTailoringChangeAdjustments(adjusted, [change]), true);
  assert.equal(preliminary.application_ready, false);
  assert.equal(preliminary.export_readiness.status, "preliminary");
  assert.ok(preliminary.export_readiness.blockers.includes("tailoring_change_review"));

  const restored = applyTailoringChangeDecision(adjusted, change, "tailored");
  assert.equal(reviewAfterTailoringChange(baselineReview, restored), baselineReview);
});
