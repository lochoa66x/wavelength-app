import test from "node:test";
import assert from "node:assert/strict";

import { shapeTailoredResume, shapeTailoredResumeWithReview } from "../api/_lib/resumeQuality.js";
import { getResumeExportReadiness, hasUsableResumeIdentity, hasVerifiedPosting } from "../src/resumeReadiness.js";

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

test("SAP tailoring keeps relevant SAP training and omits unrelated training filler", () => {
  const result = shapeTailoredResumeWithReview({
    name: "Luis Example",
    training: [
      { name: "SAP Accounts Management", provider: "SAP" },
      { name: "SAP Loans Management", provider: "SAP" },
      { name: "Big Data Analytics", provider: "Example University" },
    ],
  }, {
    fit_assessment: { path: "adjacent" },
    requirements: [
      { requirement: "In-depth knowledge of SAP ISU FICA", evidence_match: "adjacent", keywords: ["SAP ISU FICA"] },
      { requirement: "Experience supporting SAP ISU data migration", evidence_match: "direct", keywords: ["Data migration"] },
    ],
  });

  assert.deepEqual(result.resume.training.map((entry) => entry.name), ["SAP Accounts Management", "SAP Loans Management"]);
  assert.deepEqual(result.focusReview.omitted_training, [{ name: "Big Data Analytics", reason: "lower_target_relevance" }]);
});

test("focus review prioritizes relevant evidence, removes repetition, and leaves canonical input unchanged", () => {
  const canonical = {
    name: "Luis Example",
    title: "SAP Functional Consultant",
    profile: "SAP functional consultant with enterprise delivery experience.",
    skills: ["SAP S/4HANA", "SAP Finance", "Testing"],
    experience: [
      {
        role: "Solution Architect",
        company: "Current Corp",
        dates: "2022–2024",
        bullets: [
          "Prepared weekly status reports.",
          "Configured SAP S/4HANA Finance workflows.",
          "Coordinated SAP Finance integration testing.",
          "Documented stakeholder meeting notes.",
          "Maintained an unrelated software inventory.",
        ],
      },
      {
        role: "Senior Consultant",
        company: "Earlier Corp",
        dates: "2018–2021",
        bullets: [
          "Configured SAP S/4HANA Finance workflows.",
          "Validated SAP Finance requirements.",
          "Prepared weekly status reports.",
        ],
      },
    ],
  };
  const snapshot = structuredClone(canonical);
  const result = shapeTailoredResumeWithReview(canonical, {
    fit_assessment: { path: "direct" },
    requirements: [{
      requirement: "Configure SAP S/4HANA Finance workflows",
      evidence_match: "direct",
      keywords: ["SAP S/4HANA", "Finance", "configured"],
    }],
  });

  assert.deepEqual(canonical, snapshot);
  assert.equal(result.resume.experience[0].bullets[0], "Configured SAP S/4HANA Finance workflows.");
  assert.equal(
    result.resume.experience.flatMap((entry) => entry.bullets).filter((bullet) => bullet === "Configured SAP S/4HANA Finance workflows.").length,
    1,
  );
  assert.equal(result.focusReview.target_length, "one_to_two_pages");
  assert.equal(result.focusReview.estimated_pages <= 2, true);
  assert.equal(result.focusReview.condensed_experience.length > 0, true);
  assert.equal(result.focusReview.duplicate_groups.length > 0, true);
});

test("export readiness blocks placeholder identity and labels large-gap drafts as preliminary", () => {
  assert.equal(hasUsableResumeIdentity("<UNKNOWN>"), false);
  assert.equal(hasUsableResumeIdentity("Luis Example"), true);
  assert.equal(hasUsableResumeIdentity({ text: "<UNKNOWN>" }), false);
  assert.equal(hasUsableResumeIdentity({ firstName: "Luis", lastName: "Example" }), true);
  assert.equal(hasUsableResumeIdentity({ metadata: "not an identity" }), false);

  const blocked = getResumeExportReadiness({ name: "<UNKNOWN>" }, {
    posting: { status: "partial" },
    readiness: { status: "significant_gap" },
  });
  assert.equal(blocked.canExport, false);
  assert.equal(blocked.preliminary, true);
  assert.equal(blocked.buttonLabel, "Download preliminary DOCX");

  const ready = getResumeExportReadiness({ name: "Luis Example" }, {
    application_ready: true,
    posting_readiness: {
      status: "reviewed_complete",
      fit_allowed: true,
      application_ready_allowed: true,
    },
    readiness: { status: "strong_fit" },
  });
  assert.equal(ready.canExport, true);
  assert.equal(ready.verifiedPosting, true);
  assert.equal(ready.preliminary, false);
  assert.equal(ready.buttonLabel, "Download tailored résumé");
  assert.equal(ready.pdfButtonLabel, "Download tailored PDF");
});

test("canonical application readiness controls preliminary and final export labels", () => {
  const preliminary = getResumeExportReadiness({ name: "Luis Example" }, {
    application_ready: false,
    posting_readiness: {
      status: "needs_full_posting",
      fit_allowed: false,
      application_ready_allowed: false,
    },
    readiness: { status: "needs_full_posting" },
  });

  assert.equal(preliminary.canExport, true);
  assert.equal(preliminary.applicationReady, false);
  assert.equal(preliminary.preliminary, true);
  assert.equal(preliminary.buttonLabel, "Download preliminary DOCX");
  assert.equal(preliminary.pdfButtonLabel, "Download preliminary PDF");

  const final = getResumeExportReadiness({ name: "Luis Example" }, {
    application_ready: true,
    posting_readiness: {
      status: "reviewed_complete",
      fit_allowed: true,
      application_ready_allowed: true,
    },
    readiness: { status: "credible_stretch" },
  });

  assert.equal(final.applicationReady, true);
  assert.equal(final.preliminary, false);
  assert.equal(final.buttonLabel, "Download tailored résumé");
});

test("a stale ready flag cannot bypass verified-posting export gating", () => {
  const stale = getResumeExportReadiness({ name: "Luis Example" }, {
    application_ready: true,
    export_readiness: { application_ready: true },
    posting_readiness: {
      status: "needs_full_posting",
      fit_allowed: false,
      application_ready_allowed: false,
    },
    readiness: { status: "strong_fit" },
  });

  assert.equal(hasVerifiedPosting({ posting_readiness: { status: "reviewed_complete", fit_allowed: true } }), false);
  assert.equal(stale.verifiedPosting, false);
  assert.equal(stale.applicationReady, false);
  assert.equal(stale.preliminary, true);
});

test("a verified required degree is restored when the draft model omits education", () => {
  const result = shapeTailoredResumeWithReview({
    name: "Luis Example",
    title: "SAP Integration Professional | SD Transition",
    profile: "SAP integration professional with verified functional delivery experience.",
    skills: ["SAP S/4HANA integration"],
    experience: [{ role: "Solution Architect", company: "Example", dates: "2022 - 2024", bullets: ["Integrated SAP S/4HANA with master data systems."] }],
    education: [],
  }, {
    fit_assessment: { path: "career_change" },
    coverage: { direct: 1, adjacent: 1, transferable: 0, missing: 2 },
    verified_transferable_skills: [{ skill: "SAP S/4HANA integration", resume_evidence: "Integrated SAP S/4HANA with master data systems." }],
    requirements: [{
      requirement: "Bachelor's degree in Business Administration or a related field",
      priority: "required",
      evidence_match: "direct",
      safe_language: "Bachelor's degree",
      resume_evidence: "Bachelor of Business Finance Administration & Management, Monterrey Institute of Technology",
      keywords: ["Bachelor's degree"],
    }],
  }, [
    "EDUCATION",
    "Bachelor of Business Finance Administration & Management, Monterrey Institute of Technology",
  ].join("\n"));

  assert.equal(result.resume.education.length, 1);
  assert.match(result.resume.education[0].degree, /Bachelor of Business Finance Administration/);
  assert.equal(result.resume.education[0].restored_from_verified_evidence, true);
});
