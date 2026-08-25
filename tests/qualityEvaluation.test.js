import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateQualityCorpus,
  findEvaluationPrivacyViolations,
} from "../src/qualityEvaluation.js";
import {
  qualityEvaluationCorpus,
  qualityEvaluationForbiddenTerms,
} from "./fixtures/qualityEvaluationCorpus.js";

test("redacted P3.2 corpus passes the deterministic release contract", () => {
  const report = evaluateQualityCorpus(qualityEvaluationCorpus, {
    forbiddenTerms: qualityEvaluationForbiddenTerms,
  });

  assert.equal(report.schemaVersion, 1);
  assert.equal(report.redacted, true);
  assert.equal(report.releaseGate.passed, true);
  assert.equal(report.aggregate.cases, 11);
  assert.equal(report.aggregate.passedCases, 11);
  assert.equal(report.aggregate.contractAccuracyPct, 100);
  assert.equal(report.aggregate.postingReadinessAccuracyPct, 100);
  assert.equal(report.aggregate.exportAuthorizationAccuracyPct, 100);
  assert.equal(report.aggregate.integrityAccuracyPct, 100);
  assert.equal(report.aggregate.templateAccuracyPct, 100);
  assert.equal(report.aggregate.unexpectedSafeIntegrityIssues, 0);
  assert.deepEqual(report.privacy, { status: "pass", violationCount: 0, violations: [] });

  for (const family of [
    "technical",
    "admin-customer-operations",
    "skilled-trades-field-services",
    "marketing-communications",
    "creative-design",
  ]) assert.ok(report.aggregate.byJobFamily[family]);

  for (const path of ["direct", "adjacent", "career-transition", "credential-gap", "incomplete-posting", "integrity-blocked"]) {
    assert.ok(report.aggregate.byCandidatePath[path]);
  }
});

test("quality report exposes only redacted dimensions and numeric operations", () => {
  const report = evaluateQualityCorpus(qualityEvaluationCorpus, {
    forbiddenTerms: qualityEvaluationForbiddenTerms,
  });
  const serialized = JSON.stringify(report);

  for (const forbidden of qualityEvaluationForbiddenTerms) assert.doesNotMatch(serialized, new RegExp(forbidden.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  for (const key of ["resume", "atsReview", "company", "description", "profile", "bullets", "requirements", "evidence"]) {
    assert.equal(Object.hasOwn(report, key), false);
  }
  assert.deepEqual(findEvaluationPrivacyViolations(report, qualityEvaluationForbiddenTerms), []);
  assert.equal(typeof report.aggregate.operations.estimatedCostMicros, "number");
  assert.equal(typeof report.aggregate.operations.retryRatePct, "number");
  assert.equal(typeof report.aggregate.operations.exportCompletionPct, "number");
});

test("a wrong expected decision fails the release gate without leaking fixture content", () => {
  const tampered = qualityEvaluationCorpus.map((entry, index) => index === 0
    ? { ...entry, expected: { ...entry.expected, templateId: "ats-core-v1" } }
    : entry);
  const report = evaluateQualityCorpus(tampered, {
    forbiddenTerms: qualityEvaluationForbiddenTerms,
  });

  assert.equal(report.releaseGate.passed, false);
  assert.equal(report.releaseGate.checks.contractAccuracy, false);
  assert.equal(report.releaseGate.checks.templateAccuracy, false);
  assert.equal(report.cases[0].checks.templateId, false);
  assert.equal(report.privacy.status, "pass");
});

test("privacy gate blocks sensitive keys, contact text, URLs, and explicit fixture terms", () => {
  const unsafe = {
    name: "Private Candidate",
    note: "private@example.com 416-555-0100 https://example.com/profile",
  };
  const violations = findEvaluationPrivacyViolations(unsafe, ["Private Candidate"]);

  assert.ok(violations.some((entry) => entry.endsWith(":sensitive_key")));
  assert.ok(violations.some((entry) => entry.endsWith(":email")));
  assert.ok(violations.some((entry) => entry.endsWith(":url")));
  assert.ok(violations.some((entry) => entry.endsWith(":phone")));
  assert.ok(violations.some((entry) => entry.endsWith(":forbidden_term")));
});

test("quality corpus rejects duplicate case identifiers", () => {
  assert.throws(
    () => evaluateQualityCorpus([qualityEvaluationCorpus[0], qualityEvaluationCorpus[0]]),
    /case IDs must be unique within each variant/,
  );
});

test("the same redacted case ID can compare multiple model variants", () => {
  const baseline = qualityEvaluationCorpus[0];
  const candidate = { ...baseline, variant: "candidate" };
  const report = evaluateQualityCorpus([baseline, candidate], {
    forbiddenTerms: qualityEvaluationForbiddenTerms,
  });

  assert.equal(report.releaseGate.passed, true);
  assert.deepEqual(Object.keys(report.aggregate.variants), ["baseline", "candidate"]);
  assert.equal(report.aggregate.variants.baseline.cases, 1);
  assert.equal(report.aggregate.variants.candidate.cases, 1);
});
