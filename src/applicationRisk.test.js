import assert from "node:assert/strict";
import test from "node:test";
import {
  applicationRequirementMatchesFilter,
  buildApplicationRiskView,
  normalizeApplicationRequirement,
} from "./applicationRisk.js";
import { qualityEvaluationCorpus } from "../tests/fixtures/qualityEvaluationCorpus.js";

function reviewWith(requirements, overrides = {}) {
  return {
    application_ready: false,
    integrity: { status: "pass" },
    identity: { status: "complete" },
    posting_readiness: { status: "reviewed_complete", fit_allowed: true, application_ready_allowed: true },
    candidate_fit: { status: "adjacent", confidence: "high", reason: "Evidence comparison completed." },
    parseability: { status: "pass" },
    writing: { status: "pass" },
    export_readiness: { application_ready: false, blockers: ["candidate_fit"] },
    requirements,
    ...overrides,
  };
}

const direct = {
  id: "R1",
  requirement: "Configure SAP FI-CA contract accounts",
  priority: "required",
  evidence_match: "direct",
  gap_severity: "supported",
  requirement_origin: "mandatory_qualification",
  importance: "mandatory",
  confidence: "high",
  reason_code: "verified_direct_evidence",
  assessment_explanation: "Exact evidence supports the requirement.",
  next_action: "Review the wording.",
  safe_language: "Configured SAP FI-CA contract accounts.",
  evidence: [{ source: "base_resume", section: "experience", line_index: 12, excerpt: "Configured SAP FI-CA contract accounts." }],
};

const adjacent = {
  id: "R2",
  requirement: "Configure SAP IS-U FICA",
  priority: "required",
  evidence_match: "adjacent",
  gap_severity: "supported",
  evidence: [{ source: "base_resume", section: "experience", line_index: 12, excerpt: "Configured SAP FI-CA contract accounts." }],
};

const blocker = {
  id: "R3",
  requirement: "Valid Red Seal electrician certification",
  priority: "required",
  evidence_match: "missing",
  gap_severity: "verified_blocker",
  requirement_origin: "credential",
  importance: "mandatory",
  confidence: "medium",
  reason_code: "missing_mandatory_credential_or_eligibility",
  assessment_explanation: "The mandatory credential is not verified.",
  next_action: "Confirm candidate-held evidence or keep it visible.",
  evidence: [],
};

test("application risk view separates document truth checks from candidate fit risk", () => {
  const view = buildApplicationRiskView(reviewWith([direct, adjacent, blocker], {
    gap_summary: {
      outlook: {
        status: "likely_screening_blocker",
        label: "Likely screening blocker",
        confidence: "high",
        reason: "A mandatory credential is not verified.",
        what_would_change: "Candidate-confirmed credential evidence.",
      },
    },
  }));

  assert.equal(view.outlook.status, "likely_screening_blocker");
  assert.equal(view.counts.verifiedStrengths, 1);
  assert.equal(view.counts.relatedEvidence, 1);
  assert.equal(view.counts.blockers, 1);
  assert.equal(view.document.truthChecksPass, true);
  assert.equal(view.document.exportReady, false);
  assert.match(view.document.detail, /evidence-safe/i);
  assert.deepEqual(view.requirements.map((requirement) => requirement.id), ["R3", "R1", "R2"]);
});

test("incomplete posting remains unknown rather than becoming candidate missing evidence", () => {
  const view = buildApplicationRiskView(reviewWith([], {
    posting_readiness: {
      status: "needs_full_posting",
      fit_allowed: false,
      application_ready_allowed: false,
      reason: "The screenshot set has not been confirmed complete.",
    },
    candidate_fit: { status: "not_assessed", confidence: "unavailable" },
    export_readiness: { application_ready: false, blockers: ["posting_readiness", "requirement_analysis"] },
  }));

  assert.equal(view.outlook.status, "assessment_incomplete");
  assert.equal(view.outlook.confidence, "unavailable");
  assert.equal(view.counts.missing, 0);
  assert.equal(view.requirements.length, 0);
  assert.match(view.outlook.reason, /screenshot set/i);
});

test("legacy requirements receive safe presentation metadata without changing evidence class", () => {
  const normalized = normalizeApplicationRequirement({
    id: "legacy",
    requirement: "Customer service",
    priority: "responsibility",
    evidence_match: "transferable",
    evidence: [{ excerpt: "Resolved client issues.", source: "base_resume", section: "experience" }],
  });

  assert.equal(normalized.evidenceMatch, "transferable");
  assert.equal(normalized.gapSeverity, "supported");
  assert.equal(normalized.originLabel, "Responsibility");
  assert.match(normalized.explanation, /relevant capability/i);
  assert.equal(normalized.citation.excerpt, "Resolved client issues.");
});

test("Evidence Map filters are deterministic and colour-independent", () => {
  const requirements = [direct, adjacent, blocker].map(normalizeApplicationRequirement);

  assert.equal(requirements.filter((item) => applicationRequirementMatchesFilter(item, "verified")).length, 1);
  assert.equal(requirements.filter((item) => applicationRequirementMatchesFilter(item, "related")).length, 1);
  assert.equal(requirements.filter((item) => applicationRequirementMatchesFilter(item, "blockers")).length, 1);
  assert.equal(requirements.filter((item) => applicationRequirementMatchesFilter(item, "material")).length, 0);
});

test("truthful weak-fit resumes can remain downloadable as preliminary exports", () => {
  const material = {
    id: "R4",
    requirement: "Five years of target-domain configuration",
    priority: "required",
    evidence_match: "missing",
    gap_severity: "material_gap",
  };
  const view = buildApplicationRiskView(reviewWith([direct, material]));

  assert.equal(view.outlook.status, "viable_transition_material_gaps");
  assert.equal(view.document.truthChecksPass, true);
  assert.equal(view.document.exportReady, false);
  assert.equal(view.document.exportLabel, "Preliminary export");
});

test("the existing cross-career quality corpus produces safe deterministic application-risk views", () => {
  for (const fixture of qualityEvaluationCorpus) {
    const view = buildApplicationRiskView(fixture.atsReview);
    assert.equal(view.requirements.length, fixture.atsReview.requirements.length, fixture.id);
    assert.doesNotMatch(JSON.stringify(view), /\[object Object\]/, fixture.id);
    for (const requirement of view.requirements) {
      assert.ok(requirement.requirement, fixture.id);
      assert.ok(requirement.explanation, fixture.id);
      assert.ok(requirement.nextAction, fixture.id);
    }
    assert.ok(view.outlook.label, fixture.id);
    assert.ok(view.document.exportLabel, fixture.id);
  }

  const incomplete = buildApplicationRiskView(qualityEvaluationCorpus.find((fixture) => fixture.id === "admin-incomplete-posting-01").atsReview);
  assert.equal(incomplete.outlook.status, "assessment_incomplete");

  const credentialGap = buildApplicationRiskView(qualityEvaluationCorpus.find((fixture) => fixture.id === "trades-credential-gap-01").atsReview);
  assert.equal(credentialGap.outlook.status, "likely_screening_blocker");
  assert.equal(credentialGap.document.exportReady, false);
});
