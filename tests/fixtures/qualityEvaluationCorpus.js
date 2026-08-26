import { buildAtsReview } from "../../api/_lib/atsValidation.js";
import {
  adminCustomerOperationsResumeFixture,
  adminCustomerTargetItem,
  apprenticeTargetItem,
  creativeAdjacentResumeFixture,
  creativeDesignResumeFixture,
  creativeTargetItem,
  electricianTargetItem,
  licensedElectricianResumeFixture,
  marketingCareerChangerResumeFixture,
  marketingCommunicationsResumeFixture,
  marketingTargetItem,
  missingElectricianCredentialReview,
  technicalSoftwareResumeFixture,
  technicalTargetItem,
  tradeApprenticeResumeFixture,
  verifiedElectricianReview,
  verifiedPostingReview,
} from "./resumePhaseBFixtures.js";

function reviewWithCoverage(review, coverage, overrides = {}) {
  const total = ["direct", "adjacent", "transferable", "missing"]
    .reduce((sum, key) => sum + Number(coverage[key] || 0), 0);
  const preserved = Array.isArray(review.requirements) ? review.requirements.slice(0, total) : [];
  const requirements = [...preserved];
  for (const match of ["direct", "adjacent", "transferable", "missing"]) {
    const existing = requirements.filter((requirement) => requirement.evidence_match === match).length;
    for (let index = existing; index < Number(coverage[match] || 0); index += 1) {
      requirements.push(Object.freeze({
        id: `fixture-${match}-${index + 1}`,
        requirement: `Redacted ${match} evaluation requirement ${index + 1}`,
        priority: "required",
        evidence_match: match,
      }));
    }
  }
  return Object.freeze({
    ...review,
    requirements: Object.freeze(requirements.slice(0, total)),
    coverage: Object.freeze({ ...coverage }),
    ...overrides,
  });
}

const safeDirectCoverage = Object.freeze({ direct: 5, adjacent: 1, transferable: 1, missing: 1 });
const adjacentCoverage = Object.freeze({ direct: 1, adjacent: 3, transferable: 2, missing: 4 });

const incompletePostingReview = reviewWithCoverage(verifiedPostingReview, adjacentCoverage, {
  application_ready: false,
  posting_readiness: Object.freeze({
    status: "needs_full_posting",
    fit_allowed: false,
    application_ready_allowed: false,
  }),
  readiness: Object.freeze({ status: "needs_full_posting" }),
  export_readiness: Object.freeze({ status: "preliminary", application_ready: false }),
});

const credentialGapReview = reviewWithCoverage(missingElectricianCredentialReview, adjacentCoverage, {
  application_ready: false,
  readiness: Object.freeze({ status: "significant_gap" }),
  export_readiness: Object.freeze({ status: "preliminary", application_ready: false }),
});

const unsafeTechnicalBaseResume = Object.freeze({
  ...technicalSoftwareResumeFixture,
  skills: Object.freeze(Object.values(technicalSoftwareResumeFixture.skills).flat()),
});
const unsafeTechnicalResume = Object.freeze({
  ...unsafeTechnicalBaseResume,
  profile: `${unsafeTechnicalBaseResume.profile} Increased platform revenue by 987%.`,
});
const unsafeTechnicalReview = Object.freeze({
  ...buildAtsReview(
    unsafeTechnicalResume,
    JSON.stringify(unsafeTechnicalBaseResume),
    { keywords: ["TypeScript", "React", "Node.js"] },
    {
      postingAssessment: {
        status: "complete",
        reason: "The redacted fixture is complete.",
        fit_allowed: true,
        application_ready_allowed: true,
      },
    },
  ),
  coverage: Object.freeze({ direct: 3, adjacent: 0, transferable: 0, missing: 0 }),
});

function telemetry(seed, overrides = {}) {
  return Object.freeze({
    attempts: 1,
    retries: 0,
    corrections: seed % 3,
    userEdits: seed % 2,
    exportCompleted: true,
    durationMs: 900 + seed * 40,
    inputTokens: 1100 + seed * 25,
    outputTokens: 620 + seed * 15,
    estimatedCostMicros: 2400 + seed * 90,
    ...overrides,
  });
}

export const qualityEvaluationForbiddenTerms = Object.freeze([
  "Jordan Patel",
  "Maya Thompson",
  "Alex Romero",
  "Priya Singh",
  "Taylor Chen",
  "Amara Johnson",
  "Riley Morgan",
  "Diego Alvarez",
  "example.com",
  "555-",
]);

export const qualityEvaluationCorpus = Object.freeze([
  Object.freeze({
    id: "technical-direct-01",
    jobFamily: "technical",
    candidatePath: "direct",
    scenario: "verified-complete",
    resume: technicalSoftwareResumeFixture,
    item: technicalTargetItem,
    atsReview: reviewWithCoverage(verifiedPostingReview, safeDirectCoverage),
    expectedSafe: true,
    expected: Object.freeze({
      templateId: "technical-software-v1",
      occupationFamily: "technical",
      careerStrategy: "direct",
      recommendationStrength: "strong",
      postingVerified: true,
      applicationReady: true,
      canExport: true,
      exportMode: "final",
      integrityStatus: "pass",
    }),
    telemetry: telemetry(1),
  }),
  Object.freeze({
    id: "admin-direct-01",
    jobFamily: "admin-customer-operations",
    candidatePath: "direct",
    scenario: "verified-complete",
    resume: adminCustomerOperationsResumeFixture,
    item: adminCustomerTargetItem,
    atsReview: reviewWithCoverage(verifiedPostingReview, safeDirectCoverage),
    expectedSafe: true,
    expected: Object.freeze({
      templateId: "admin-customer-operations-v1",
      occupationFamily: "admin-customer-operations",
      careerStrategy: "direct",
      recommendationStrength: "strong",
      postingVerified: true,
      applicationReady: true,
      canExport: true,
      exportMode: "final",
      integrityStatus: "pass",
    }),
    telemetry: telemetry(2),
  }),
  Object.freeze({
    id: "trades-regulated-01",
    jobFamily: "skilled-trades-field-services",
    candidatePath: "direct",
    scenario: "regulated-credential-verified",
    resume: licensedElectricianResumeFixture,
    item: electricianTargetItem,
    atsReview: reviewWithCoverage(verifiedElectricianReview, safeDirectCoverage),
    expectedSafe: true,
    expected: Object.freeze({
      templateId: "skilled-trades-field-services-v1",
      occupationFamily: "skilled-trades-field-services",
      careerStrategy: "direct",
      recommendationStrength: "strong",
      tradeCredentialStatus: "required-verified",
      postingVerified: true,
      applicationReady: true,
      canExport: true,
      exportMode: "final",
      integrityStatus: "pass",
    }),
    telemetry: telemetry(3),
  }),
  Object.freeze({
    id: "trades-apprentice-01",
    jobFamily: "skilled-trades-field-services",
    candidatePath: "direct",
    scenario: "apprentice-no-licence-invention",
    resume: tradeApprenticeResumeFixture,
    item: apprenticeTargetItem,
    atsReview: reviewWithCoverage(verifiedPostingReview, safeDirectCoverage),
    expectedSafe: true,
    expected: Object.freeze({
      templateId: "skilled-trades-field-services-v1",
      occupationFamily: "skilled-trades-field-services",
      careerStrategy: "direct",
      recommendationStrength: "strong",
      postingVerified: true,
      applicationReady: true,
      canExport: true,
      exportMode: "final",
      integrityStatus: "pass",
    }),
    telemetry: telemetry(4),
  }),
  Object.freeze({
    id: "trades-credential-gap-01",
    jobFamily: "skilled-trades-field-services",
    candidatePath: "credential-gap",
    scenario: "regulated-credential-missing",
    resume: Object.freeze({ ...licensedElectricianResumeFixture, title: "Electrical Installation Worker", certifications: [] }),
    item: electricianTargetItem,
    atsReview: credentialGapReview,
    expectedSafe: true,
    expected: Object.freeze({
      templateId: "skilled-trades-field-services-v1",
      occupationFamily: "skilled-trades-field-services",
      careerStrategy: "direct",
      recommendationStrength: "moderate",
      tradeCredentialStatus: "required-missing",
      postingVerified: true,
      applicationReady: false,
      canExport: true,
      exportMode: "preliminary",
      integrityStatus: "pass",
    }),
    telemetry: telemetry(5, { exportCompleted: false }),
  }),
  Object.freeze({
    id: "marketing-direct-01",
    jobFamily: "marketing-communications",
    candidatePath: "direct",
    scenario: "verified-complete",
    resume: marketingCommunicationsResumeFixture,
    item: marketingTargetItem,
    atsReview: reviewWithCoverage(verifiedPostingReview, safeDirectCoverage),
    expectedSafe: true,
    expected: Object.freeze({
      templateId: "marketing-communications-v1",
      occupationFamily: "marketing-communications",
      careerStrategy: "direct",
      recommendationStrength: "strong",
      postingVerified: true,
      applicationReady: true,
      canExport: true,
      exportMode: "final",
      integrityStatus: "pass",
    }),
    telemetry: telemetry(6),
  }),
  Object.freeze({
    id: "marketing-transition-01",
    jobFamily: "marketing-communications",
    candidatePath: "career-transition",
    scenario: "transferable-evidence-only",
    resume: marketingCareerChangerResumeFixture,
    item: marketingTargetItem,
    atsReview: reviewWithCoverage(verifiedPostingReview, adjacentCoverage),
    expectedSafe: true,
    expected: Object.freeze({
      templateId: "career-transition-v1",
      occupationFamily: "marketing-communications",
      careerStrategy: "major-transition",
      recommendationStrength: "strong",
      postingVerified: true,
      applicationReady: true,
      canExport: true,
      exportMode: "final",
      integrityStatus: "pass",
    }),
    telemetry: telemetry(7, { attempts: 2, retries: 1 }),
  }),
  Object.freeze({
    id: "creative-direct-01",
    jobFamily: "creative-design",
    candidatePath: "direct",
    scenario: "verified-portfolio",
    resume: creativeDesignResumeFixture,
    item: creativeTargetItem,
    atsReview: reviewWithCoverage(verifiedPostingReview, safeDirectCoverage),
    expectedSafe: true,
    expected: Object.freeze({
      templateId: "creative-design-v1",
      occupationFamily: "creative-design",
      careerStrategy: "direct",
      recommendationStrength: "strong",
      postingVerified: true,
      applicationReady: true,
      canExport: true,
      exportMode: "final",
      integrityStatus: "pass",
    }),
    telemetry: telemetry(8),
  }),
  Object.freeze({
    id: "creative-adjacent-01",
    jobFamily: "creative-design",
    candidatePath: "adjacent",
    scenario: "production-evidence-no-portfolio",
    resume: creativeAdjacentResumeFixture,
    item: creativeTargetItem,
    atsReview: reviewWithCoverage(verifiedPostingReview, adjacentCoverage),
    expectedSafe: true,
    expected: Object.freeze({
      templateId: "creative-design-v1",
      occupationFamily: "creative-design",
      careerStrategy: "adjacent",
      recommendationStrength: "moderate",
      postingVerified: true,
      applicationReady: true,
      canExport: true,
      exportMode: "final",
      integrityStatus: "pass",
    }),
    telemetry: telemetry(9),
  }),
  Object.freeze({
    id: "admin-incomplete-posting-01",
    jobFamily: "admin-customer-operations",
    candidatePath: "incomplete-posting",
    scenario: "preliminary-export-only",
    resume: adminCustomerOperationsResumeFixture,
    item: adminCustomerTargetItem,
    atsReview: incompletePostingReview,
    expectedSafe: true,
    expected: Object.freeze({
      templateId: "admin-customer-operations-v1",
      occupationFamily: "admin-customer-operations",
      careerStrategy: "direct",
      recommendationStrength: "strong",
      postingVerified: false,
      applicationReady: false,
      canExport: true,
      exportMode: "preliminary",
      integrityStatus: "pass",
    }),
    telemetry: telemetry(10, { exportCompleted: false }),
  }),
  Object.freeze({
    id: "technical-integrity-block-01",
    jobFamily: "technical",
    candidatePath: "integrity-blocked",
    scenario: "unsupported-metric",
    resume: unsafeTechnicalResume,
    item: technicalTargetItem,
    atsReview: unsafeTechnicalReview,
    expectedSafe: false,
    expected: Object.freeze({
      templateId: "technical-software-v1",
      occupationFamily: "technical",
      careerStrategy: "direct",
      recommendationStrength: "strong",
      postingVerified: true,
      applicationReady: false,
      canExport: true,
      exportMode: "preliminary",
      integrityStatus: "blocked",
    }),
    telemetry: telemetry(11, { attempts: 2, retries: 1, exportCompleted: false }),
  }),
]);
