import assert from "node:assert/strict";
import test from "node:test";

import {
  DENSITY_IDS,
  HEADER_ALIGNMENT_IDS,
  LENGTH_PREFERENCE_IDS,
  PALETTE_IDS,
  TEMPLATE_IDS,
} from "./resumeModel.js";
import {
  loadResumePresentationSelection,
  loadResumeTemplateSelection,
  resumeTemplateStorageKey,
  resumeTemplateTargetKey,
  saveResumePresentationSelection,
  saveResumeTemplateSelection,
} from "./resumeTemplateStorage.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

const DEFAULT_PRESENTATION = Object.freeze({
  paletteId: PALETTE_IDS.GIGSCAPES_ORANGE,
  densityId: DENSITY_IDS.COMFORTABLE,
  headerAlignment: HEADER_ALIGNMENT_IDS.STYLE_DEFAULT,
  lengthPreference: LENGTH_PREFERENCE_IDS.AUTO,
});

test("template selection is isolated by account and target", () => {
  const storage = memoryStorage();
  const targetA = resumeTemplateTargetKey({ id: "listing-a" });
  const targetB = resumeTemplateTargetKey({ id: "listing-b" });
  assert.equal(saveResumeTemplateSelection("user-a", targetA, TEMPLATE_IDS.SAP_FUNCTIONAL, storage), true);
  assert.equal(loadResumeTemplateSelection("user-a", targetA, storage), TEMPLATE_IDS.SAP_FUNCTIONAL);
  assert.equal(loadResumeTemplateSelection("user-b", targetA, storage), null);
  assert.equal(loadResumeTemplateSelection("user-a", targetB, storage), null);
  assert.notEqual(resumeTemplateStorageKey("user-a", targetA), resumeTemplateStorageKey("user-b", targetA));
});

test("unknown or malformed stored template IDs fail safely", () => {
  const storage = memoryStorage();
  const target = resumeTemplateTargetKey({ title: "Private custom target", company: "Example" });
  const key = resumeTemplateStorageKey("user-a", target);
  storage.setItem(key, JSON.stringify({ version: 1, templateId: "removed-template" }));
  assert.equal(loadResumeTemplateSelection("user-a", target, storage), null);
  storage.setItem(key, "not-json");
  assert.equal(loadResumeTemplateSelection("user-a", target, storage), null);
  assert.equal(saveResumeTemplateSelection("user-a", target, "removed-template", storage), false);
});

test("template persistence requires an account-scoped identity", () => {
  const storage = memoryStorage();
  const target = resumeTemplateTargetKey({ id: "listing-a" });
  assert.equal(saveResumeTemplateSelection("", target, TEMPLATE_IDS.ATS_CORE, storage), false);
  assert.equal(loadResumeTemplateSelection("", target, storage), null);
});

test("Phase B1 template IDs persist without crossing account or target scope", () => {
  const storage = memoryStorage();
  const technicalTarget = resumeTemplateTargetKey({ id: "technical-listing" });
  const adminTarget = resumeTemplateTargetKey({ id: "admin-listing" });
  assert.equal(saveResumeTemplateSelection("user-a", technicalTarget, TEMPLATE_IDS.TECHNICAL_SOFTWARE, storage), true);
  assert.equal(saveResumeTemplateSelection("user-a", adminTarget, TEMPLATE_IDS.ADMIN_CUSTOMER_OPERATIONS, storage), true);
  assert.equal(loadResumeTemplateSelection("user-a", technicalTarget, storage), TEMPLATE_IDS.TECHNICAL_SOFTWARE);
  assert.equal(loadResumeTemplateSelection("user-a", adminTarget, storage), TEMPLATE_IDS.ADMIN_CUSTOMER_OPERATIONS);
  assert.equal(loadResumeTemplateSelection("user-b", technicalTarget, storage), null);
});

test("Phase B2 persists per account and target and adapts the hidden legacy trades ID", () => {
  const storage = memoryStorage();
  const target = resumeTemplateTargetKey({ id: "trade-listing" });
  assert.equal(saveResumeTemplateSelection("user-a", target, TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES, storage), true);
  assert.equal(loadResumeTemplateSelection("user-a", target, storage), TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES);
  assert.equal(loadResumeTemplateSelection("user-b", target, storage), null);

  const legacyTarget = resumeTemplateTargetKey({ id: "legacy-trade-listing" });
  const legacyKey = resumeTemplateStorageKey("user-a", legacyTarget);
  storage.setItem(legacyKey, JSON.stringify({ version: 1, templateId: "trades-legacy-v1" }));
  assert.equal(loadResumeTemplateSelection("user-a", legacyTarget, storage), TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES);
});

test("Phase B3 persists both families per account and migrates unversioned aliases", () => {
  const storage = memoryStorage();
  const marketingTarget = resumeTemplateTargetKey({ id: "marketing-listing" });
  const creativeTarget = resumeTemplateTargetKey({ id: "creative-listing" });
  assert.equal(saveResumeTemplateSelection("user-a", marketingTarget, TEMPLATE_IDS.MARKETING_COMMUNICATIONS, storage), true);
  assert.equal(saveResumeTemplateSelection("user-a", creativeTarget, TEMPLATE_IDS.CREATIVE_DESIGN, storage), true);
  assert.equal(loadResumeTemplateSelection("user-a", marketingTarget, storage), TEMPLATE_IDS.MARKETING_COMMUNICATIONS);
  assert.equal(loadResumeTemplateSelection("user-a", creativeTarget, storage), TEMPLATE_IDS.CREATIVE_DESIGN);
  assert.equal(loadResumeTemplateSelection("user-b", marketingTarget, storage), null);

  const legacyMarketing = resumeTemplateTargetKey({ id: "legacy-marketing-listing" });
  storage.setItem(resumeTemplateStorageKey("user-a", legacyMarketing), JSON.stringify({ version: 1, templateId: "marketing-communications" }));
  assert.equal(loadResumeTemplateSelection("user-a", legacyMarketing, storage), TEMPLATE_IDS.MARKETING_COMMUNICATIONS);

  const legacyCreative = resumeTemplateTargetKey({ id: "legacy-creative-listing" });
  storage.setItem(resumeTemplateStorageKey("user-a", legacyCreative), JSON.stringify({ version: 1, templateId: "creative-design" }));
  assert.equal(loadResumeTemplateSelection("user-a", legacyCreative, storage), TEMPLATE_IDS.CREATIVE_DESIGN);
});

test("visual design and content strategy persist independently and legacy choices migrate deterministically", () => {
  const storage = memoryStorage();
  const target = resumeTemplateTargetKey({ id: "presentation-v2" });
  assert.equal(saveResumePresentationSelection("user-a", target, {
    strategyId: TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES,
    designId: TEMPLATE_IDS.BOLD_IMPACT,
  }, storage), true);
  assert.deepEqual(loadResumePresentationSelection("user-a", target, storage), {
    strategyId: TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES,
    designId: TEMPLATE_IDS.BOLD_IMPACT,
    ...DEFAULT_PRESENTATION,
  });
  assert.equal(loadResumePresentationSelection("user-b", target, storage), null);

  const legacyRoleTarget = resumeTemplateTargetKey({ id: "legacy-role" });
  storage.setItem(resumeTemplateStorageKey("user-a", legacyRoleTarget), JSON.stringify({ version: 1, templateId: TEMPLATE_IDS.CREATIVE_DESIGN }));
  assert.deepEqual(loadResumePresentationSelection("user-a", legacyRoleTarget, storage), {
    strategyId: TEMPLATE_IDS.CREATIVE_DESIGN,
    designId: TEMPLATE_IDS.STUDIO_EDITORIAL,
    ...DEFAULT_PRESENTATION,
  });

  const legacyDesignTarget = resumeTemplateTargetKey({ id: "legacy-design" });
  storage.setItem(resumeTemplateStorageKey("user-a", legacyDesignTarget), JSON.stringify({ version: 1, templateId: TEMPLATE_IDS.COMPACT_FOCUS }));
  assert.deepEqual(loadResumePresentationSelection("user-a", legacyDesignTarget, storage), {
    strategyId: TEMPLATE_IDS.ATS_CORE,
    designId: TEMPLATE_IDS.COMPACT_FOCUS,
    ...DEFAULT_PRESENTATION,
  });
});

test("presentation modifiers round-trip and version 2 choices receive deterministic defaults", () => {
  const storage = memoryStorage();
  const target = resumeTemplateTargetKey({ id: "presentation-v3" });
  const custom = {
    strategyId: TEMPLATE_IDS.PROJECT_LEADERSHIP,
    designId: TEMPLATE_IDS.MODERN_SIGNAL,
    paletteId: PALETTE_IDS.FOREST,
    densityId: DENSITY_IDS.COMPACT,
    headerAlignment: HEADER_ALIGNMENT_IDS.LEFT,
    lengthPreference: LENGTH_PREFERENCE_IDS.ONE_PAGE,
  };
  assert.equal(saveResumePresentationSelection("user-a", target, custom, storage), true);
  assert.deepEqual(loadResumePresentationSelection("user-a", target, storage), custom);

  const v2Target = resumeTemplateTargetKey({ id: "presentation-v2-migration" });
  storage.setItem(resumeTemplateStorageKey("user-a", v2Target), JSON.stringify({
    version: 2,
    strategyId: TEMPLATE_IDS.ATS_CORE,
    designId: TEMPLATE_IDS.CLASSIC_LEDGER,
  }));
  assert.deepEqual(loadResumePresentationSelection("user-a", v2Target, storage), {
    strategyId: TEMPLATE_IDS.ATS_CORE,
    designId: TEMPLATE_IDS.CLASSIC_LEDGER,
    ...DEFAULT_PRESENTATION,
  });
});
