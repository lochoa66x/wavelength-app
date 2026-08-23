import test from "node:test";
import assert from "node:assert/strict";

import { buildAtsReview, enforceReverseChronology } from "../api/_lib/atsValidation.js";

test("experience is deterministically restored to reverse chronological order", () => {
  const result = enforceReverseChronology({
    experience: [
      { role: "Older", dates: "2018–2020", bullets: [] },
      { role: "Current", dates: "2023–Present", bullets: [] },
      { role: "Middle", dates: "2020–2023", bullets: [] },
    ],
  });

  assert.deepEqual(result.experience.map((entry) => entry.role), ["Current", "Middle", "Older"]);
});

test("ATS truth check blocks numbers and employment history absent from the base resume", () => {
  const review = buildAtsReview({
    profile: "Operations leader",
    skills: ["Stakeholder management"],
    experience: [{
      role: "Invented Director",
      company: "Imaginary Corp",
      dates: "2024–Present",
      bullets: ["Increased revenue by 45% across 12 countries."],
    }],
  }, "Real Manager — Real Corp — 2020–2023\nLed stakeholder programs.", { keywords: ["stakeholder management"] });

  assert.equal(review.status, "blocked");
  assert.deepEqual(review.unsupported_metrics.map((issue) => issue.claim), ["2024", "45%", "12"]);
  assert.deepEqual(review.unsupported_history.map((issue) => issue.field), ["role", "company", "dates"]);
});

test("ATS review recognizes supported history, metrics, verbs, and keywords", () => {
  const review = buildAtsReview({
    profile: "Operations leader with cross-functional collaboration experience.",
    skills: ["Stakeholder management"],
    experience: [{
      role: "Operations Manager",
      company: "Real Corp",
      dates: "2020–2023",
      bullets: ["Led an 8-person team and reduced cycle time by 20%."],
    }],
  }, "Operations Manager — Real Corp — 2020–2023\nLed an 8-person team and reduced cycle time by 20%.", {
    keywords: ["stakeholder management", "cross-functional collaboration"],
  });

  assert.equal(review.status, "ready");
  assert.equal(review.reverse_chronological, true);
  assert.equal(review.unsupported_metrics.length, 0);
  assert.equal(review.unsupported_history.length, 0);
  assert.deepEqual(review.missing_keywords, []);
});

test("ATS truth check accepts cosmetic history formatting changes", () => {
  const review = buildAtsReview({
    profile: "Technology leader translating enterprise delivery experience into web development.",
    skills: ["Systems integration"],
    experience: [{
      role: "Sr. Manager",
      company: "IBM Canada",
      dates: "Jan 2020 – Present",
      bullets: ["Lead cross-functional systems integration and delivery."],
    }],
  }, "Senior Manager — IBM Canada Ltd. — January 2020 to Present\nLed cross-functional systems integration and delivery.", {
    keywords: ["systems integration"],
  });

  assert.equal(review.status, "ready");
  assert.equal(review.unsupported_history.length, 0);
});

test("ATS truth check still blocks target-role history invented for a career change", () => {
  const review = buildAtsReview({
    profile: "Technology leader pursuing web development.",
    skills: ["Systems integration"],
    experience: [{
      role: "Full Stack Engineering Manager",
      company: "IBM Canada",
      dates: "2020–Present",
      bullets: ["Lead cross-functional systems integration and delivery."],
    }],
  }, "SAP Manager — IBM Canada — 2020–Present\nLed cross-functional systems integration and delivery.", {
    keywords: ["systems integration"],
  });

  assert.equal(review.status, "blocked");
  assert.deepEqual(review.unsupported_history.map((issue) => issue.field), ["role"]);
});

test("ATS truth check allows transferable-skills rewriting inside supported history", () => {
  const review = buildAtsReview({
    profile: "Entry-level construction candidate bringing planning, client communication, and dependable delivery.",
    skills: ["Project planning", "Client communication"],
    experience: [{
      role: "Project Manager",
      company: "Real Corp",
      dates: "2018–2023",
      bullets: [
        "Coordinated schedules, stakeholders, and dependable project delivery.",
        "Resolved practical delivery problems through clear client communication.",
      ],
    }],
  }, "Project Manager — Real Corp — 2018–2023\nPlanned project schedules, communicated with clients, coordinated stakeholders, and resolved delivery problems.", {
    keywords: ["planning", "client communication"],
  });

  assert.notEqual(review.status, "blocked");
  assert.equal(review.unsupported_history.length, 0);
  assert.equal(review.unsupported_metrics.length, 0);
});

test("ATS truth check ignores numbers in the non-exported fit assessment", () => {
  const review = buildAtsReview({
    profile: "Operations leader moving into web development.",
    skills: ["Systems integration"],
    experience: [{
      role: "Operations Manager",
      company: "Real Corp",
      dates: "2020–2023",
      bullets: ["Led systems integration programs."],
    }],
    fit_assessment: {
      path: "career_change",
      recommended_level: "Entry-level",
      note: "The posting asks for 5 years of direct web development experience.",
    },
  }, "Operations Manager — Real Corp — 2020–2023\nLed systems integration programs.", {
    keywords: ["systems integration"],
  });

  assert.notEqual(review.status, "blocked");
  assert.equal(review.unsupported_metrics.length, 0);
});

test("ATS writing review recognizes common truthful action verbs", () => {
  const bullets = [
    "Integrated enterprise platforms.",
    "Prepared functional specifications.",
    "Authored technical documentation.",
    "Collaborated with business stakeholders.",
    "Contributed to architecture decisions.",
    "Oversaw release testing.",
    "Validated end-to-end data flows.",
  ];
  const review = buildAtsReview({
    name: "Luis Example",
    profile: "Enterprise delivery professional.",
    experience: [{ role: "Solution Architect", company: "Real Corp", dates: "2020–2024", bullets }],
  }, `Solution Architect — Real Corp — 2020–2024\n${bullets.join("\n")}`, { keywords: [] });

  assert.equal(review.verb_issues.length, 0);
  assert.equal(review.writing.status, "pass");
});

test("occupation-aware writing review gives exact SAP functional tense and wording suggestions", () => {
  const review = buildAtsReview({
    name: "Luis Example",
    title: "SAP Functional Consultant",
    profile: "SAP functional delivery professional.",
    experience: [{
      role: "SAP Functional Consultant",
      company: "Real Corp",
      dates: "2020–2024",
      bullets: [
        "Build SAP interfaces for finance workflows.",
        "Participated in S/4HANA integration testing.",
      ],
    }],
  }, [
    "SAP Functional Consultant — Real Corp — 2020–2024",
    "Build SAP interfaces for finance workflows.",
    "Participated in S/4HANA integration testing.",
  ].join("\n"), { keywords: ["SAP", "S/4HANA"] }, {
    targetTitle: "SAP Functional Lead",
    category: "Technology & IT",
  });

  assert.equal(review.status, "review");
  assert.equal(review.writing_review.occupation_profile, "sap_functional");
  assert.ok(review.writing_review.preferred_verbs.includes("configured"));
  assert.deepEqual(
    review.writing_review.issues.map((issue) => issue.issue_type),
    ["tense", "imprecise_verb"],
  );
  assert.equal(review.writing_review.issues[0].suggested_revision, "Built SAP interfaces for finance workflows.");
  assert.equal(review.writing_review.issues[1].suggested_revision, "Contributed to S/4HANA integration testing.");
  assert.equal(review.writing_review.blocking_issue_count, 0);
});

test("candidate-confirmed contribution level blocks an ownership escalation", () => {
  const review = buildAtsReview({
    name: "Luis Example",
    title: "SAP Functional Consultant",
    profile: "SAP functional delivery professional.",
    experience: [{
      role: "SAP Functional Consultant",
      company: "Real Corp",
      dates: "2020–2024",
      bullets: ["Led SAP migration testing."],
    }],
  }, "SAP Functional Consultant — Real Corp — 2020–2024\nSupported SAP migration testing.", {
    keywords: ["SAP migration"],
  }, {
    targetTitle: "SAP Functional Lead",
    analysis: {
      requirements: [{
        requirement: "SAP migration testing",
        evidence_match: "transferable",
        evidence: [{
          source: "candidate_note",
          excerpt: "Supported SAP migration testing.",
          contribution_level: "supported",
        }],
      }],
    },
  });

  const escalation = review.writing_review.issues.find((issue) => issue.issue_type === "contribution_level");
  assert.equal(review.status, "blocked");
  assert.equal(review.export_readiness.blockers.includes("contribution_language"), true);
  assert.equal(escalation?.severity, "blocked");
  assert.equal(escalation?.suggested_revision, "Supported SAP migration testing.");
  assert.equal(escalation?.evidence_citations[0]?.source, "candidate_note");
});

test("ATS review reports a missing placeholder identity separately from evidence integrity", () => {
  const review = buildAtsReview({
    name: "<UNKNOWN>",
    profile: "Operations leader.",
    experience: [{ role: "Operations Manager", company: "Real Corp", dates: "2020–2023", bullets: ["Led operations."] }],
  }, "Operations Manager — Real Corp — 2020–2023\nLed operations.", { keywords: [] });

  assert.equal(review.identity.status, "missing");
  assert.equal(review.integrity.status, "pass");
});
