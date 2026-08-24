import test from "node:test";
import assert from "node:assert/strict";

import { buildAtsReview } from "../api/_lib/atsValidation.js";
import { createSafeResumeFallback } from "../api/_lib/safeResumeFallback.js";

test("the deterministic fallback omits final unsafe claims instead of failing the whole resume", () => {
  const baseResume = "Operations Manager — Real Corp — 2020–2023\nLed systems integration programs.";
  const analysis = {
    fit_assessment: { path: "career_change" },
    verified_transferable_skills: [{ skill: "Systems integration" }],
    requirements: [],
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

  assert.equal(finalReview.status, "ready");
  assert.equal(resume.experience.length, 1);
  assert.equal(resume.experience[0].role, "Operations Manager");
  assert.equal(resume.title, "Operations Manager | Career Transition");
  assert.deepEqual(resume.skills, ["Systems integration"]);
  assert.equal(report.omitted_experience_count, 1);
  assert.equal(report.removed_numeric_claim_count, 2);
});
