import { createResumePackage } from "./resumeModel.js";
import { getResumeExportReadiness, hasVerifiedPosting } from "./resumeReadiness.js";

export const QUALITY_EVALUATION_SCHEMA_VERSION = 1;

export const QUALITY_EVALUATION_THRESHOLDS = Object.freeze({
  contractAccuracyPct: 100,
  postingReadinessAccuracyPct: 100,
  exportAuthorizationAccuracyPct: 100,
  integrityAccuracyPct: 100,
  templateAccuracyPct: 100,
  unexpectedSafeIntegrityIssues: 0,
  privacyViolationCount: 0,
});

const SENSITIVE_KEY_PATTERN = /(?:^|_)(?:resume|item|ats_review|name|email|phone|contact|company|description|profile|bullet|requirement|evidence|prompt|message|raw)(?:$|_)/i;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i;
const URL_PATTERN = /\b(?:https?:\/\/|www\.)\S+/i;
const PHONE_PATTERN = /(?:\+?\d[\s().-]*){7,}/;

function asCount(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : 0;
}

function asMoney(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number) : 0;
}

function percentage(numerator, denominator) {
  if (!denominator) return 100;
  return Math.round((numerator / denominator) * 10_000) / 100;
}

function coverageFromReview(review = {}) {
  const direct = asCount(review?.coverage?.direct);
  const adjacent = asCount(review?.coverage?.adjacent);
  const transferable = asCount(review?.coverage?.transferable);
  const missing = asCount(review?.coverage?.missing);
  const total = direct + adjacent + transferable + missing;
  const covered = direct + adjacent + transferable;
  return {
    direct,
    adjacent,
    transferable,
    missing,
    covered,
    total,
    coveragePct: percentage(covered, total),
  };
}

function telemetryFromCase(testCase = {}) {
  const telemetry = testCase.telemetry || {};
  const attempts = Math.max(1, asCount(telemetry.attempts));
  return {
    attempts,
    retries: Math.min(attempts - 1, asCount(telemetry.retries)),
    corrections: asCount(telemetry.corrections),
    userEdits: asCount(telemetry.userEdits),
    exportCompleted: telemetry.exportCompleted === true ? 1 : 0,
    durationMs: asCount(telemetry.durationMs),
    inputTokens: asCount(telemetry.inputTokens),
    outputTokens: asCount(telemetry.outputTokens),
    estimatedCostMicros: asMoney(telemetry.estimatedCostMicros),
  };
}

function aggregateTelemetry(rows) {
  const totals = rows.reduce((aggregate, row) => {
    for (const key of Object.keys(aggregate)) aggregate[key] += row.telemetry[key];
    return aggregate;
  }, {
    attempts: 0,
    retries: 0,
    corrections: 0,
    userEdits: 0,
    exportCompleted: 0,
    durationMs: 0,
    inputTokens: 0,
    outputTokens: 0,
    estimatedCostMicros: 0,
  });
  return {
    ...totals,
    retryRatePct: percentage(totals.retries, totals.attempts),
    exportCompletionPct: percentage(totals.exportCompleted, rows.length),
  };
}

function safeIntegrityIssueCount(review = {}) {
  if (Number.isFinite(Number(review?.integrity?.issue_count))) return asCount(review.integrity.issue_count);
  return [
    "unsupported_metrics",
    "unsupported_history",
    "unsupported_skills",
    "unsupported_projects",
    "unsupported_training",
    "unsupported_target_terms",
    "unsupported_positioning",
    "risky_claims",
  ].reduce((count, key) => count + (Array.isArray(review?.[key]) ? review[key].length : 0), 0);
}

function evaluateCase(testCase) {
  const resumePackage = createResumePackage(testCase.resume, {
    item: testCase.item,
    atsReview: testCase.atsReview,
  });
  const readiness = getResumeExportReadiness(resumePackage, testCase.atsReview);
  const expected = testCase.expected || {};
  const actual = {
    templateId: resumePackage.presentation.recommendedTemplateId,
    occupationFamily: resumePackage.classification.occupationFamily,
    careerStrategy: resumePackage.classification.careerStrategy,
    recommendationStrength: resumePackage.presentation.recommendationStrength,
    tradeCredentialStatus: resumePackage.classification.tradeCredentialStatus,
    postingVerified: hasVerifiedPosting(testCase.atsReview),
    applicationReady: readiness.applicationReady,
    canExport: readiness.canExport,
    exportMode: readiness.preliminary ? "preliminary" : "final",
    integrityStatus: testCase.atsReview?.integrity?.status || "unknown",
  };
  const checks = Object.fromEntries(Object.entries(expected).map(([key, value]) => [key, Object.is(actual[key], value)]));
  const checkValues = Object.values(checks);
  const passedChecks = checkValues.filter(Boolean).length;
  const integrityIssueCount = safeIntegrityIssueCount(testCase.atsReview);
  return {
    id: testCase.id,
    variant: testCase.variant || "baseline",
    jobFamily: testCase.jobFamily,
    candidatePath: testCase.candidatePath,
    scenario: testCase.scenario,
    passed: checkValues.length > 0 && passedChecks === checkValues.length,
    contractAccuracyPct: percentage(passedChecks, checkValues.length),
    checks,
    actual,
    integrityIssueCount,
    unexpectedSafeIntegrityIssues: testCase.expectedSafe === true ? integrityIssueCount : 0,
    coverage: coverageFromReview(testCase.atsReview),
    telemetry: telemetryFromCase(testCase),
  };
}

function aggregateBy(rows, key) {
  return Object.fromEntries([...new Set(rows.map((row) => row[key]))].sort().map((value) => {
    const matching = rows.filter((row) => row[key] === value);
    return [value, {
      cases: matching.length,
      passed: matching.filter((row) => row.passed).length,
      contractAccuracyPct: percentage(matching.filter((row) => row.passed).length, matching.length),
    }];
  }));
}

function comparisonAccuracy(rows, key) {
  const comparable = rows.filter((row) => Object.hasOwn(row.checks, key));
  return percentage(comparable.filter((row) => row.checks[key]).length, comparable.length);
}

function aggregateCoverage(rows) {
  const totals = rows.reduce((aggregate, row) => {
    for (const key of ["direct", "adjacent", "transferable", "missing", "covered", "total"]) {
      aggregate[key] += row.coverage[key];
    }
    return aggregate;
  }, { direct: 0, adjacent: 0, transferable: 0, missing: 0, covered: 0, total: 0 });
  return { ...totals, coveragePct: percentage(totals.covered, totals.total) };
}

function variantComparison(rows) {
  return Object.fromEntries([...new Set(rows.map((row) => row.variant))].sort().map((variant) => {
    const matching = rows.filter((row) => row.variant === variant);
    return [variant, {
      cases: matching.length,
      passed: matching.filter((row) => row.passed).length,
      contractAccuracyPct: percentage(matching.filter((row) => row.passed).length, matching.length),
      coverage: aggregateCoverage(matching),
      operations: aggregateTelemetry(matching),
    }];
  }));
}

export function findEvaluationPrivacyViolations(value, forbiddenTerms = []) {
  const violations = [];
  const normalizedForbidden = forbiddenTerms
    .map((term) => String(term || "").trim().toLowerCase())
    .filter((term) => term.length >= 3);

  function inspect(current, path) {
    if (Array.isArray(current)) {
      current.forEach((entry, index) => inspect(entry, `${path}[${index}]`));
      return;
    }
    if (current && typeof current === "object") {
      for (const [key, entry] of Object.entries(current)) {
        if (SENSITIVE_KEY_PATTERN.test(key)) violations.push(`${path}.${key}:sensitive_key`);
        inspect(entry, `${path}.${key}`);
      }
      return;
    }
    if (typeof current !== "string") return;
    if (EMAIL_PATTERN.test(current)) violations.push(`${path}:email`);
    if (URL_PATTERN.test(current)) violations.push(`${path}:url`);
    if (PHONE_PATTERN.test(current)) violations.push(`${path}:phone`);
    const normalized = current.toLowerCase();
    for (const term of normalizedForbidden) {
      if (normalized.includes(term)) violations.push(`${path}:forbidden_term`);
    }
  }

  inspect(value, "$report");
  return [...new Set(violations)].sort();
}

export function evaluateQualityCorpus(corpus, options = {}) {
  if (!Array.isArray(corpus) || corpus.length === 0) throw new Error("The quality corpus must contain at least one case.");
  const caseKeys = corpus.map((testCase) => `${testCase.variant || "baseline"}::${testCase.id}`);
  const duplicateKeys = caseKeys.filter((key, index, keys) => keys.indexOf(key) !== index);
  if (duplicateKeys.length) {
    throw new Error(`Quality corpus case IDs must be unique within each variant: ${[...new Set(duplicateKeys)].join(", ")}`);
  }

  const rows = corpus.map(evaluateCase);
  const thresholds = { ...QUALITY_EVALUATION_THRESHOLDS, ...(options.thresholds || {}) };
  const metrics = {
    cases: rows.length,
    passedCases: rows.filter((row) => row.passed).length,
    contractAccuracyPct: percentage(rows.filter((row) => row.passed).length, rows.length),
    postingReadinessAccuracyPct: comparisonAccuracy(rows, "postingVerified"),
    exportAuthorizationAccuracyPct: comparisonAccuracy(rows, "applicationReady"),
    integrityAccuracyPct: comparisonAccuracy(rows, "integrityStatus"),
    templateAccuracyPct: comparisonAccuracy(rows, "templateId"),
    unexpectedSafeIntegrityIssues: rows.reduce((total, row) => total + row.unexpectedSafeIntegrityIssues, 0),
    coverage: aggregateCoverage(rows),
    operations: aggregateTelemetry(rows),
  };
  const report = {
    schemaVersion: QUALITY_EVALUATION_SCHEMA_VERSION,
    evaluationVersion: options.evaluationVersion || "p3.2-local-v1",
    redacted: true,
    cases: rows.map(({ telemetry, unexpectedSafeIntegrityIssues, ...row }) => row),
    aggregate: {
      ...metrics,
      byJobFamily: aggregateBy(rows, "jobFamily"),
      byCandidatePath: aggregateBy(rows, "candidatePath"),
      variants: variantComparison(rows),
    },
    thresholds,
  };
  const privacyViolations = findEvaluationPrivacyViolations(report, options.forbiddenTerms);
  report.privacy = {
    status: privacyViolations.length === 0 ? "pass" : "blocked",
    violationCount: privacyViolations.length,
    violations: privacyViolations,
  };
  const gateChecks = {
    contractAccuracy: metrics.contractAccuracyPct >= thresholds.contractAccuracyPct,
    postingReadinessAccuracy: metrics.postingReadinessAccuracyPct >= thresholds.postingReadinessAccuracyPct,
    exportAuthorizationAccuracy: metrics.exportAuthorizationAccuracyPct >= thresholds.exportAuthorizationAccuracyPct,
    integrityAccuracy: metrics.integrityAccuracyPct >= thresholds.integrityAccuracyPct,
    templateAccuracy: metrics.templateAccuracyPct >= thresholds.templateAccuracyPct,
    unexpectedSafeIntegrityIssues: metrics.unexpectedSafeIntegrityIssues <= thresholds.unexpectedSafeIntegrityIssues,
    privacy: privacyViolations.length <= thresholds.privacyViolationCount,
  };
  report.releaseGate = {
    passed: Object.values(gateChecks).every(Boolean),
    checks: gateChecks,
  };
  return report;
}
