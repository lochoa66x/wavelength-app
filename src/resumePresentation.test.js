import assert from "node:assert/strict";
import test from "node:test";

import {
  DENSITY_IDS,
  HEADER_ALIGNMENT_IDS,
  LENGTH_PREFERENCE_IDS,
  PALETTE_IDS,
  TEMPLATE_IDS,
  availableResumeDensities,
  availableResumeDesigns,
  availableResumePalettes,
  buildResumeRenderPlan,
  composeResumeVisualTokens,
  createResumeContentManifest,
  createResumePackage,
  manifestVisibleText,
} from "./resumeModel.js";
import { createResumeExportContext, validateResumeExportContext } from "./resumeReadiness.js";

const reviewedPosting = {
  posting_readiness: { status: "reviewed_complete", fit_allowed: true, application_ready_allowed: true },
  readiness: { status: "strong_fit" },
  integrity: { status: "passed" },
  application_ready: true,
  requirements: [{ id: "R1", requirement: "Preventive maintenance and safety documentation", evidence_match: "direct" }],
  coverage: { direct: 1, adjacent: 0, transferable: 0, missing: 0 },
};

const candidate = {
  name: "Jordan Lee",
  title: "Maintenance Technician",
  contact: "jordan@example.com | 416-555-0100 | Hamilton, Ontario",
  profile: "Maintenance technician with verified industrial troubleshooting, safety, and documentation experience.",
  skills: ["Preventive Maintenance", "Troubleshooting", "Lockout/Tagout", "CMMS"],
  experience: [{
    role: "Maintenance Technician",
    company: "Northline Manufacturing",
    dates: "2021 - Present",
    bullets: [
      { id: "maintenance-1", text: "Troubleshot production equipment and documented corrective work in the CMMS.", relevance: "direct" },
      { id: "maintenance-2", text: "Completed preventive maintenance while following lockout/tagout procedures.", relevance: "direct" },
    ],
  }],
  education: [{ degree: "Industrial Maintenance Certificate", institution: "Ontario College", dates: "2020" }],
  languages: [{ language: "English", proficiency: "Fluent" }],
  content_strategy: "direct",
};

const target = { title: "Facilities Maintenance Technician", company: "Example Manufacturing", category: "trades" };

function relativeLuminance(hex) {
  const channels = hex.slice(1).match(/.{2}/g).map((value) => Number.parseInt(value, 16) / 255);
  const linear = channels.map((value) => value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4);
  return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
}

function contrastRatio(left, right) {
  const [lighter, darker] = [relativeLuminance(left), relativeLuminance(right)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

test("seven styles, four palettes, and two densities preserve identical canonical content", () => {
  const pkg = createResumePackage(candidate, { item: target, atsReview: reviewedPosting });
  const baseline = buildResumeRenderPlan(pkg, {
    strategyId: pkg.presentation.selectedStrategyId,
    designId: TEMPLATE_IDS.ESSENTIAL_ATS,
  });
  const baselineManifest = createResumeContentManifest(baseline);
  const baselineText = manifestVisibleText(baselineManifest);

  assert.equal(availableResumeDesigns().length, 7);
  assert.equal(availableResumePalettes().length, 4);
  assert.equal(availableResumeDensities().length, 2);

  for (const design of availableResumeDesigns()) {
    for (const palette of availableResumePalettes()) {
      for (const density of availableResumeDensities()) {
        const plan = buildResumeRenderPlan(pkg, {
          strategyId: pkg.presentation.selectedStrategyId,
          designId: design.id,
          paletteId: palette.id,
          densityId: density.id,
        });
        assert.equal(plan.contentHash, pkg.contentHash);
        assert.deepEqual(createResumeContentManifest(plan), baselineManifest);
        assert.deepEqual(manifestVisibleText(plan.manifest), baselineText);
        assert.equal(plan.visualTokens.paletteId, palette.id);
        assert.equal(plan.visualTokens.densityId, density.id);
      }
    }
  }
});

test("presentation choices change render identity and layout tokens without changing evidence", () => {
  const pkg = createResumePackage(candidate, { item: target, atsReview: reviewedPosting });
  const comfortable = buildResumeRenderPlan(pkg, {
    strategyId: pkg.presentation.selectedStrategyId,
    designId: TEMPLATE_IDS.MODERN_SIGNAL,
    paletteId: PALETTE_IDS.SLATE_BLUE,
    densityId: DENSITY_IDS.COMFORTABLE,
    headerAlignment: HEADER_ALIGNMENT_IDS.CENTER,
    lengthPreference: LENGTH_PREFERENCE_IDS.TWO_PAGES,
  });
  const compact = buildResumeRenderPlan(pkg, {
    strategyId: pkg.presentation.selectedStrategyId,
    designId: TEMPLATE_IDS.MODERN_SIGNAL,
    paletteId: PALETTE_IDS.FOREST,
    densityId: DENSITY_IDS.COMPACT,
    headerAlignment: HEADER_ALIGNMENT_IDS.LEFT,
    lengthPreference: LENGTH_PREFERENCE_IDS.ONE_PAGE,
  });

  assert.notEqual(comfortable.renderPlanHash, compact.renderPlanHash);
  assert.deepEqual(comfortable.manifest, compact.manifest);
  assert.equal(comfortable.visualTokens.accent, "#315a87");
  assert.equal(compact.visualTokens.accent, "#1f604a");
  assert.equal(comfortable.visualTokens.headerAlignment, "center");
  assert.equal(compact.visualTokens.headerAlignment, "left");
  assert.equal(comfortable.pageTarget, 2);
  assert.equal(compact.pageTarget, 1);
  assert.ok(compact.visualTokens.marginTopIn <= comfortable.visualTokens.marginTopIn);
  assert.ok(compact.visualTokens.bodyFontSizePt <= comfortable.visualTokens.bodyFontSizePt);
  assert.ok(compact.visualTokens.bodyLineHeight <= comfortable.visualTokens.bodyLineHeight);
});

test("all palettes maintain readable accent contrast on white and their soft surface", () => {
  const design = availableResumeDesigns()[0];
  for (const palette of availableResumePalettes()) {
    const tokens = composeResumeVisualTokens(design, { paletteId: palette.id });
    assert.ok(contrastRatio(tokens.accent, tokens.paper) >= 4.5, `${palette.displayName} accent on white`);
    assert.ok(contrastRatio(tokens.accent, tokens.accentSoft) >= 4.5, `${palette.displayName} accent on soft surface`);
  }
});

test("export authorization is bound to palette, density, header, and length choices", () => {
  const context = createResumeExportContext(candidate, reviewedPosting, {
    item: target,
    strategyId: TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES,
    designId: TEMPLATE_IDS.FIELD_READY,
    paletteId: PALETTE_IDS.MONOCHROME,
    densityId: DENSITY_IDS.COMPACT,
    headerAlignment: HEADER_ALIGNMENT_IDS.LEFT,
    lengthPreference: LENGTH_PREFERENCE_IDS.ONE_PAGE,
  });
  assert.equal(validateResumeExportContext(context), context);

  const changedPresentation = structuredClone(context);
  changedPresentation.renderPlan.paletteId = PALETTE_IDS.GIGSCAPES_ORANGE;
  assert.throws(() => validateResumeExportContext(changedPresentation), /stale|does not match/i);
});
