import assert from "node:assert/strict";
import test from "node:test";

import { createApplicationPresentation, validateApplicationPresentation } from "./applicationPresentation.js";
import {
  DESIGN_IDS,
  TEMPLATE_IDS,
  availableResumeDesigns,
  buildResumeRenderPlan,
  createResumePackage,
  resolveDesignId,
} from "./resumeModel.js";

const candidate = {
  name: "Avery Morgan",
  title: "Operations Analyst",
  contact: "avery@example.com | Toronto, Ontario",
  profile: "Operations analyst with verified process and reporting experience.",
  skills: ["Process analysis", "Reporting"],
  experience: [{ role: "Operations Analyst", company: "Example Cooperative", dates: "2022 - Present", bullets: ["Documented operating procedures and prepared weekly reporting."] }],
};

test("prototype registry is dormant by default and resolves disabled IDs to Essential", () => {
  assert.equal(availableResumeDesigns().length, 7);
  assert.equal(availableResumeDesigns({ includePrototypes: true }).length, 10);
  assert.equal(resolveDesignId(TEMPLATE_IDS.NORTHSTAR), DESIGN_IDS.ESSENTIAL_ATS);
  assert.equal(resolveDesignId(TEMPLATE_IDS.NORTHSTAR, DESIGN_IDS.ESSENTIAL_ATS, { allowPrototypeDesigns: true }), TEMPLATE_IDS.NORTHSTAR);
});

test("prototype package tokens contain presentation only and preserve content across families", () => {
  const pkg = createResumePackage(candidate);
  const ids = [TEMPLATE_IDS.NORTHSTAR, TEMPLATE_IDS.CIVIC, TEMPLATE_IDS.STUDIO_EDITORIAL_V2];
  const plans = ids.map((designId) => buildResumeRenderPlan(pkg, { designId }, { allowPrototypeDesigns: true }));
  assert.equal(new Set(plans.map((plan) => plan.contentHash)).size, 1);
  assert.equal(new Set(plans.map((plan) => JSON.stringify(plan.manifest))).size, 1);
  for (const plan of plans) {
    const presentation = createApplicationPresentation(plan);
    assert.equal(validateApplicationPresentation(presentation), presentation);
    assert.equal(presentation.designId, plan.designId);
    assert.ok(presentation.tokens.bodyFontFamily);
    assert.ok(presentation.tokens.displayFontFamily);
    assert.ok(presentation.tokens.coverLetterBodyFontSizePt >= 10);
    assert.doesNotMatch(JSON.stringify(presentation), /Avery|Operations Analyst|Example Cooperative/);
  }
});

test("Civic uses deterministic display and body fallbacks while Studio v2 exposes a safe fallback", () => {
  const pkg = createResumePackage(candidate);
  const civic = createApplicationPresentation(buildResumeRenderPlan(pkg, { designId: TEMPLATE_IDS.CIVIC }, { allowPrototypeDesigns: true }));
  assert.equal(civic.tokens.docxDisplayFontFamily, "Georgia");
  assert.equal(civic.tokens.docxBodyFontFamily, "Arial");
  assert.equal(civic.tokens.pdfDisplayFontFamily, "times");
  assert.equal(civic.tokens.pdfBodyFontFamily, "helvetica");
  const studio = createApplicationPresentation(buildResumeRenderPlan(pkg, { designId: TEMPLATE_IDS.STUDIO_EDITORIAL_V2 }, { allowPrototypeDesigns: true }));
  assert.equal(studio.atsSafetyLevel, "moderate");
  assert.equal(studio.conservativeFallbackId, TEMPLATE_IDS.NORTHSTAR);
});

test("presentation validation rejects tampered geometry without touching document facts", () => {
  const pkg = createResumePackage(candidate);
  const presentation = createApplicationPresentation(buildResumeRenderPlan(pkg));
  assert.throws(() => validateApplicationPresentation({ ...presentation, tokens: { ...presentation.tokens, marginTopIn: 0.1 } }), /invalid|stale/i);
});
