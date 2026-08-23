import test from "node:test";
import assert from "node:assert/strict";

import { shapeTailoredResume } from "../api/_lib/resumeQuality.js";
import { getResumeExportReadiness, hasUsableResumeIdentity } from "../src/resumeReadiness.js";

const analysis = {
  fit_assessment: { path: "career_change" },
  coverage: { direct: 0, adjacent: 0, transferable: 2, missing: 3 },
  verified_transferable_skills: [
    { skill: "Systems integration", resume_evidence: "Led systems integration programs." },
    { skill: "Cross-functional collaboration", resume_evidence: "Coordinated cross-functional teams." },
  ],
  requirements: [{
    evidence_match: "transferable",
    safe_language: "Structured delivery",
    resume_evidence: "Led systems integration programs.",
    keywords: ["delivery"],
  }],
};

test("career-change shaping removes placeholders, unsupported progress, and irrelevant skill inventory", () => {
  const resume = shapeTailoredResume({
    name: "<UNKNOWN>",
    title: "Enterprise Systems Professional | Web Development Transition",
    profile: "Enterprise systems professional with delivery experience. Actively building web development skills for frontend and backend work.",
    skills: ["SAP S/4HANA", "Lotus Notes", "Systems integration", "Cross-functional collaboration"],
    experience: [
      {
        role: "Solution Architect",
        company: "Real Corp",
        dates: "2022–2024",
        bullets: [
          "Managed an unrelated software inventory.",
          "Led systems integration programs.",
          "Coordinated cross-functional teams.",
          "Prepared technical documentation.",
        ],
      },
      {
        role: "Senior Consultant",
        company: "Earlier Corp",
        dates: "2019–2021",
        bullets: ["Designed interfaces.", "Led delivery.", "Reviewed requirements.", "Supported releases."],
      },
      {
        role: "Consultant",
        company: "Old Corp",
        dates: "2010–2018",
        bullets: ["Implemented systems.", "Documented workflows.", "Supported operations."],
      },
    ],
  }, analysis, "Solution Architect resume");

  assert.equal(resume.name, "");
  assert.doesNotMatch(resume.profile, /actively building/i);
  assert.deepEqual(resume.skills, ["Systems integration", "Cross-functional collaboration"]);
  assert.deepEqual(resume.experience.map((entry) => entry.bullets.length), [3, 3, 2]);
  assert.equal(resume.experience[0].bullets[0], "Led systems integration programs.");
});

test("non-career-change shaping preserves content while still removing identity placeholders", () => {
  const resume = shapeTailoredResume({ name: "UNKNOWN", profile: "Direct fit.", skills: ["React"] }, {
    fit_assessment: { path: "direct" },
  });

  assert.equal(resume.name, "");
  assert.deepEqual(resume.skills, ["React"]);
});

test("export readiness blocks placeholder identity and labels large-gap drafts as preliminary", () => {
  assert.equal(hasUsableResumeIdentity("<UNKNOWN>"), false);
  assert.equal(hasUsableResumeIdentity("Luis Example"), true);

  const blocked = getResumeExportReadiness({ name: "<UNKNOWN>" }, {
    posting: { status: "partial" },
    readiness: { status: "significant_gap" },
  });
  assert.equal(blocked.canExport, false);
  assert.equal(blocked.preliminary, true);
  assert.equal(blocked.buttonLabel, "Download preliminary DOCX");

  const ready = getResumeExportReadiness({ name: "Luis Example" }, {
    posting: { status: "complete" },
    readiness: { status: "strong_fit" },
  });
  assert.equal(ready.canExport, true);
  assert.equal(ready.preliminary, false);
  assert.equal(ready.buttonLabel, "Download DOCX");
});
