import test from "node:test";
import assert from "node:assert/strict";

import { buildAtsReview } from "../api/_lib/atsValidation.js";
import { createSafeResumeFallback } from "../api/_lib/safeResumeFallback.js";

test("the deterministic fallback omits final unsafe claims instead of failing the whole resume", () => {
  const baseResume = "Operations Manager — Real Corp — 2020–2023\nLed systems integration programs.";
  const analysis = {
    fit_assessment: { path: "career_change" },
    verified_transferable_skills: [{ skill: "Systems integration" }],
    requirements: [
      {
        id: "R1",
        requirement: "Lead systems integration programs",
        priority: "responsibility",
        evidence_match: "transferable",
        resume_evidence: "Led systems integration programs.",
      },
      {
        id: "R2",
        requirement: "Full stack web development",
        priority: "required",
        evidence_match: "missing",
        resume_evidence: "",
      },
    ],
    prohibited_claims: [],
    posting_assessment: {
      status: "complete",
      reason: "Complete.",
      fit_allowed: true,
      application_ready_allowed: true,
    },
    posting_readiness: {
      status: "reviewed_complete",
      reason: "Responsibilities and qualifications reviewed.",
      fit_allowed: true,
      application_ready_allowed: true,
    },
    coverage: { direct: 0, adjacent: 0, transferable: 1, missing: 1 },
    readiness: { status: "significant_gap", reason: "Target-domain evidence is missing." },
  };
  const rejected = {
    title: "Full Stack Web Developer",
    profile: "Operations leader who increased delivery by 47%.",
    skills: ["Systems integration", "React"],
    projects: [],
    training: [],
    experience: [
      { role: "Operations Manager", company: "Real Corp", dates: "2020–2023", bullets: ["Led systems integration programs."] },
      { role: "Web Developer", company: "Real Corp", dates: "2020–2023", bullets: ["Built 8 applications."] },
    ],
  };
  const rejectedReview = buildAtsReview(rejected, baseResume, { keywords: [] }, {
    analysis,
    targetTitle: "Full Stack Web Developer",
  });
  const { resume, report } = createSafeResumeFallback(rejected, rejectedReview, analysis);
  const finalReview = buildAtsReview(resume, baseResume, { keywords: [] }, {
    analysis,
    targetTitle: "Full Stack Web Developer",
  });

  assert.equal(finalReview.status, "review");
  assert.equal(finalReview.application_ready, false);
  assert.deepEqual(finalReview.export_readiness.blockers, ["candidate_fit", "candidate_identity"]);
  assert.equal(resume.experience.length, 1);
  assert.equal(resume.experience[0].role, "Operations Manager");
  assert.equal(resume.title, "Operations Manager");
  assert.deepEqual(resume.skills, ["Systems integration"]);
  assert.equal(report.omitted_experience_count, 1);
  assert.equal(report.removed_numeric_claim_count, 2);
});

test("the deterministic fallback restores cited wording after an ownership escalation", () => {
  const source = "Contributed to creation of functional specifications for Contract Accounts.";
  const proposed = "Authored functional specifications for Contract Accounts.";
  const baseResume = `SAP Consultant — Real Corp — 2020–2024\n${source}`;
  const analysis = {
    posting_assessment: { status: "complete", fit_allowed: true, application_ready_allowed: true },
    posting_readiness: { status: "reviewed_complete", fit_allowed: true, application_ready_allowed: true },
    requirements: [{
      id: "R1",
      requirement: "Prepare functional specifications for Contract Accounts",
      priority: "required",
      evidence_match: "direct",
      evidence: [{ source: "base_resume", line_index: 2, excerpt: source }],
    }],
    coverage: { direct: 1, adjacent: 0, transferable: 0, missing: 0 },
  };
  const rejected = {
    name: "Luis Example",
    profile: "SAP functional consultant.",
    skills: [],
    projects: [],
    training: [],
    experience: [{ role: "SAP Consultant", company: "Real Corp", dates: "2020–2024", bullets: [proposed] }],
  };
  const rejectedReview = buildAtsReview(rejected, baseResume, { keywords: [] }, { analysis });
  const { resume, report } = createSafeResumeFallback(rejected, rejectedReview, analysis);
  const finalReview = buildAtsReview(resume, baseResume, { keywords: [] }, { analysis });

  assert.equal(rejectedReview.provenance_issues[0].issue_type, "unsupported_strengthening");
  assert.deepEqual(resume.experience[0].bullets, [source]);
  assert.equal(report.restored_provenance_count, 1);
  assert.equal(report.omitted_provenance_count, 0);
  assert.equal(finalReview.provenance_issues.length, 0);
  assert.equal(finalReview.integrity.status, "pass");
});
