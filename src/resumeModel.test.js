import assert from "node:assert/strict";
import test from "node:test";

import {
  TEMPLATE_IDS,
  analyzeResumeWording,
  buildResumeContentPlan,
  buildResumeRenderPlan,
  createResumePackage,
  manifestVisibleText,
} from "./resumeModel.js";
import { createResumeExportContext, validateResumeExportContext } from "./resumeReadiness.js";
import { resumeDataToPlainText } from "./resumeText.js";

const verifiedPosting = {
  posting_readiness: { status: "reviewed_complete", fit_allowed: true, application_ready_allowed: true },
  readiness: { status: "strong_fit" },
  integrity: { status: "passed" },
  application_ready: true,
};

function baseResume(overrides = {}) {
  return {
    name: "Morgan Lee",
    title: "Senior SAP Functional Consultant",
    contact: "morgan@example.com | 416-555-0100 | Toronto, Ontario",
    profile: "SAP functional consultant with verified implementation, requirements, integration, and UAT delivery experience.",
    skills: ["SAP S/4HANA", "FI-CA", "Requirements Gathering", "UAT"],
    experience: [{
      role: "Senior SAP Functional Consultant",
      company: "Example Consulting",
      dates: "2020 - Present",
      bullets: [
        { id: "sap-leadership", text: "Led verified SAP functional requirements and integration workshops.", responsibilityLevel: "led", relevance: "direct" },
        { id: "sap-uat", text: "Coordinated UAT and cutover preparation with business stakeholders.", responsibilityLevel: "contributed", relevance: "direct" },
      ],
    }],
    education: [{ degree: "Bachelor of Commerce", institution: "Example University", dates: "2014" }],
    languages: [{ language: "English", proficiency: "Fluent" }],
    content_strategy: "direct",
    ...overrides,
  };
}

test("canonical package separates facts, evidence, classification, and presentation", () => {
  const resumePackage = createResumePackage(baseResume(), {
    item: { title: "SAP FICO Functional Consultant", company: "Example Bank", category: "tech" },
    atsReview: verifiedPosting,
  });
  assert.equal(resumePackage.schemaVersion, 2);
  assert.equal(resumePackage.document.candidate.fullName, "Morgan Lee");
  assert.equal(resumePackage.document.target.jobTitle, "SAP FICO Functional Consultant");
  assert.equal(resumePackage.classification.occupationFamily, "sap-functional");
  assert.equal(resumePackage.presentation.recommendedTemplateId, TEMPLATE_IDS.SAP_FUNCTIONAL);
  assert.equal(resumePackage.validation.valid, true);
  assert.ok(resumePackage.evidence.items["sap-leadership"]);
  assert.doesNotMatch(JSON.stringify(resumePackage.document), /sourceReferences|recommendationTrace|posting_readiness/);
});

test("deterministic recommendation distinguishes functional SAP, technical SAP, leadership, transition, and fallback", () => {
  const functional = createResumePackage(baseResume(), { item: { title: "SAP FICO Functional Consultant", category: "tech" }, atsReview: verifiedPosting });
  assert.equal(functional.presentation.recommendedTemplateId, TEMPLATE_IDS.SAP_FUNCTIONAL);

  const technical = createResumePackage(baseResume(), { item: { title: "SAP ABAP Developer", category: "tech" }, atsReview: verifiedPosting });
  assert.equal(technical.classification.functionalVersusTechnical, "technical");
  assert.equal(technical.presentation.recommendedTemplateId, TEMPLATE_IDS.ATS_CORE);

  const leadership = createResumePackage(baseResume({ title: "Project Delivery Leader" }), { item: { title: "Program Manager", category: "business" }, atsReview: verifiedPosting });
  assert.equal(leadership.presentation.recommendedTemplateId, TEMPLATE_IDS.PROJECT_LEADERSHIP);

  const transition = createResumePackage(baseResume({ content_strategy: "career_change" }), { item: { title: "Marketing Specialist", category: "marketing" }, atsReview: { ...verifiedPosting, readiness: { status: "significant_gap" } } });
  assert.equal(transition.presentation.recommendedTemplateId, TEMPLATE_IDS.CAREER_TRANSITION);

  const generic = createResumePackage(baseResume({ title: "Operations Analyst", content_strategy: "direct" }), { item: { title: "Operations Analyst", category: "business" }, atsReview: verifiedPosting });
  assert.equal(generic.presentation.recommendedTemplateId, TEMPLATE_IDS.ATS_CORE);
});

test("adjacent SAP module pivot remains functional without inserting the target module", () => {
  const resumePackage = createResumePackage(baseResume({ content_strategy: "adjacent" }), {
    item: { title: "SAP MM Functional Consultant", category: "tech" },
    atsReview: { ...verifiedPosting, readiness: { status: "credible_stretch" } },
  });
  assert.equal(resumePackage.presentation.recommendedTemplateId, TEMPLATE_IDS.SAP_FUNCTIONAL);
  assert.equal(resumePackage.classification.careerStrategy, "adjacent");
  assert.doesNotMatch(JSON.stringify(resumePackage.document.skills), /SAP MM/i);
});

test("template override changes presentation only and preserves factual IDs and content hash", () => {
  const original = createResumePackage(baseResume(), { item: { title: "SAP Functional Consultant", category: "tech" }, atsReview: verifiedPosting });
  const overridden = createResumePackage(original, { selectedTemplateId: TEMPLATE_IDS.PROJECT_LEADERSHIP });
  assert.equal(overridden.contentHash, original.contentHash);
  assert.deepEqual(buildResumeContentPlan(overridden), buildResumeContentPlan(original));
  assert.equal(overridden.classification.occupationFamily, original.classification.occupationFamily);
  assert.equal(overridden.classification.careerStrategy, original.classification.careerStrategy);
  assert.equal(overridden.presentation.selectedTemplateId, TEMPLATE_IDS.PROJECT_LEADERSHIP);
});

test("all four templates keep the same selected factual item IDs", () => {
  const resumePackage = createResumePackage(baseResume(), { item: { title: "SAP Functional Consultant", category: "tech" }, atsReview: verifiedPosting });
  const ids = (plan) => plan.manifest.sections.flatMap((section) => section.items.flatMap((item) => [item.id, ...(item.bullets || []).map((bullet) => bullet.id), ...(item.details || []).map((detail) => detail.id)])).sort();
  const plans = Object.values(TEMPLATE_IDS).filter((id) => id !== TEMPLATE_IDS.LEGACY_TRADES).map((id) => buildResumeRenderPlan(resumePackage, id));
  for (const plan of plans.slice(1)) assert.deepEqual(ids(plan), ids(plans[0]));
});

test("malformed values and cycles are omitted with warnings instead of object coercion", () => {
  const cycle = {};
  cycle.text = cycle;
  const resumePackage = createResumePackage(baseResume({
    profile: { arbitrary: { private: "do-not-render" } },
    skills: [{ text: cycle }, { name: "Verified skill" }],
    languages: [null, { arbitrary: "private" }],
  }));
  const visible = manifestVisibleText(buildResumeRenderPlan(resumePackage));
  assert.match(visible.join(" "), /Verified skill/);
  assert.doesNotMatch(visible.join(" "), /\[object Object\]|undefined|null|do-not-render|private/i);
  assert.ok(resumePackage.validation.warnings.some((entry) => entry.code === "unsupported_structured_value"));
});

test("unknown future canonical schema versions fail closed", () => {
  assert.throws(() => createResumePackage({ kind: "resume-package", schemaVersion: 999 }), /Unsupported ResumePackage schema version/);
});

test("wording analysis reports repeated verbs, vague wording, duplicate bullets, and unsupported ownership", () => {
  const resumePackage = createResumePackage(baseResume({
    experience: [{
      role: "Coordinator",
      company: "Example",
      dates: "2019 - 2022",
      bullets: [
        { id: "a", text: "Led the delivery work with stakeholders.", responsibilityLevel: "supported" },
        { id: "b", text: "Led the delivery work with stakeholders.", responsibilityLevel: "supported" },
        { id: "c", text: "Led planning activities for the release.", responsibilityLevel: "supported" },
        { id: "d", text: "Worked on project administration." },
      ],
    }],
  }));
  const codes = new Set(analyzeResumeWording(resumePackage).map((issue) => issue.code));
  for (const code of ["unsupported_ownership", "repeated_opening", "duplicate_bullet", "vague_opening"]) assert.ok(codes.has(code), code);
});

test("export authorization is bound to content, identity, posting, schema, and mode", () => {
  const context = createResumeExportContext(baseResume(), verifiedPosting, { item: { title: "SAP Functional Consultant", category: "tech" }, templateId: TEMPLATE_IDS.SAP_FUNCTIONAL });
  assert.equal(validateResumeExportContext(context), context);
  assert.equal(context.authorization.mode, "final");
  assert.match(resumeDataToPlainText(context), /Morgan Lee/);

  const tampered = {
    ...context,
    resumePackage: { ...context.resumePackage, contentHash: "resume-tampered" },
  };
  assert.throws(() => validateResumeExportContext(tampered), /stale|does not match/i);

  const stalePosting = {
    ...context,
    assessment: { ...context.assessment, posting_readiness: { status: "partial", fit_allowed: false, application_ready_allowed: false } },
  };
  assert.throws(() => validateResumeExportContext(stalePosting), /stale|does not match/i);
  assert.throws(() => resumeDataToPlainText(stalePosting), /stale|does not match/i);

  const contentDrift = {
    ...context,
    resumePackage: {
      ...context.resumePackage,
      document: { ...context.resumePackage.document, summary: "Tampered summary" },
    },
  };
  assert.throws(() => validateResumeExportContext(contentDrift), /content hash/i);

  const renderDrift = {
    ...context,
    renderPlan: {
      ...context.renderPlan,
      header: { ...context.renderPlan.header, headline: "Tampered headline" },
    },
  };
  assert.throws(() => validateResumeExportContext(renderDrift), /stale|does not match/i);
});

test("partial posting creates a preliminary context and missing identity blocks export", () => {
  const preliminary = createResumeExportContext(baseResume(), {
    posting_readiness: { status: "partial", fit_allowed: false, application_ready_allowed: false },
    readiness: { status: "needs_full_posting" },
    application_ready: false,
  });
  assert.equal(preliminary.authorization.mode, "preliminary");
  assert.equal(preliminary.renderPlan.preliminary, true);
  const missingIdentity = createResumeExportContext(baseResume({ name: "candidate" }), verifiedPosting);
  assert.equal(missingIdentity.readiness.canExport, false);
  assert.throws(() => validateResumeExportContext(missingIdentity), /Candidate name/i);
});
