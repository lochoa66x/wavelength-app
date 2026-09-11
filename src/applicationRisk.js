const GAP_SEVERITIES = new Set(["supported", "verified_blocker", "material_gap", "development_gap", "preference", "candidate_check", "insufficient_information"]);
const EVIDENCE_MATCHES = new Set(["direct", "adjacent", "transferable", "missing", "unknown"]);
const ELIGIBILITY_PATTERN = /\b(?:work authori[sz]ation|legally (?:eligible|entitled|authorized) to work|eligible to work)\b/i;

export const APPLICATION_RISK_FILTERS = Object.freeze([
  { id: "all", label: "All" },
  { id: "blockers", label: "Credential checks" },
  { id: "material", label: "Skills to review" },
  { id: "verified", label: "Direct matches" },
  { id: "related", label: "Related strengths" },
  { id: "candidate_checks", label: "Application questions" },
  { id: "preferences", label: "Preferences" },
  { id: "needs_review", label: "Needs review" },
]);

const OUTLOOK_LABELS = Object.freeze({
  strong_verified_alignment: "Strong match",
  viable_manageable_gaps: "Related experience",
  viable_transition_material_gaps: "Related experience — review gaps",
  high_application_risk: "Central experience needs review",
  likely_screening_blocker: "Credential check needed",
  assessment_incomplete: "Assessment incomplete",
});

const ORIGIN_LABELS = Object.freeze({
  responsibility: "Responsibility",
  mandatory_qualification: "Mandatory qualification",
  preferred_qualification: "Preferred qualification",
  credential: "Professional credential",
  eligibility: "Employer application question",
  schedule_location_constraint: "Schedule or location",
  language_requirement: "Language requirement",
  other: "Other requirement",
});

const SEVERITY_LABELS = Object.freeze({
  supported: "Supported",
  verified_blocker: "Credential check",
  material_gap: "Skill to review",
  development_gap: "Development gap",
  preference: "Preference gap",
  candidate_check: "Answer when applying",
  insufficient_information: "Needs review",
});

const MATCH_LABELS = Object.freeze({
  direct: "Direct evidence",
  adjacent: "Adjacent evidence",
  transferable: "Transferable evidence",
  missing: "No supporting evidence",
  unknown: "Not assessed",
});

const RANK = Object.freeze({
  verified_blocker: 0,
  material_gap: 1,
  direct: 2,
  adjacent: 3,
  transferable: 4,
  development_gap: 5,
  preference: 6,
  candidate_check: 7,
  insufficient_information: 8,
});

function text(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function defaultSeverity(requirement) {
  if (ELIGIBILITY_PATTERN.test(requirement?.requirement || "")) return "candidate_check";
  if (requirement?.evidence_match === "unknown") return "insufficient_information";
  if (GAP_SEVERITIES.has(requirement?.gap_severity)) return requirement.gap_severity;
  if (requirement?.evidence_match && requirement.evidence_match !== "missing") return "supported";
  if (requirement?.priority === "preferred") return "preference";
  if (requirement?.priority === "required") return "material_gap";
  if (requirement?.priority === "responsibility") return "development_gap";
  return "insufficient_information";
}

function defaultOrigin(requirement) {
  if (ELIGIBILITY_PATTERN.test(requirement?.requirement || "")) return "eligibility";
  const origin = text(requirement?.requirement_origin);
  if (Object.hasOwn(ORIGIN_LABELS, origin)) return origin;
  if (requirement?.priority === "required") return "mandatory_qualification";
  if (requirement?.priority === "preferred") return "preferred_qualification";
  if (requirement?.priority === "responsibility") return "responsibility";
  return "other";
}

function defaultImportance(requirement) {
  if (["mandatory", "preferred", "contextual", "unknown"].includes(requirement?.importance)) return requirement.importance;
  if (requirement?.priority === "required") return "mandatory";
  if (requirement?.priority === "preferred") return "preferred";
  if (requirement?.priority === "responsibility") return "contextual";
  return "unknown";
}

function fallbackExplanation(requirement, evidenceMatch, severity) {
  if (evidenceMatch === "direct") return "An exact candidate evidence excerpt directly supports this requirement.";
  if (evidenceMatch === "adjacent") return "Verified experience is closely related, but target-specific direct experience remains unverified.";
  if (evidenceMatch === "transferable") return "Verified experience demonstrates a relevant capability without proving equivalent target-role experience.";
  if (severity === "verified_blocker") return "An explicit mandatory credential or eligibility condition has no supporting candidate evidence.";
  if (severity === "candidate_check") return "This belongs to the employer's application questions and is not inferred from résumé content.";
  if (severity === "material_gap") return "A central qualification or responsibility has no exact supporting candidate evidence.";
  if (severity === "preference") return "A preferred qualification has no supporting candidate evidence.";
  if (severity === "development_gap") return "A stated responsibility has no supporting candidate evidence.";
  return "The available posting or candidate evidence is not sufficient for this requirement.";
}

function fallbackNextAction(evidenceMatch, severity) {
  if (evidenceMatch === "direct") return "Review the wording and contribution level before applying.";
  if (evidenceMatch === "adjacent") return "Keep the target-specific boundary visible or add only candidate-confirmed evidence.";
  if (evidenceMatch === "transferable") return "Use transferable positioning without presenting it as direct experience.";
  if (severity === "verified_blocker") return "Confirm candidate-held evidence or keep this visible as a likely screening blocker.";
  if (severity === "candidate_check") return "Answer the employer's eligibility question directly when you apply; no résumé change is required.";
  if (severity === "material_gap") return "Add candidate-confirmed evidence if it exists, otherwise keep the material gap visible.";
  if (severity === "preference") return "Keep this visible as a preference gap; do not add it only for keyword coverage.";
  return "Review the posting and add only candidate-confirmed evidence if available.";
}

export function normalizeApplicationRequirement(requirement, index = 0) {
  const evidenceMatch = EVIDENCE_MATCHES.has(requirement?.evidence_match) ? requirement.evidence_match : "unknown";
  const severity = defaultSeverity({ ...requirement, evidence_match: evidenceMatch });
  const origin = defaultOrigin(requirement);
  const citation = Array.isArray(requirement?.evidence)
    ? requirement.evidence.find((item) => item && typeof item === "object" && text(item.excerpt)) || null
    : null;
  const sortKey = severity === "supported" ? evidenceMatch : severity;

  return {
    id: text(requirement?.id, `requirement-${index + 1}`),
    requirement: text(requirement?.requirement, "Requirement unavailable"),
    parentRequirement: text(requirement?.parent_requirement),
    priority: text(requirement?.priority, "context"),
    evidenceMatch,
    evidenceLabel: MATCH_LABELS[evidenceMatch],
    gapSeverity: severity,
    severityLabel: SEVERITY_LABELS[severity],
    origin,
    originLabel: ORIGIN_LABELS[origin],
    importance: defaultImportance(requirement),
    confidence: text(requirement?.confidence, citation ? "high" : "medium"),
    reasonCode: text(requirement?.reason_code, "assessment_fallback"),
    explanation: text(requirement?.assessment_explanation, fallbackExplanation(requirement, evidenceMatch, severity)),
    unproven: text(requirement?.unproven),
    nextAction: text(requirement?.next_action, fallbackNextAction(evidenceMatch, severity)),
    matchBasis: text(requirement?.match_basis),
    applicationImpact: text(requirement?.application_impact),
    safeLanguage: text(requirement?.safe_language),
    citation: citation ? {
      excerpt: text(citation.excerpt),
      source: text(citation.source, "base_resume"),
      section: text(citation.section, "base résumé"),
      lineIndex: Number.isFinite(Number(citation.line_index)) ? Number(citation.line_index) : null,
    } : null,
    sortRank: RANK[sortKey] ?? 99,
    originalIndex: index,
  };
}

export function applicationRequirementMatchesFilter(requirement, filter) {
  if (filter === "all") return true;
  if (filter === "blockers") return requirement.gapSeverity === "verified_blocker";
  if (filter === "material") return requirement.gapSeverity === "material_gap";
  if (filter === "verified") return requirement.evidenceMatch === "direct";
  if (filter === "related") return ["adjacent", "transferable"].includes(requirement.evidenceMatch);
  if (filter === "candidate_checks") return requirement.gapSeverity === "candidate_check";
  if (filter === "preferences") return requirement.gapSeverity === "preference";
  if (filter === "needs_review") return ["development_gap", "insufficient_information"].includes(requirement.gapSeverity);
  return false;
}

function fallbackOutlook(review, counts, postingComplete) {
  const confidence = postingComplete ? text(review?.candidate_fit?.confidence, counts.total >= 5 ? "high" : "medium") : "unavailable";
  if (!postingComplete || counts.total === 0 || counts.unassessed > 0) {
    return {
      status: "assessment_incomplete",
      label: OUTLOOK_LABELS.assessment_incomplete,
      confidence: "unavailable",
      reason: counts.unassessed > 0 && postingComplete ? `${counts.unassessed} central requirement${counts.unassessed === 1 ? " has" : "s have"} not been assessed. Review the available evidence before judging role fit.` : text(review?.posting_readiness?.reason, "Review the complete posting before judging candidate fit."),
      whatWouldChange: "Provide and review the complete responsibilities and qualifications.",
    };
  }
  if (counts.blockers > 0) {
    return {
      status: "likely_screening_blocker",
      label: OUTLOOK_LABELS.likely_screening_blocker,
      confidence,
      reason: `${counts.blockers} explicit mandatory condition${counts.blockers === 1 ? " has" : "s have"} no supporting evidence.`,
      whatWouldChange: "Candidate-confirmed evidence of the required credential or eligibility condition.",
    };
  }
  if (counts.materialGaps > 0) {
    const missingRate = counts.total ? counts.missing / counts.total : 1;
    const supportedRate = counts.total ? (counts.verifiedStrengths + counts.relatedEvidence) / counts.total : 0;
    const status = supportedRate >= 0.55 && missingRate < 0.45
      ? "viable_transition_material_gaps"
      : "high_application_risk";
    return {
      status,
      label: OUTLOOK_LABELS[status],
      confidence,
      reason: `${counts.materialGaps} central qualification or responsibilit${counts.materialGaps === 1 ? "y remains" : "ies remain"} unsupported.`,
      whatWouldChange: "Candidate-confirmed evidence that directly or honestly relates to the unsupported requirements.",
    };
  }
  if (review?.candidate_fit?.status === "strong" && counts.verifiedStrengths === counts.total) {
    return {
      status: "strong_verified_alignment",
      label: OUTLOOK_LABELS.strong_verified_alignment,
      confidence,
      reason: "The analyzed requirements are supported without an explicit mandatory blocker or material gap.",
      whatWouldChange: "Continue reviewing wording and contribution level before applying.",
    };
  }
  return {
    status: "viable_manageable_gaps",
    label: OUTLOOK_LABELS.viable_manageable_gaps,
    confidence,
    reason: "The résumé shows a credible mix of direct and related evidence. Optional refinements can strengthen the final version.",
    whatWouldChange: "Additional candidate-confirmed direct evidence may strengthen the application.",
  };
}

function outlookTone(status) {
  if (status === "strong_verified_alignment") return "positive";
  if (status === "viable_manageable_gaps") return "neutral";
  if (status === "viable_transition_material_gaps") return "caution";
  if (["high_application_risk", "likely_screening_blocker"].includes(status)) return "danger";
  return "unknown";
}

export function buildApplicationRiskView(review = {}) {
  const requirements = (Array.isArray(review?.requirements) ? review.requirements : [])
    .map(normalizeApplicationRequirement)
    .sort((left, right) => left.sortRank - right.sortRank || left.originalIndex - right.originalIndex);
  const counts = requirements.reduce((result, requirement) => {
    result.total += 1;
    if (requirement.evidenceMatch === "direct") result.verifiedStrengths += 1;
    if (["adjacent", "transferable"].includes(requirement.evidenceMatch)) result.relatedEvidence += 1;
    if (requirement.evidenceMatch === "missing" && requirement.gapSeverity !== "candidate_check") result.missing += 1;
    if (requirement.gapSeverity === "verified_blocker") result.blockers += 1;
    if (["required", "responsibility"].includes(requirement.priority) && requirement.evidenceMatch === "missing" && requirement.gapSeverity !== "verified_blocker") result.materialGaps += 1;
    if (requirement.gapSeverity === "development_gap") result.developmentGaps += 1;
    if (requirement.gapSeverity === "preference") result.preferences += 1;
    if (requirement.gapSeverity === "insufficient_information") result.needsReview += 1;
    if (requirement.gapSeverity === "candidate_check") result.candidateChecks += 1;
    return result;
  }, {
    total: 0,
    verifiedStrengths: 0,
    relatedEvidence: 0,
    missing: 0,
    blockers: 0,
    materialGaps: 0,
    developmentGaps: 0,
    preferences: 0,
    needsReview: 0,
    candidateChecks: 0,
  });
  const fitRequirements = requirements.filter((requirement) => requirement.gapSeverity !== "candidate_check");
  const coreRequirements = fitRequirements.filter((requirement) => ["required", "responsibility"].includes(requirement.priority));
  const coreInventory = coreRequirements.length ? coreRequirements : fitRequirements;
  const coreCounts = coreInventory.reduce((result, requirement) => {
    result.total += 1;
    if (requirement.evidenceMatch === "direct") result.verifiedStrengths += 1;
    if (requirement.evidenceMatch === "adjacent") result.adjacent += 1;
    if (requirement.evidenceMatch === "transferable") result.transferable += 1;
    if (["adjacent", "transferable"].includes(requirement.evidenceMatch)) result.relatedEvidence += 1;
    if (requirement.evidenceMatch === "missing") result.missing += 1;
    if (requirement.evidenceMatch === "unknown") result.unassessed += 1;
    if (requirement.gapSeverity === "verified_blocker") result.blockers += 1;
    if (["required", "responsibility"].includes(requirement.priority) && requirement.evidenceMatch === "missing" && requirement.gapSeverity !== "verified_blocker") result.materialGaps += 1;
    return result;
  }, {
    total: 0,
    verifiedStrengths: 0,
    adjacent: 0,
    transferable: 0,
    relatedEvidence: 0,
    missing: 0,
    unassessed: 0,
    blockers: 0,
    materialGaps: 0,
  });
  const postingComplete = review?.posting_readiness?.fit_allowed === true;
  const fallback = fallbackOutlook(review, coreCounts, postingComplete);
  const status = fallback.status;
  const outlook = {
    status,
    label: fallback.label,
    confidence: fallback.confidence === "high" && (coreCounts.relatedEvidence > 0 || coreCounts.missing > 0) ? "medium" : fallback.confidence,
    reason: fallback.reason,
    whatWouldChange: fallback.whatWouldChange,
    tone: outlookTone(status),
  };

  const exportBlockers = Array.isArray(review?.export_readiness?.blockers)
    ? review.export_readiness.blockers.filter((item) => typeof item === "string")
    : [];
  const truthBlockers = exportBlockers.filter((blocker) => blocker !== "candidate_fit");
  const truthChecksPass = postingComplete
    && counts.total > 0
    && review?.integrity?.status === "pass"
    && review?.requirement_consistency?.status !== "blocked"
    && !(review?.provenance_issues?.length)
    && review?.identity?.status === "complete"
    && review?.parseability?.status === "pass"
    && review?.writing?.status !== "blocked"
    && truthBlockers.length === 0;
  const exportBlocked = review?.integrity?.status === "blocked" || review?.requirement_consistency?.status === "blocked" || (review?.provenance_issues?.length || 0) > 0 || review?.identity?.status === "missing";
  const applicationReady = !exportBlocked && review?.application_ready === true
    && review?.export_readiness?.application_ready !== false;
  const document = {
    truthChecksPass,
    truthLabel: truthChecksPass ? "Content checks passed" : "Document review needed",
    exportReady: applicationReady,
    exportBlocked,
    exportLabel: exportBlocked ? "Export blocked" : applicationReady ? "Application-ready export" : "Preliminary export",
    detail: applicationReady
      ? "Identity, posting, structure, and document evidence checks passed. Role fit is assessed separately."
      : truthChecksPass && exportBlockers.length === 1 && exportBlockers[0] === "candidate_fit"
        ? "Document checks passed. Role-fit gaps remain, so downloads are marked preliminary."
        : text(review?.export_readiness?.blockers?.join(", ").replaceAll("_", " "), "Complete the remaining document and evidence review."),
  };

  const filters = APPLICATION_RISK_FILTERS.map((filter) => ({
    ...filter,
    count: requirements.filter((requirement) => applicationRequirementMatchesFilter(requirement, filter.id)).length,
  }));

  return {
    postingComplete,
    requirements,
    counts,
    coreCounts,
    outlook,
    document,
    highlights: {
      strengths: coreInventory.filter((entry) => entry.evidenceMatch === "direct").slice(0, 2),
      gaps: coreInventory.filter((entry) => ["missing", "unknown"].includes(entry.evidenceMatch)).slice(0, 2),
    },
    filters,
  };
}
