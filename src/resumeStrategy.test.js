import test from "node:test";
import assert from "node:assert/strict";

import { resumeTemplateKind } from "./resumeStrategy.js";

test("career-change analysis selects the dedicated hybrid resume template", () => {
  assert.equal(resumeTemplateKind("tech", { content_strategy: "career_change" }), "career-change");
  assert.equal(resumeTemplateKind("business", { fit_assessment: { path: "career_change" } }), "career-change");
});

test("trades remain credential-forward and direct candidates remain professional", () => {
  assert.equal(resumeTemplateKind("trades", { content_strategy: "career_change" }), "trades");
  assert.equal(resumeTemplateKind("tech", { content_strategy: "direct" }), "professional");
});
