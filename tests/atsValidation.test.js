import test from "node:test";
import assert from "node:assert/strict";

import { buildAtsReview, buildTailoringChangeLedger, enforceReverseChronology } from "../api/_lib/atsValidation.js";

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

  assert.equal(review.status, "review");
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

  assert.equal(review.status, "review");
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

test("defined and applied are recognized as valid SAP functional action verbs", () => {
  const baseResume = [
    "SAP Functional Consultant — Real Corp — 2020–2023",
    "Defined GAP analysis and created blueprint documentation.",
    "Applied ASAP methodology to map existing processes.",
  ].join("\n");
  const review = buildAtsReview({
    name: "Luis Example",
    title: "SAP Functional Consultant",
    profile: "SAP functional delivery professional.",
    experience: [{
      role: "SAP Functional Consultant",
      company: "Real Corp",
      dates: "2020–2023",
      bullets: [
        "Defined GAP analysis and created blueprint documentation.",
        "Applied ASAP methodology to map existing processes.",
      ],
    }],
  }, baseResume, { keywords: [] }, { targetTitle: "SAP Functional Consultant" });

  assert.deepEqual(review.writing_review.issues.filter((issue) => issue.issue_type === "unrecognized_opener"), []);
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

test("application-ready export requires independently verified posting readiness", () => {
  const resume = {
    name: "Luis Example",
    profile: "Operations leader.",
    experience: [{ role: "Operations Manager", company: "Real Corp", dates: "2020–2023", bullets: ["Led operations."] }],
  };
  const baseResume = "Operations Manager — Real Corp — 2020–2023\nLed operations.";

  const unverified = buildAtsReview(resume, baseResume, { keywords: [] });
  assert.equal(unverified.application_ready, false);
  assert.deepEqual(unverified.export_readiness.blockers, ["posting_readiness", "requirement_analysis"]);

  const verified = buildAtsReview(resume, baseResume, { keywords: [] }, {
    analysis: {
      posting_assessment: {
        status: "complete",
        reason: "Reviewed full posting.",
        fit_allowed: true,
        application_ready_allowed: true,
      },
      posting_readiness: {
        status: "reviewed_complete",
        reason: "Responsibilities and qualifications reviewed.",
        fit_allowed: true,
        application_ready_allowed: true,
      },
      requirements: [{
        id: "R1",
        requirement: "Lead operations",
        priority: "required",
        evidence_match: "direct",
        resume_evidence: "Led operations.",
      }],
      coverage: { direct: 1, adjacent: 0, transferable: 0, missing: 0 },
    },
  });
  assert.equal(verified.application_ready, true);
  assert.deepEqual(verified.export_readiness.blockers, []);

  const significantGap = buildAtsReview(resume, baseResume, { keywords: [] }, {
    analysis: {
      posting_assessment: {
        status: "complete",
        reason: "Reviewed full posting.",
        fit_allowed: true,
        application_ready_allowed: true,
      },
      posting_readiness: {
        status: "reviewed_complete",
        reason: "Responsibilities and qualifications reviewed.",
        fit_allowed: true,
        application_ready_allowed: true,
      },
      requirements: [{
        id: "R1",
        requirement: "Mandatory target-domain certification",
        priority: "required",
        evidence_match: "missing",
      }],
      coverage: { direct: 0, adjacent: 0, transferable: 0, missing: 1 },
      readiness: { status: "significant_gap", reason: "Mandatory target-domain evidence is missing." },
    },
  });
  assert.equal(significantGap.application_ready, false);
  assert.equal(significantGap.export_readiness.status, "preliminary");
  assert.deepEqual(significantGap.export_readiness.blockers, ["candidate_fit"]);
});

test("a verified posting with zero analyzed requirements remains preliminary", () => {
  const resume = {
    name: "Avery Chen",
    profile: "Licensed electrician.",
    experience: [{ role: "Electrician", company: "Acme", dates: "2020–2024", bullets: ["Installed branch circuits."] }],
  };
  const review = buildAtsReview(
    resume,
    "Electrician — Acme — 2020–2024\nInstalled branch circuits.",
    { keywords: [] },
    {
      analysis: {
        posting_readiness: {
          status: "reviewed_complete",
          reason: "Posting reviewed.",
          fit_allowed: true,
          application_ready_allowed: true,
        },
        requirements: [],
        coverage: { direct: 0, adjacent: 0, transferable: 0, missing: 0 },
      },
    },
  );

  assert.equal(review.application_ready, false);
  assert.equal(review.export_readiness.status, "preliminary");
  assert.deepEqual(review.export_readiness.blockers, ["requirement_analysis"]);
});

test("tailoring changes map rewritten bullets to exact candidate evidence", () => {
  const source = "Configured SAP S/4HANA finance workflows and coordinated integration testing with business teams.";
  const proposed = "Configured SAP S/4HANA finance workflows and coordinated end-to-end integration testing.";
  const changes = buildTailoringChangeLedger({
    experience: [{ role: "SAP Functional Consultant", bullets: [proposed] }],
  }, `SAP Functional Consultant — Acme — 2020–2024\n${source}`, {
    requirements: [{
      id: "R1",
      requirement: "Configure SAP S/4HANA finance and support integration testing",
      evidence_match: "direct",
      evidence: [{ source: "base_resume", line_index: 2, excerpt: source }],
    }],
  });

  assert.equal(changes.length, 1);
  assert.equal(changes[0].original, source);
  assert.equal(changes[0].proposed, proposed);
  assert.equal(changes[0].requirement_id, "R1");
  assert.equal(changes[0].evidence_citations[0].line_index, 2);
  assert.match(changes[0].reason, /without adding a new fact/i);
});

test("tailoring provenance can cite multiple source lines for one composite bullet", () => {
  const firstSource = "Led user acceptance testing and mock cutover cycles.";
  const secondSource = "Coordinated interface delivery through SAP PI/PO and production support.";
  const proposed = `${firstSource.replace(/\.$/, "")}; ${secondSource.charAt(0).toLowerCase()}${secondSource.slice(1)}`;
  const changes = buildTailoringChangeLedger({
    experience: [{ role: "SAP Solution Architect", bullets: [proposed] }],
  }, `SAP Solution Architect — Acme — 2020–2024\n${firstSource}\n${secondSource}`, { requirements: [] });

  assert.equal(changes.length, 1);
  assert.equal(changes[0].citation_complete, true);
  assert.equal(changes[0].evidence_citations.length, 2);
  assert.deepEqual(changes[0].evidence_citations.map((citation) => citation.line_index), [2, 3]);
  assert.equal(changes[0].unsupported_strengthening, null);
});

test("tailoring provenance blocks contributed-to-authored ownership escalation", () => {
  const source = "Contributed to creation of functional specifications for Contract Accounts.";
  const proposed = "Authored functional specifications for Contract Accounts.";
  const review = buildAtsReview({
    name: "Luis Example",
    profile: "SAP functional consultant.",
    experience: [{ role: "SAP Consultant", company: "Real Corp", dates: "2020–2024", bullets: [proposed] }],
  }, `SAP Consultant — Real Corp — 2020–2024\n${source}`, { keywords: [] }, {
    analysis: {
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
    },
  });

  assert.equal(review.integrity.status, "blocked");
  assert.equal(review.provenance_issues.length, 1);
  assert.equal(review.provenance_issues[0].issue_type, "unsupported_strengthening");
  assert.equal(review.provenance_issues[0].unsupported_strengthening.proposed_verb, "authored");
  assert.equal(review.provenance_issues[0].unsupported_strengthening.strongest_source_verb, "contributed");
});

test("requirement count mismatches block application-ready export", () => {
  const source = "Led operations.";
  const review = buildAtsReview({
    name: "Luis Example",
    profile: "Operations leader.",
    experience: [{ role: "Operations Manager", company: "Real Corp", dates: "2020–2023", bullets: [source] }],
  }, `Operations Manager — Real Corp — 2020–2023\n${source}`, { keywords: [] }, {
    analysis: {
      posting_assessment: { status: "complete", fit_allowed: true, application_ready_allowed: true },
      posting_readiness: { status: "reviewed_complete", fit_allowed: true, application_ready_allowed: true },
      requirements: [{ id: "R1", requirement: "Lead operations", priority: "required", evidence_match: "direct" }],
      coverage: { direct: 0, adjacent: 0, transferable: 0, missing: 1 },
      core_coverage: { direct: 0, adjacent: 0, transferable: 0, missing: 1, total: 1 },
    },
  });

  assert.equal(review.requirement_consistency.status, "blocked");
  assert.ok(review.requirement_consistency.issues.includes("coverage_direct_mismatch"));
  assert.ok(review.export_readiness.blockers.includes("requirement_analysis"));
  assert.equal(review.application_ready, false);
});
