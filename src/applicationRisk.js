const GAP_SEVERITIES = new Set(["supported", "verified_blocker", "material_gap", "development_gap", "preference", "insufficient_information"]);
const EVIDENCE_MATCHES = new Set(["direct", "adjacent", "transferable", "missing", "unknown"]);

export const APPLICATION_RISK_FILTERS = Object.freeze([
  { id: "all", label: "All" },
  { id: "blockers", label: "Blockers" },
  { id: "material", label: "Material gaps" },
  { id: "verified", label: "Verified" },
  { id: "related", label: "Adjacent / transferable" },
  { id: "preferences", label: "Preferences" },
  { id: "needs_review", label: "Needs review" },
]);

const OUTLOOK_LABELS = Object.freeze({
  strong_verified_alignment: "Strong verified alignment",
  viable_manageable_gaps: "Viable with manageable gaps",
  viable_transition_material_gaps: "Viable transition with material gaps",
  high_application_risk: "High application risk",
  likely_screening_blocker: "Likely screening blocker",
  assessment_incomplete: "Assessment incomplete",
});

const ORIGIN_LABELS = Object.freeze({
  responsibility: "Responsibility",
  mandatory_qualification: "Mandatory qualification",
  preferred_qualification: "Preferred qualification",
  credential: "Credential or eligibility",
  schedule_location_constraint: "Schedule or location",
  language_requirement: "Language requirement",
  other: "Other requirement",
});

const SEVERITY_LABELS = Object.freeze({
  supported: "Supported",
  verified_blocker: "Likely blocker",
  material_gap: "Material gap",
  development_gap: "Development gap",
  preference: "Preference gap",
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
  insufficient_information: 7,
});

function text(value, fallback = "") {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function defaultSeverity(requirement) {
  if (GAP_SEVERITIES.has(requirement?.gap_severity)) return requirement.gap_severity;
  if (requirement?.evidence_match && requirement.evidence_match !== "missing") return "supported";
  if (requirement?.priority === "preferred") return "preference";
  if (requirement?.priority === "required") return "material_gap";
  if (requirement?.priority === "responsibility") return "development_gap";
  return "insufficient_information";
}

function defaultOrigin(requirement) {
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
  if (severity === "material_gap") return "A required capability has no exact supporting candidate evidence.";
  if (severity === "preference") return "A preferred qualification has no supporting candidate evidence.";
  if (severity === "development_gap") return "A stated responsibility has no supporting candidate evidence.";
  return "The available posting or candidate evidence is not sufficient for this requirement.";
}

function fallbackNextAction(evidenceMatch, severity) {
  if (evidenceMatch === "direct") return "Review the wording and contribution level before applying.";
  if (evidenceMatch === "adjacent") return "Keep the target-specific boundary visible or add only candidate-confirmed evidence.";
  if (evidenceMatch === "transferable") return "Use transferable positioning without presenting it as direct experience.";
  if (severity === "verified_blocker") return "Confirm candidate-held evidence or keep this visible as a likely screening blocker.";
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
  if (filter === "preferences") return requirement.gapSeverity === "preference";
  if (filter === "needs_review") return ["development_gap", "insufficient_information"].includes(requirement.gapSeverity);
  return false;
}

function fallbackOutlook(review, counts, postingComplete) {
  const confidence = postingComplete ? text(review?.candidate_fit?.confidence, counts.total >= 5 ? "high" : "medium") : "unavailable";
  if (!postingComplete || counts.total === 0) {
    return {
      status: "assessment_incomplete",
      label: OUTLOOK_LABELS.assessment_incomplete,
      confidence,
      reason: text(review?.posting_readiness?.reason, "Review the complete posting before judging candidate fit."),
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
    const status = counts.verifiedStrengths + counts.relatedEvidence > 0
      ? "viable_transition_material_gaps"
      : "high_application_risk";
    return {
      status,
      label: OUTLOOK_LABELS[status],
      confidence,
      reason: `${counts.materialGaps} required capabilit${counts.materialGaps === 1 ? "y remains" : "ies remain"} unsupported.`,
      whatWouldChange: "Candidate-confirmed evidence that directly or honestly relates to the unsupported requirements.",
    };
  }
  if (review?.candidate_fit?.status === "strong" && counts.missing === 0) {
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
    reason: "No explicit mandatory blocker was found; related evidence or manageable gaps remain visible.",
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
    if (requirement.evidenceMatch === "missing") result.missing += 1;
    if (requirement.gapSeverity === "verified_blocker") result.blockers += 1;
    if (requirement.gapSeverity === "material_gap") result.materialGaps += 1;
    if (requirement.gapSeverity === "development_gap") result.developmentGaps += 1;
    if (requirement.gapSeverity === "preference") result.preferences += 1;
    if (requirement.gapSeverity === "insufficient_information") result.needsReview += 1;
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
  });
  const postingComplete = review?.posting_readiness?.fit_allowed === true;
  const suppliedOutlook = review?.gap_summary?.outlook;
  const fallback = fallbackOutlook(review, counts, postingComplete);
  const status = text(suppliedOutlook?.status, fallback.status);
  const outlook = {
    status,
    label: text(suppliedOutlook?.label, OUTLOOK_LABELS[status] || fallback.label),
    confidence: text(suppliedOutlook?.confidence, fallback.confidence),
    reason: text(suppliedOutlook?.reason, fallback.reason),
    whatWouldChange: text(suppliedOutlook?.what_would_change, fallback.whatWouldChange),
    tone: outlookTone(status),
  };

  const exportBlockers = Array.isArray(review?.export_readiness?.blockers)
    ? review.export_readiness.blockers.filter((item) => typeof item === "string")
    : [];
  const truthBlockers = exportBlockers.filter((blocker) => blocker !== "candidate_fit");
  const truthChecksPass = postingComplete
    && counts.total > 0
    && review?.integrity?.status === "pass"
    && review?.identity?.status === "complete"
    && review?.parseability?.status === "pass"
    && review?.writing?.status !== "blocked"
    && truthBlockers.length === 0;
  const applicationReady = review?.application_ready === true
    && review?.export_readiness?.application_ready !== false;
  const document = {
    truthChecksPass,
    truthLabel: truthChecksPass ? "Truth checks passed" : "Document review needed",
    exportReady: applicationReady,
    exportLabel: applicationReady ? "Application-ready export" : "Preliminary export",
    detail: applicationReady
      ? "Posting, identity, writing, structure, evidence and application-risk gates passed."
      : truthChecksPass && exportBlockers.length === 1 && exportBlockers[0] === "candidate_fit"
        ? "The résumé is evidence-safe; final export remains preliminary because the application has material fit risk."
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
    outlook,
    document,
    filters,
  };
}
