import test from "node:test";
import assert from "node:assert/strict";

import { recommendResumeTemplate, resumeTemplateKind } from "./resumeStrategy.js";
import { TEMPLATE_IDS } from "./resumeModel.js";
import { technicalSoftwareResumeFixture, technicalTargetItem, verifiedPostingReview } from "../tests/fixtures/resumePhaseBFixtures.js";

test("career-change analysis selects the dedicated hybrid resume template", () => {
  assert.equal(resumeTemplateKind("tech", { content_strategy: "career_change" }), "career-change");
  assert.equal(resumeTemplateKind("business", { fit_assessment: { path: "career_change" } }), "career-change");
});

test("trades remain credential-forward and direct candidates remain professional", () => {
  assert.equal(resumeTemplateKind("trades", { content_strategy: "career_change" }), "trades");
  assert.equal(resumeTemplateKind("tech", { content_strategy: "direct" }), "professional");
});

test("public recommendation contract includes strength and a deterministic reason code", () => {
  const recommendation = recommendResumeTemplate(technicalSoftwareResumeFixture, {
    item: technicalTargetItem,
    atsReview: verifiedPostingReview,
  });
  assert.equal(recommendation.templateId, TEMPLATE_IDS.TECHNICAL_SOFTWARE);
  assert.equal(recommendation.strength, "strong");
  assert.equal(recommendation.confidence, "strong");
  assert.equal(recommendation.reasonCode, "technical_software_verified");
  assert.ok(recommendation.trace.includes("reasonCode:technical_software_verified"));
});
