import test from "node:test";
import assert from "node:assert/strict";

import {
  coverLetterToPlainText,
  createCoverLetterExportContext,
  createCoverLetterPlan,
  getCoverLetterReadiness,
  removeCoverLetterParagraph,
  updateCoverLetterParagraph,
  validateCoverLetterExportContext,
} from "./coverLetterModel.js";

const baseResume = "Jordan Lee\njordan@example.com | Hamilton, Ontario\nIndustrial Electrician\nInstalled and maintained electrical panels.\nCompleted preventive maintenance in a CMMS.";
const resumeData = {
  name: "Jordan Lee",
  contact: "jordan@example.com | Hamilton, Ontario",
  title: "Industrial Electrician",
  profile: "Industrial electrician focused on safe maintenance.",
  experience: [{ role: "Industrial Electrician", company: "North Plant", dates: "2021 - 2025", bullets: ["Installed and maintained electrical panels.", "Completed preventive maintenance in a CMMS."] }],
  skills: ["Electrical maintenance", "CMMS"],
};
const item = { id: "listing-1", title: "Facilities Electrician", company: "Northline Manufacturing", location: "Hamilton, Ontario" };
const atsReview = {
  posting_readiness: { status: "reviewed_complete", fit_allowed: true, application_ready_allowed: true },
  readiness: { status: "strong_fit" },
  candidate_fit: { status: "direct" },
  requirements: [
    { id: "R1", requirement: "Install and maintain electrical panels", evidence_match: "direct" },
    { id: "R2", requirement: "Document work in the CMMS", evidence_match: "direct" },
  ],
  coverage: { direct: 2, adjacent: 0, transferable: 0, missing: 0 },
  integrity: { status: "pass" },
  writing: { status: "pass" },
  export_readiness: { status: "enabled", blockers: [] },
};

function draft() {
  return {
    voice: "direct",
    length: "short",
    salutation: "Dear Hiring Team,",
    paragraphs: [
      { id: "opening", purpose: "opening", text: "I am applying for the Facilities Electrician role with evidence in plant electrical maintenance.", evidence_refs: ["Installed and maintained electrical panels."], requirement_refs: ["Install and maintain electrical panels"], explanation: "Connects direct maintenance evidence to the role.", evidence_match: "direct" },
      { id: "evidence", purpose: "evidence", text: "My maintenance work also included accurate CMMS documentation for preventive tasks.", evidence_refs: ["Completed preventive maintenance in a CMMS."], requirement_refs: ["Document work in the CMMS"], explanation: "Shows documentation evidence.", evidence_match: "direct" },
      { id: "closing", purpose: "closing", text: "Thank you for considering my application. I would welcome a conversation about the role.", evidence_refs: [], requirement_refs: [], explanation: "Closes without adding a claim.", evidence_match: "neutral" },
    ],
    signoff: "Sincerely,",
  };
}

test("cover letter plan has a stable canonical hash and application-ready gate", () => {
  const context = { baseResume, resumeData, item, atsReview, candidateEvidence: [] };
  const plan = createCoverLetterPlan(draft(), context);
  assert.equal(plan.kind, "cover-letter-plan");
  assert.equal(getCoverLetterReadiness(plan, context).state, "application_ready");
  assert.match(coverLetterToPlainText(plan), /Facilities Electrician/);
  assert.doesNotMatch(coverLetterToPlainText(plan), /application-ready|preliminary/i);
  assert.equal(validateCoverLetterExportContext(createCoverLetterExportContext(plan, context)).plan.contentHash, plan.contentHash);
});

test("the same verified letter becomes preliminary when the resume assessment is preliminary", () => {
  const preliminaryReview = { ...atsReview, readiness: { status: "significant_gap" } };
  const context = { baseResume, resumeData, item, atsReview: preliminaryReview, candidateEvidence: [] };
  const plan = createCoverLetterPlan(draft(), context);
  assert.equal(getCoverLetterReadiness(plan, context).state, "preliminary");
});

test("stale evidence and tampered content block cover-letter export", () => {
  const context = { baseResume, resumeData, item, atsReview, candidateEvidence: [] };
  const plan = createCoverLetterPlan(draft(), context);
  assert.equal(getCoverLetterReadiness(plan, { ...context, baseResume: `${baseResume}\nNew fact` }).stale, true);
  assert.throws(() => validateCoverLetterExportContext({ ...createCoverLetterExportContext(plan, context), plan: { ...plan, paragraphs: [{ ...plan.paragraphs[0], text: "tampered" }] } }), /invalid|stale/i);
});

test("user edits reject invented numbers and risky personal claims", () => {
  const plan = createCoverLetterPlan(draft(), { baseResume, resumeData, item, atsReview });
  const paragraph = plan.paragraphs[0];
  assert.equal(updateCoverLetterParagraph(plan, paragraph.id, `${paragraph.text} I improved uptime by 47%.`, { baseResume, item }).ok, false);
  assert.equal(updateCoverLetterParagraph(plan, paragraph.id, `${paragraph.text} I was referred by the hiring manager.`, { baseResume, item }).ok, false);
  const safe = updateCoverLetterParagraph(plan, paragraph.id, `${paragraph.text} I would welcome the opportunity to contribute.`, { baseResume, item });
  assert.equal(safe.ok, true);
});

test("user edits cannot introduce a new unsupported capability", () => {
  const plan = createCoverLetterPlan(draft(), { baseResume, resumeData, item, atsReview });
  const paragraph = plan.paragraphs[0];
  const invented = updateCoverLetterParagraph(plan, paragraph.id, `${paragraph.text} I also managed Kubernetes production systems.`, { baseResume, item });
  assert.equal(invented.ok, false);
  assert.match(invented.message, /verified sources/i);
});

test("removing too many paragraphs recalculates and blocks readiness", () => {
  const context = { baseResume, resumeData, item, atsReview };
  let plan = createCoverLetterPlan(draft(), context);
  plan = removeCoverLetterParagraph(plan, "evidence");
  plan = removeCoverLetterParagraph(plan, "closing");
  assert.equal(getCoverLetterReadiness(plan, context).state, "blocked");
});
