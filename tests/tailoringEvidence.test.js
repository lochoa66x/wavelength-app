import test from "node:test";
import assert from "node:assert/strict";

import {
  assessPostingCompleteness,
  extractPostingKeywords,
  findSemanticIntegrityIssues,
  sanitizeTailoringAnalysis,
} from "../api/_lib/tailoringEvidence.js";

test("short and abruptly truncated aggregator descriptions are not treated as complete postings", () => {
  const assessment = assessPostingCompleteness("Build a full-stack security dashboard with frontend and backend components aiming to prov…");
  assert.equal(assessment.status, "insufficient");
  assert.equal(assessment.appears_truncated, true);
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
