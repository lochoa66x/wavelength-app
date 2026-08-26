import assert from "node:assert/strict";
import test from "node:test";

import {
  RESUME_TEMPLATE_REGISTRY,
  TEMPLATE_IDS,
  buildResumeRenderPlan,
  createResumePackage,
  manifestVisibleText,
} from "./resumeModel.js";

const verifiedPosting = {
  posting_readiness: { status: "reviewed_complete", fit_allowed: true, application_ready_allowed: true },
  readiness: { status: "strong_fit" },
  integrity: { status: "passed" },
  application_ready: true,
};

const universalTemplateIds = [
  TEMPLATE_IDS.CLASSIC_LEDGER,
  TEMPLATE_IDS.MODERN_SIGNAL,
  TEMPLATE_IDS.COMPACT_FOCUS,
  TEMPLATE_IDS.BOLD_IMPACT,
  TEMPLATE_IDS.STUDIO_EDITORIAL,
];

const careerFixtures = [
  ["healthcare", "Registered Nurse", "Coordinated patient assessments, medication administration, and discharge education with an interdisciplinary care team.", ["Patient assessment", "Care planning", "Clinical documentation"]],
  ["education", "Elementary School Teacher", "Planned differentiated lessons, assessed student progress, and communicated learning plans with families and support staff.", ["Lesson planning", "Classroom management", "Student assessment"]],
  ["finance", "Financial Accountant", "Prepared month-end reconciliations, investigated variances, and maintained audit-ready working papers under established controls.", ["General ledger", "Account reconciliation", "Financial reporting"]],
  ["logistics", "Warehouse Supervisor", "Scheduled daily receiving and shipping work, reinforced safe material handling, and resolved inventory discrepancies with the operations team.", ["Inventory control", "Shipping and receiving", "Safety procedures"]],
  ["hospitality", "Restaurant Manager", "Coordinated service shifts, coached front-of-house staff, and resolved guest concerns while maintaining food-safety procedures.", ["Guest service", "Team scheduling", "Food safety"]],
  ["community", "Community Support Worker", "Supported client service plans, documented case notes, and coordinated referrals with families and community partners.", ["Client support", "Case documentation", "Community referrals"]],
  ["engineering", "Civil Engineer", "Reviewed site drawings, coordinated field observations, and documented design changes with contractors and project stakeholders.", ["Technical drawings", "Field coordination", "Design documentation"]],
  ["trades", "Journeyperson Plumber", "Installed and repaired water-supply and drainage systems, interpreted plans, and completed work in accordance with site safety requirements.", ["Pipe installation", "Blueprint reading", "Troubleshooting"]],
];

function careerResume(title, bullet, skills) {
  return {
    name: "Taylor Morgan",
    title,
    contact: "taylor@example.com | 416-555-0188 | Toronto, Ontario",
    profile: `${title} with verified hands-on experience, dependable documentation, and collaborative service delivery.`,
    skills,
    experience: [{
      role: title,
      company: "Example Organization",
      dates: "2020 - Present",
      bullets: [bullet],
    }],
    training: [{ name: "Workplace Safety Training", provider: "Example Provider", dates: "2024" }],
    education: [{ degree: "Relevant diploma or degree", institution: "Example College", dates: "2020" }],
    languages: [{ language: "English", proficiency: "Fluent" }],
    content_strategy: "direct",
  };
}

function factualItemIds(plan) {
  return plan.manifest.sections.flatMap((section) => section.items.flatMap((item) => [
    item.id,
    ...(item.bullets || []).map((bullet) => bullet.id),
    ...(item.details || []).map((detail) => detail.id),
  ])).sort();
}

function relativeLuminance(hex) {
  const channels = hex.replace("#", "").match(/.{2}/g).map((part) => Number.parseInt(part, 16) / 255);
  const linear = channels.map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
  return (0.2126 * linear[0]) + (0.7152 * linear[1]) + (0.0722 * linear[2]);
}

function contrastRatio(left, right) {
  const brighter = Math.max(relativeLuminance(left), relativeLuminance(right));
  const darker = Math.min(relativeLuminance(left), relativeLuminance(right));
  return (brighter + 0.05) / (darker + 0.05);
}

test("universal design styles preserve occupation-aware content across broad career fixtures", () => {
  for (const [fixtureName, title, bullet, skills] of careerFixtures) {
    const resumePackage = createResumePackage(careerResume(title, bullet, skills), {
      item: { title, company: "Target Employer", category: fixtureName },
      atsReview: verifiedPosting,
    });
    const plans = universalTemplateIds.map((templateId) => buildResumeRenderPlan(resumePackage, templateId));
    const contentPlan = buildResumeRenderPlan(resumePackage, plans[0].contentTemplateId);
    const expectedVisibleText = manifestVisibleText(contentPlan.manifest);
    const expectedIds = factualItemIds(contentPlan);

    for (const plan of plans) {
      assert.equal(plan.contentTemplateId, contentPlan.templateId, `${fixtureName}: wrong adaptive content family`);
      assert.equal(plan.contentHash, contentPlan.contentHash, `${fixtureName}: content hash changed`);
      assert.deepEqual(plan.sections.map(({ id }) => id), contentPlan.sections.map(({ id }) => id), `${fixtureName}: section order changed`);
      assert.deepEqual(plan.sections.map(({ heading }) => heading), contentPlan.sections.map(({ heading }) => heading), `${fixtureName}: headings changed`);
      assert.deepEqual(factualItemIds(plan), expectedIds, `${fixtureName}: factual items changed`);
      assert.deepEqual(manifestVisibleText(plan.manifest), expectedVisibleText, `${fixtureName}: visible facts changed`);
      assert.doesNotMatch(JSON.stringify(plan), /\[object Object\]|"undefined"|"null"/i, `${fixtureName}: serialization artifact`);
      assert.equal(RESUME_TEMPLATE_REGISTRY[plan.templateId].previewMetadata.columnCount, 1);
      assert.equal(RESUME_TEMPLATE_REGISTRY[plan.templateId].previewMetadata.hasSidebar, false);
      assert.equal(RESUME_TEMPLATE_REGISTRY[plan.templateId].previewMetadata.usesGraphics, false);
    }
  }
});

test("universal styles are visually distinct and retain readable text contrast", () => {
  const signatures = new Set();
  for (const templateId of universalTemplateIds) {
    const template = RESUME_TEMPLATE_REGISTRY[templateId];
    const tokens = template.visualTokens;
    signatures.add([tokens.docxFontFamily, tokens.headerTreatment, tokens.sectionTreatment, tokens.accent].join("|"));

    const headingBackground = tokens.sectionTreatment === "soft-band" ? tokens.accentSoft : tokens.paper;
    assert.ok(contrastRatio(tokens.accent, headingBackground) >= 4.5, `${templateId}: section contrast is below 4.5:1`);
    if (tokens.headerTreatment === "accent-band") {
      assert.ok(contrastRatio(tokens.headerText, tokens.headerBackground) >= 4.5, `${templateId}: header contrast is below 4.5:1`);
    } else {
      assert.ok(contrastRatio(tokens.ink, tokens.paper) >= 4.5, `${templateId}: body contrast is below 4.5:1`);
    }
  }
  assert.equal(signatures.size, universalTemplateIds.length);
});
