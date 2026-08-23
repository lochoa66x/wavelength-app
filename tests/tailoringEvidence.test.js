import test from "node:test";
import assert from "node:assert/strict";

import {
  assessPostingCompleteness,
  extractPostingKeywords,
  findSemanticIntegrityIssues,
  sanitizeTailoringAnalysis,
} from "../api/_lib/tailoringEvidence.js";

const completeSapPosting = [
  "Responsibilities: Lead SAP S/4HANA functional delivery for finance workstreams and facilitate requirements workshops with business stakeholders.",
  "Translate business requirements into functional specifications, coordinate configuration and integration testing, manage defects, and support release readiness.",
  "Partner with technical developers, solution architects, data teams, and business process owners throughout design, testing, cutover, go-live, and stabilization.",
  "Maintain traceability between business requirements, configuration decisions, test scenarios, defects, and delivered outcomes.",
  "Guide junior consultants, communicate risks to program leadership, and ensure that finance processes align with the approved solution design.",
  "Qualifications: Must have extensive SAP functional consulting experience, including SAP S/4HANA, finance processes, requirements analysis, functional specifications, testing, and stakeholder leadership.",
  "Preferred qualifications include SAP FI-CA, PSCD, MDG, data migration, integration delivery, cutover planning, and experience leading multidisciplinary implementation teams in regulated environments.",
  "Candidates should demonstrate clear written communication, structured problem solving, evidence-based decision making, and the ability to work with both business and technical teams.",
].join(" ");

test("short and abruptly truncated aggregator descriptions are not treated as complete postings", () => {
  const assessment = assessPostingCompleteness("Build a full-stack security dashboard with frontend and backend components aiming to prov…");
  assert.equal(assessment.status, "insufficient");
  assert.equal(assessment.appears_truncated, true);
  assert.equal(assessment.fit_allowed, false);
  assert.equal(assessment.readiness_status, "needs_full_posting");
});

test("a short provider snippet cannot produce a definitive fit or application-ready output", () => {
  const assessment = assessPostingCompleteness(
    "SAP Functional Lead at IFG. Lead finance transformation and support stakeholders…",
    null,
    { source: "jooble", descriptionStatus: "provider_snippet" },
  );
  const analysis = sanitizeTailoringAnalysis({
    fit_assessment: { path: "direct", recommended_level: "Senior", note: "Strong fit." },
    requirements: [{
      id: "R1",
      requirement: "Lead SAP functional delivery",
      priority: "required",
      evidence_match: "direct",
      resume_evidence: "Led SAP functional delivery.",
      safe_language: "SAP functional delivery leadership",
      keywords: ["SAP"],
    }],
  }, "EXPERIENCE\nLed SAP functional delivery.", assessment);

  assert.equal(analysis.posting_readiness.fit_allowed, false);
  assert.equal(analysis.posting_readiness.output_mode, "preliminary");
  assert.equal(analysis.candidate_fit.status, "not_assessed");
  assert.equal(analysis.candidate_fit.confidence, "unavailable");
  assert.equal(analysis.readiness.status, "needs_full_posting");
});

test("a reviewed complete posting permits evidence-backed fit and exact résumé citations", () => {
  const assessment = assessPostingCompleteness(
    completeSapPosting,
    null,
    { source: "employer_page", descriptionStatus: "full_description" },
  );
  const baseResume = [
    "PROFILE",
    "Senior SAP functional consultant.",
    "EXPERIENCE",
    "Led SAP S/4HANA functional delivery and requirements workshops.",
    "Coordinated configuration, integration testing, cutover, and go-live.",
  ].join("\n");
  const analysis = sanitizeTailoringAnalysis({
    fit_assessment: { path: "direct", recommended_level: "Senior", note: "Evidence supports direct functional alignment." },
    requirements: [{
      id: "R1",
      requirement: "Lead SAP S/4HANA functional delivery",
      priority: "required",
      evidence_match: "direct",
      resume_evidence: "Led SAP S/4HANA functional delivery and requirements workshops.",
      safe_language: "Led SAP S/4HANA functional delivery",
      keywords: ["SAP S/4HANA", "functional delivery"],
    }],
    target_keywords: ["SAP S/4HANA"],
  }, baseResume, assessment);

  assert.equal(assessment.status, "complete");
  assert.equal(assessment.fit_allowed, true);
  assert.equal(analysis.posting_readiness.status, "reviewed_complete");
  assert.equal(analysis.candidate_fit.status, "strong");
  assert.deepEqual(analysis.requirements[0].evidence, [{
    source: "base_resume",
    section: "experience",
    line_index: 4,
    excerpt: "Led SAP S/4HANA functional delivery and requirements workshops.",
  }]);
});

test("a complete-looking screenshot posting stays preliminary until the user confirms the final page", () => {
  const structuredBrief = {
    responsibilities: ["Lead SAP S/4HANA functional delivery"],
    required_qualifications: ["Extensive SAP functional consulting experience"],
    source_review: {
      mode: "screenshots",
      page_count: 6,
      appears_complete: true,
      user_confirmed_complete: false,
      conflicts: [],
      conflicts_resolved: true,
    },
  };
  const assessment = assessPostingCompleteness(completeSapPosting, structuredBrief, {
    source: "user_screenshot",
    descriptionStatus: "complete",
  });

  assert.equal(assessment.status, "partial");
  assert.equal(assessment.source_review_complete, false);
  assert.equal(assessment.fit_allowed, false);
  assert.equal(assessment.application_ready_allowed, false);
});

test("a confirmed complete screenshot posting can support fit assessment", () => {
  const assessment = assessPostingCompleteness(completeSapPosting, {
    responsibilities: ["Lead SAP S/4HANA functional delivery"],
    required_qualifications: ["Extensive SAP functional consulting experience"],
    source_review: {
      mode: "screenshots",
      page_count: 6,
      appears_complete: true,
      user_confirmed_complete: true,
      conflicts: [],
      conflicts_resolved: true,
    },
  }, { source: "user_screenshot", descriptionStatus: "complete" });

  assert.equal(assessment.status, "complete");
  assert.equal(assessment.source_review_complete, true);
  assert.equal(assessment.fit_allowed, true);
});

test("unresolved screenshot identity conflicts block application-ready tailoring", () => {
  const assessment = assessPostingCompleteness(completeSapPosting, {
    responsibilities: ["Lead SAP S/4HANA functional delivery"],
    required_qualifications: ["Extensive SAP functional consulting experience"],
    source_review: {
      mode: "screenshots",
      page_count: 6,
      appears_complete: true,
      user_confirmed_complete: true,
      conflicts: [{ field: "company", values: ["FED IT", "Retail Client"] }],
      conflicts_resolved: false,
    },
  });

  assert.equal(assessment.status, "partial");
  assert.equal(assessment.unresolved_source_conflicts, true);
  assert.equal(assessment.fit_allowed, false);
});

test("a complete developer posting preserves a material gap for functional-only evidence", () => {
  const developerPosting = `${completeSapPosting} Responsibilities: Build production web applications in React, TypeScript, Node.js, and PostgreSQL. Qualifications: Must have professional JavaScript development, automated testing, Git, and CI/CD experience.`;
  const assessment = assessPostingCompleteness(developerPosting, null, {
    source: "employer_page",
    descriptionStatus: "full_description",
  });
  const analysis = sanitizeTailoringAnalysis({
    fit_assessment: { path: "career_change", recommended_level: "Transitional", note: "Functional SAP experience does not establish web development experience." },
    requirements: [
      {
        id: "R1",
        requirement: "SAP stakeholder collaboration",
        priority: "responsibility",
        evidence_match: "transferable",
        resume_evidence: "Led SAP stakeholder workshops.",
        safe_language: "SAP stakeholder collaboration",
        keywords: ["SAP"],
      },
      {
        id: "R2",
        requirement: "Professional React and TypeScript development",
        priority: "required",
        evidence_match: "missing",
        resume_evidence: "",
        safe_language: "",
        keywords: ["React", "TypeScript"],
      },
    ],
  }, "EXPERIENCE\nLed SAP stakeholder workshops.", assessment);

  assert.equal(analysis.posting_readiness.fit_allowed, true);
  assert.equal(analysis.candidate_fit.status, "gap");
  assert.equal(analysis.readiness.status, "significant_gap");
  assert.equal(analysis.coverage.transferable, 1);
  assert.equal(analysis.coverage.missing, 1);
});

test("database posting text produces non-empty fallback keywords", () => {
  const keywords = extractPostingKeywords("Build and maintain web applications with cross-functional collaboration.", "Full Stack Web Developer");
  assert.ok(keywords.includes("web applications"));
  assert.ok(keywords.includes("cross-functional collaboration"));
  assert.ok(keywords.includes("full"));
});

test("unsupported evidence excerpts are downgraded to missing", () => {
  const analysis = sanitizeTailoringAnalysis({
    fit_assessment: { path: "direct", recommended_level: "Senior", note: "Direct fit." },
    requirements: [{ id: "R1", requirement: "React", priority: "required", evidence_match: "direct", resume_evidence: "Built React applications", safe_language: "React development", keywords: ["React"] }],
    verified_transferable_skills: [],
    target_keywords: ["React"],
  }, "Led SAP systems integration and user acceptance testing.", { status: "complete", reason: "Complete." });

  assert.equal(analysis.requirements[0].evidence_match, "missing");
  assert.equal(analysis.fit_assessment.path, "career_change");
});

test("career-change target identity, unsupported skills, and equivalence language are blocked", () => {
  const analysis = sanitizeTailoringAnalysis({
    fit_assessment: { path: "career_change", recommended_level: "Entry-level", note: "Career transition." },
    requirements: [{ id: "R1", requirement: "React development", priority: "required", evidence_match: "missing", resume_evidence: "", safe_language: "", keywords: ["React"] }],
    verified_transferable_skills: [{ skill: "Systems integration", resume_evidence: "Led systems integration." }],
    target_keywords: ["React"],
  }, "SAP Manager\nLed systems integration.", { status: "complete", reason: "Complete." });
  const issues = findSemanticIntegrityIssues({
    title: "Full Stack Web Developer",
    profile: "Systems integration translates directly to web development.",
    skills: ["Systems integration", "React"],
    experience: [],
  }, "SAP Manager\nLed systems integration.", analysis, "Full Stack Web Developer");

  assert.deepEqual(issues.unsupported_skills, [{ skill: "React" }]);
  assert.deepEqual(issues.unsupported_projects, []);
  assert.deepEqual(issues.unsupported_training, []);
  assert.equal(issues.unsupported_positioning.length, 1);
  assert.equal(issues.unsupported_target_terms.length, 1);
  assert.deepEqual(issues.risky_claims, [{ claim: "translates directly" }]);
});

test("supported transferable career-change positioning passes semantic checks", () => {
  const analysis = sanitizeTailoringAnalysis({
    fit_assessment: { path: "career_change", recommended_level: "Entry-level", note: "Career transition." },
    requirements: [{ id: "R1", requirement: "Web development", priority: "required", evidence_match: "missing", resume_evidence: "", safe_language: "", keywords: ["web development"] }],
    verified_transferable_skills: [{ skill: "Systems integration", resume_evidence: "Led systems integration." }],
    target_keywords: ["web development"],
  }, "SAP Manager\nLed systems integration.", { status: "complete", reason: "Complete." });
  const issues = findSemanticIntegrityIssues({
    title: "Enterprise Integration Professional | Web Transition",
    profile: "Enterprise systems professional pursuing a transition into application delivery.",
    skills: ["Systems integration"],
    experience: [{ role: "SAP Manager", bullets: ["Led systems integration."] }],
  }, "SAP Manager\nLed systems integration.", analysis, "Full Stack Web Developer");

  assert.deepEqual(issues, {
    unsupported_skills: [],
    unsupported_projects: [],
    unsupported_training: [],
    unsupported_target_terms: [],
    unsupported_positioning: [],
    risky_claims: [],
  });
});

test("candidate-confirmed notes can support a requirement without being relabeled as base résumé evidence", () => {
  const assessment = assessPostingCompleteness(completeSapPosting, null, {
    source: "employer_page",
    descriptionStatus: "full_description",
  });
  const notes = [{
    id: "note-R1",
    requirement_id: "R1",
    source: "candidate_note",
    answer: "Facilitated SAP finance requirements workshops with business stakeholders.",
    contribution_level: "led",
    user_confirmed: true,
  }];
  const analysis = sanitizeTailoringAnalysis({
    fit_assessment: { path: "adjacent", recommended_level: "Senior", note: "Verified note adds relevant evidence." },
    requirements: [{
      id: "R1",
      requirement: "Finance requirements workshops",
      priority: "required",
      evidence_match: "direct",
      resume_evidence: "Facilitated SAP finance requirements workshops with business stakeholders.",
      safe_language: "Facilitated SAP finance requirements workshops",
      keywords: ["requirements workshops"],
    }],
    candidate_questions: ["[R2] Have you led release readiness activities?"],
  }, "SAP functional consultant", assessment, [], notes);

  assert.equal(analysis.requirements[0].evidence_match, "direct");
  assert.equal(analysis.requirements[0].evidence[0].source, "candidate_note");
  assert.equal(analysis.requirements[0].evidence[0].contribution_level, "led");
  assert.equal(analysis.evidence_questions[0].requirement_id, "R2");
  assert.doesNotMatch(analysis.evidence_questions[0].question, /^\[R2\]/);
});

test("invented projects and training are blocked even without unsupported numbers", () => {
  const issues = findSemanticIntegrityIssues({
    title: "Enterprise Integration Professional",
    profile: "Systems integration professional.",
    skills: ["Systems integration"],
    projects: [{ name: "React Portfolio", description: "A personal portfolio." }],
    training: [{ name: "Full Stack Bootcamp", provider: "Online" }],
    experience: [],
  }, "SAP Manager\nLed systems integration.", {
    fit_assessment: { path: "career_change" },
    verified_transferable_skills: [{ skill: "Systems integration" }],
    requirements: [],
    prohibited_claims: [],
  }, "Full Stack Web Developer");

  assert.deepEqual(issues.unsupported_projects, [{ name: "React Portfolio" }]);
  assert.deepEqual(issues.unsupported_training, [{ name: "Full Stack Bootcamp" }]);
});
