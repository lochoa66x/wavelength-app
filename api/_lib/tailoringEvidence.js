const STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "in", "is", "it",
  "of", "on", "or", "our", "that", "the", "their", "this", "to", "we", "will", "with", "you",
  "your", "job", "role", "work", "working", "candidate", "position", "team", "using", "including",
]);

const HIGH_SIGNAL_PHRASES = [
  "agile delivery", "application development", "business analysis", "change management",
  "client communication", "cross-functional collaboration", "customer service", "data analysis",
  "data governance", "full stack", "project management", "quality assurance", "release management",
  "requirements analysis", "software development", "stakeholder management", "systems integration",
  "technical delivery", "user acceptance testing", "web applications", "web development",
];

const STRICT_EVIDENCE_CONCEPTS = Object.freeze([
  {
    id: "unit_testing",
    requirement: /\bunit test(?:ing|s)?\b/i,
    evidence: /\bunit test(?:ing|s|ed)?\b/i,
    direct: true,
  },
  {
    id: "integration_testing",
    requirement: /\bintegration test(?:ing|s)?\b/i,
    evidence: /\bintegration test(?:ing|s|ed)?\b/i,
    direct: true,
  },
  {
    id: "uat",
    requirement: /\b(?:uat|user acceptance test(?:ing|s)?)\b/i,
    evidence: /\b(?:uat|user acceptance test(?:ing|s|ed)?)\b/i,
    direct: true,
  },
  {
    id: "regression_testing",
    requirement: /\bregression test(?:ing|s)?\b/i,
    evidence: /\bregression test(?:ing|s|ed)?\b/i,
    direct: true,
  },
  {
    id: "english",
    requirement: /\benglish\b/i,
    evidence: /\benglish\b[^\n]{0,45}\b(?:fluent|fluency|native|professional|advanced|proficient|bilingual)\b|\b(?:fluent|fluency|native|professional|advanced|proficient|bilingual)\b[^\n]{0,45}\benglish\b/i,
    direct: true,
  },
  {
    id: "stakeholder_collaboration",
    requirement: /\b(?:interpersonal|stakeholders?|diverse teams?|cross-functional|collaborat)\b/i,
    evidence: /\b(?:stakeholders?|cross-functional|multidisciplinary|collaborat(?:e|ed|ion)|coordinat(?:e|ed|ion)[^\n]{0,70}teams?|teams?[^\n]{0,70}coordinat(?:e|ed|ion))\b/i,
  },
  {
    id: "bachelor_degree",
    requirement: /\b(?:bachelor(?:'s)?|undergraduate)\s+(?:degree|education)|\b(?:ba|bs|bsc|bba)\b/i,
    evidence: /\b(?:bachelor(?:'s)?(?:\s+of|\s+degree)?|baccalaureate|ba|bs|bsc|bba)\b/i,
    direct: true,
  },
  {
    id: "abap",
    requirement: /\babap\b/i,
    evidence: /\babap\b/i,
    directEvidence: /\b(?:developed|coded|programmed|implemented|debugged|enhanced|wrote|built)\b[^\n]{0,80}\babap\b|\babap\b[^\n]{0,80}\b(?:development|developer|coding|programming|implementation)\b/i,
  },
  {
    id: "security_compliance",
    requirement: /\b(?:security polic(?:y|ies)|security controls?|access controls?|cybersecurity|information security|sap security|compliance requirements?|regulatory compliance|sox)\b/i,
    evidence: /\b(?:security polic(?:y|ies)|security controls?|access controls?|cybersecurity|information security|sap security|regulatory compliance|sox|governance,? risk,? and compliance|grc)\b/i,
    direct: true,
  },
  {
    id: "sap_isu_fica",
    requirement: /\b(?:sap\s+)?is[- ]?u\b[^\n]{0,80}\bfi[- ]?ca\b|\b(?:sap\s+)?isu\s+fica\b/i,
    evidence: /\b(?:sap\s+)?is[- ]?u\b[^\n]{0,80}\bfi[- ]?ca\b|\b(?:sap\s+)?isu\s+fica\b|\bfi[- ]?ca\b|\bpscd\b|\bcontract accounts?\b/i,
    directEvidence: /\b(?:sap\s+)?is[- ]?u\b[^\n]{0,80}\bfi[- ]?ca\b|\b(?:sap\s+)?isu\s+fica\b/i,
  },
  {
    id: "sap_utilities",
    requirement: /\b(?:sap\s+)?is[- ]?u\b|\bsap\s+s\/?4hana\s+for\s+utilities\b/i,
    evidence: /\b(?:sap\s+)?is[- ]?u\b|\bsap\s+s\/?4hana\s+for\s+utilities\b|\bfi[- ]?ca\b|\bpscd\b|\bcontract accounts?\b/i,
    directEvidence: /\b(?:sap\s+)?is[- ]?u\b|\bsap\s+s\/?4hana\s+for\s+utilities\b/i,
  },
  { id: "meter_to_cash", requirement: /\bmeter\s+to\s+cash\b/i, evidence: /\bmeter\s+to\s+cash\b/i, direct: true },
  { id: "cash_journal", requirement: /\bcash\s+journals?\b/i, evidence: /\bcash\s+journals?\b/i, direct: true },
  { id: "clearing_control", requirement: /\bclearing\s+control\b/i, evidence: /\bclearing\s+control\b/i, direct: true },
  { id: "direct_debit", requirement: /\bdirect\s+debit\b/i, evidence: /\bdirect\s+debit\b/i, direct: true },
  { id: "installment_plan", requirement: /\binstallment\s+plans?\b/i, evidence: /\binstallment\s+plans?\b/i, direct: true },
  { id: "main_sub_transaction", requirement: /\bmain\s+and\s+sub\s+transactions?\b|\bmain\/sub\s+transactions?\b/i, evidence: /\bmain\s+and\s+sub\s+transactions?\b|\bmain\/sub\s+transactions?\b/i, direct: true },
  { id: "sap_c4c", requirement: /\b(?:sap\s+)?c4c\b/i, evidence: /\b(?:sap\s+)?c4c\b/i, direct: true },
  { id: "device_management", requirement: /\bdevice\s+management\b/i, evidence: /\bdevice\s+management\b/i, direct: true },
  { id: "data_migration", requirement: /\bdata\s+migration\b/i, evidence: /\bdata\s+migration\b/i, direct: true },
  { id: "sap_sd", requirement: /\bsap\s+sd\b|\bsales and distribution\b/i, evidence: /\bsap\s+sd\b|\bsales and distribution\b/i, direct: true },
  { id: "sap_le", requirement: /\bsap\s+le\b|\blogistics execution\b/i, evidence: /\bsap\s+le\b|\blogistics execution\b/i, direct: true },
  { id: "edi", requirement: /\b(?:edi|edifact|ansi\s*x12|idocs?)\b/i, evidence: /\b(?:edi|edifact|ansi\s*x12|idocs?)\b/i, direct: true },
  { id: "jit_jis", requirement: /\b(?:jit|jis|just.in.time|just.in.sequence)\b/i, evidence: /\b(?:jit|jis|just.in.time|just.in.sequence)\b/i, direct: true },
  { id: "rf", requirement: /\brf solutions?\b|\bradio frequency\b/i, evidence: /\brf solutions?\b|\bradio frequency\b/i, direct: true },
  { id: "cmir", requirement: /\bcmir\b/i, evidence: /\bcmir\b/i, direct: true },
  { id: "backflush", requirement: /\bbackflush\b/i, evidence: /\bbackflush\b/i, direct: true },
  { id: "mrp", requirement: /\bmrp\b|\bmaterial requirements planning\b/i, evidence: /\bmrp\b|\bmaterial requirements planning\b/i, direct: true },
]);

const LIST_INTRODUCTION_PATTERN = /^(.*?)(?:\bincluding\b|\bsuch as\b)\s+(.+?)(\s+to\s+(?:ensure|support|meet|deliver|provide)\b.*)?$/i;
const EXPLICIT_BLOCKER_REQUIREMENT_PATTERN = /\b(?:licen[cs](?:e|ed|ure)|registered|registration|certified|certification|security clearance|reliability status|work authori[sz]ation|legally (?:eligible|entitled|authorized) to work|red seal|journeyperson|journeyman|first aid|cpr|whmis)\b/i;
const SCHEDULE_LOCATION_REQUIREMENT_PATTERN = /\b(?:on[- ]?site|hybrid|remote|shift|weekends?|evenings?|overnight|travel|relocat|location|driver'?s? licen[cs]e)\b/i;
const LANGUAGE_REQUIREMENT_PATTERN = /\b(?:english|french|spanish|bilingual|language proficiency|fluent|fluency)\b/i;

function applicationRiskForRequirement(requirement) {
  if (requirement.evidence_match !== "missing") {
    return {
      gap_severity: "supported",
      application_impact: "Verified candidate evidence is available; review whether the wording reflects the candidate's actual contribution level.",
    };
  }
  if (requirement.priority === "preferred") {
    return {
      gap_severity: "preference",
      application_impact: "This is presented as a preference. It remains visible but does not become candidate experience.",
    };
  }
  if (requirement.priority === "required" && EXPLICIT_BLOCKER_REQUIREMENT_PATTERN.test(requirement.requirement)) {
    return {
      gap_severity: "verified_blocker",
      application_impact: "This appears to be an explicit mandatory credential or eligibility requirement with no supporting candidate evidence. Confirm it before treating the application as ready.",
    };
  }
  if (requirement.priority === "required") {
    return {
      gap_severity: "material_gap",
      application_impact: "This required capability has no supporting candidate evidence. Employers may waive requirements, but Gigscapes will not claim it for the candidate.",
    };
  }
  return {
    gap_severity: "development_gap",
    application_impact: "This responsibility is not evidenced in the current résumé. It may be learnable or adjacent, but it should not be presented as completed experience.",
  };
}

function requirementOrigin(requirement) {
  if (EXPLICIT_BLOCKER_REQUIREMENT_PATTERN.test(requirement.requirement)) return "credential";
  if (SCHEDULE_LOCATION_REQUIREMENT_PATTERN.test(requirement.requirement)) return "schedule_location_constraint";
  if (LANGUAGE_REQUIREMENT_PATTERN.test(requirement.requirement)) return "language_requirement";
  if (requirement.priority === "required") return "mandatory_qualification";
  if (requirement.priority === "preferred") return "preferred_qualification";
  if (requirement.priority === "responsibility") return "responsibility";
  return "other";
}

function requirementAssessmentMetadata(requirement) {
  const origin = requirementOrigin(requirement);
  const supported = requirement.evidence_match !== "missing";
  const importance = requirement.priority === "required"
    ? "mandatory"
    : requirement.priority === "preferred"
      ? "preferred"
      : requirement.priority === "responsibility"
        ? "contextual"
        : "unknown";
  const confidence = supported && requirement.evidence?.length
    ? "high"
    : requirement.priority === "context"
      ? "low"
      : "medium";

  if (requirement.evidence_match === "direct") {
    return {
      requirement_origin: origin,
      importance,
      confidence,
      reason_code: "verified_direct_evidence",
      assessment_explanation: "An exact candidate evidence excerpt directly supports this atomic requirement.",
      unproven: "",
      next_action: "Review the wording and contribution level, then keep or edit it without adding a new fact.",
    };
  }
  if (requirement.evidence_match === "adjacent") {
    return {
      requirement_origin: origin,
      importance,
      confidence,
      reason_code: "verified_adjacent_evidence",
      assessment_explanation: "Verified experience is closely related, but it does not establish the target-specific requirement as direct experience.",
      unproven: "The target-specific scope remains unverified.",
      next_action: "Keep the boundary visible or add only candidate-confirmed target-specific evidence.",
    };
  }
  if (requirement.evidence_match === "transferable") {
    return {
      requirement_origin: origin,
      importance,
      confidence,
      reason_code: "verified_transferable_evidence",
      assessment_explanation: "Verified experience demonstrates a relevant capability without proving equivalent target-role experience.",
      unproven: "Direct performance of this target requirement remains unverified.",
      next_action: "Use transferable positioning and do not present it as direct experience.",
    };
  }

  const missingMetadata = requirement.gap_severity === "verified_blocker"
    ? {
      reason_code: "missing_mandatory_credential_or_eligibility",
      assessment_explanation: "The posting presents this as an explicit mandatory credential or eligibility condition, and no supporting candidate evidence was found.",
      unproven: "The required credential or eligibility condition is not verified.",
      next_action: "Confirm candidate-held evidence before relying on this requirement, or keep it visible as a likely screening blocker.",
    }
    : requirement.gap_severity === "material_gap"
      ? {
        reason_code: "missing_required_capability",
        assessment_explanation: "The posting presents this as required, and no exact supporting candidate evidence was found.",
        unproven: "The required capability remains unsupported.",
        next_action: "Add candidate-confirmed evidence if it exists, otherwise keep the material gap visible.",
      }
      : requirement.gap_severity === "preference"
        ? {
          reason_code: "missing_preferred_qualification",
          assessment_explanation: "The posting presents this as preferred rather than mandatory, and no supporting candidate evidence was found.",
          unproven: "The preferred qualification remains unsupported.",
          next_action: "Keep it visible as a preference gap; never add it merely to improve keyword coverage.",
        }
        : {
          reason_code: "missing_responsibility_evidence",
          assessment_explanation: "This responsibility is stated in the posting, but the current candidate evidence does not prove it was performed.",
          unproven: "Performance of this responsibility remains unsupported.",
          next_action: "Add candidate-confirmed evidence if available, otherwise retain it as a development gap.",
        };

  return {
    requirement_origin: origin,
    importance,
    confidence,
    ...missingMetadata,
  };
}

function listItems(value) {
  const source = String(value || "").replace(/[().]/g, " ").replace(/\s+/g, " ").trim();
  if (!source.includes(",") && !/\s+and\s+/i.test(source) && !/\s*&\s*/.test(source)) return [];
  return source
    .split(/\s*,\s*|\s+and\s+|\s*&\s*/i)
    .map((item) => item.replace(/^(?:or|and)\s+/i, "").trim())
    .filter((item) => item && item.split(/\s+/).length <= 10);
}

function atomicRequirementValues(value, index) {
  const requirement = String(value?.requirement || "").replace(/\s+/g, " ").trim().slice(0, 500);
  if (!requirement) return [];
  if ((/\bsap\s+sd\b/i.test(requirement) || /\bsales and distribution\b/i.test(requirement))
    && (/\bsap\s+le\b/i.test(requirement) || /\blogistics execution\b/i.test(requirement))) {
    return ["SAP SD / Sales and Distribution capability", "SAP LE / Logistics Execution capability"].map((requirementText, atomicIndex) => ({
      ...value,
      id: `${String(value?.id || `R${index + 1}`).slice(0, 14)}.${atomicIndex + 1}`,
      requirement: requirementText,
      parent_requirement: requirement,
      atomic_index: atomicIndex,
    }));
  }
  const englishAndCollaboration = /\benglish\b/i.test(requirement)
    && /\b(?:interpersonal|stakeholders?|diverse teams?|cross-functional)\b/i.test(requirement);
  if (englishAndCollaboration) {
    const collaborationText = requirement.match(/\b(?:interpersonal|ability to work|work effectively|collaborat)[^.;]*/i)?.[0]
      || "Interpersonal and stakeholder collaboration";
    return ["English language proficiency", collaborationText].map((requirementText, atomicIndex) => ({
      ...value,
      id: `${String(value?.id || `R${index + 1}`).slice(0, 14)}.${atomicIndex + 1}`,
      requirement: requirementText,
      parent_requirement: requirement,
      atomic_index: atomicIndex,
    }));
  }
  const explicitParts = requirement.split(/\s*;\s*|\s*\n\s*/).filter(Boolean);
  const parts = explicitParts.length > 1 ? explicitParts : [requirement];
  const atomic = [];
  for (const part of parts) {
    const listMatch = part.match(LIST_INTRODUCTION_PATTERN);
    const prefixedListMatch = part.match(/^(.*?\b(?:proficiency|knowledge|experience|expertise|familiarity|understanding)\s+(?:in|of|with)\s+)(.+)$/i);
    const activeMatch = listMatch || prefixedListMatch;
    const items = activeMatch ? listItems(activeMatch[2]) : [];
    if (items.length >= 2) {
      for (const item of items) {
        const prefix = prefixedListMatch ? prefixedListMatch[1] : "";
        atomic.push(`${prefix}${item}${listMatch?.[3] || ""}`.trim());
      }
    } else {
      atomic.push(part);
    }
  }
  return atomic.slice(0, 12).map((requirementText, atomicIndex) => ({
    ...value,
    id: atomic.length > 1 ? `${String(value?.id || `R${index + 1}`).slice(0, 14)}.${atomicIndex + 1}` : value?.id,
    requirement: requirementText,
    parent_requirement: atomic.length > 1 ? requirement : "",
    atomic_index: atomicIndex,
  }));
}

function requirementTokens(value) {
  return new Set(normalizeEvidenceText(value)
    .split(" ")
    .filter((token) => token.length > 2 && !STOPWORDS.has(token)));
}

function requirementSimilarity(left, right) {
  const leftText = normalizeEvidenceText(left);
  const rightText = normalizeEvidenceText(right);
  if (!leftText || !rightText) return 0;
  if (leftText === rightText) return 1;
  const leftTokens = requirementTokens(leftText);
  const rightTokens = requirementTokens(rightText);
  const smaller = Math.min(leftTokens.size, rightTokens.size);
  if (smaller < 3) return 0;
  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return overlap / smaller;
}

function defaultRequirementKeywords(requirement) {
  const normalized = normalizeEvidenceText(requirement);
  const domainPhrases = [
    ["SAP ISU FICA", /\bsap\s+is[- ]?u\s+fi[- ]?ca\b|\bsap\s+isu\s+fica\b/i],
    ["SAP IS-U", /\bsap\s+is[- ]?u\b/i],
    ["SAP S/4HANA for Utilities", /\bsap\s+s\/?4hana\s+for\s+utilities\b/i],
    ["Meter to Cash", /\bmeter\s+to\s+cash\b/i],
    ["Data migration", /\bdata\s+migration\b/i],
    ["Functional specifications", /\bfunctional\s+specifications?\b/i],
    ["AS-IS/TO-BE", /\bas\s+is\s+to\s+be\b/i],
    ["Business Blueprint", /\bbusiness\s+blueprints?\b/i],
  ].filter(([, pattern]) => pattern.test(normalized)).map(([label]) => label);
  return uniqueStrings([...domainPhrases, ...extractPostingKeywords(requirement)], 8);
}

export function structuredPostingRequirementInventory(structuredBrief) {
  if (!structuredBrief || typeof structuredBrief !== "object") return [];
  const groups = [
    ["Q", "required", structuredBrief.required_qualifications],
    ["D", "responsibility", structuredBrief.responsibilities],
    ["P", "preferred", structuredBrief.preferred_qualifications],
  ];
  const seeds = [];
  for (const [prefix, priority, values] of groups) {
    for (const [index, rawValue] of (Array.isArray(values) ? values : []).entries()) {
      const requirement = String(rawValue || "").replace(/\s+/g, " ").trim().slice(0, 500);
      if (!requirement) continue;
      if (seeds.some((seed) => requirementSimilarity(seed.requirement, requirement) >= 0.72)) continue;
      seeds.push({
        id: `${prefix}${index + 1}`,
        requirement,
        priority,
        evidence_match: "missing",
        resume_evidence: "",
        safe_language: "",
        keywords: defaultRequirementKeywords(requirement),
      });
    }
  }
  return seeds
    .flatMap((seed, index) => atomicRequirementValues(seed, index))
    .slice(0, 40);
}

function mergeRequirementInventory(modelRequirements, reviewedInventory) {
  const raw = Array.isArray(modelRequirements) ? modelRequirements.filter(Boolean) : [];
  const inventory = Array.isArray(reviewedInventory) ? reviewedInventory.filter(Boolean) : [];
  if (!inventory.length) return raw;
  const used = new Set();
  const merged = inventory.map((seed) => {
    let bestIndex = -1;
    let bestScore = 0;
    raw.forEach((candidate, index) => {
      if (used.has(index)) return;
      const score = requirementSimilarity(seed.requirement, candidate?.requirement);
      if (score > bestScore) {
        bestIndex = index;
        bestScore = score;
      }
    });
    if (bestIndex < 0 || bestScore < 0.58) return seed;
    used.add(bestIndex);
    const candidate = raw[bestIndex];
    return {
      ...candidate,
      id: seed.id,
      requirement: seed.requirement,
      priority: seed.priority,
      keywords: uniqueStrings([...(seed.keywords || []), ...(candidate.keywords || [])], 8),
    };
  });
  for (const [index, candidate] of raw.entries()) {
    if (used.has(index) || !candidate?.requirement) continue;
    if (merged.some((seed) => requirementSimilarity(seed.requirement, candidate.requirement) >= 0.72)) continue;
    merged.push(candidate);
  }
  return merged.slice(0, 40);
}

export function normalizeEvidenceText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9+#.%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStrings(values, limit = 40) {
  const seen = new Set();
  const result = [];
  for (const value of values || []) {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    const key = normalizeEvidenceText(text);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(text);
    if (result.length >= limit) break;
  }
  return result;
}

export function assessPostingCompleteness(postingText, structuredBrief = null, provenance = {}) {
  const text = String(postingText || "").trim();
  const words = text.match(/[\p{L}\p{N}+#.%/-]+/gu) || [];
  const wordCount = words.length;
  const sourceReview = structuredBrief?.source_review;
  const responsibilityCount = structuredBrief?.responsibilities?.length || 0;
  const qualificationCount = (structuredBrief?.required_qualifications?.length || 0)
    + (structuredBrief?.preferred_qualifications?.length || 0);
  const structuredSectionsComplete = responsibilityCount >= 2 && qualificationCount >= 2;
  const structuredEndingConfirmed = structuredSectionsComplete
    && (sourceReview?.user_confirmed_complete === true || sourceReview?.appears_complete === true);
  const rawAbruptEnding = /(?:\.{3}|…|\b[a-z]{1,5}…?)$/i.test(text)
    || (text.length > 0 && !/[.!?)\]"']$/.test(text));
  const abruptEnding = rawAbruptEnding && !structuredEndingConfirmed;
  const hasResponsibilities = Boolean(structuredBrief?.responsibilities?.length)
    || /\b(responsibilit(?:y|ies)|what you(?:'|’)ll do|duties|day.to.day|you will)\b/i.test(text);
  const hasQualifications = Boolean(structuredBrief?.required_qualifications?.length)
    || Boolean(structuredBrief?.preferred_qualifications?.length)
    || /\b(requirement|qualification|experience required|what you bring|must have|preferred)\b/i.test(text);

  let status = "complete";
  let reason = "The posting contains enough role context to support detailed tailoring.";
  if (!text || wordCount < 35) {
    status = "insufficient";
    reason = "Only a title or very short summary is available; important responsibilities and qualifications may be missing.";
  } else if ((wordCount < 140 && !structuredEndingConfirmed) || abruptEnding || (!hasResponsibilities && !hasQualifications && wordCount < 260)) {
    status = "partial";
    reason = abruptEnding
      ? "The saved posting appears to end abruptly, so the technology stack or qualifications may be incomplete."
      : "The saved posting looks like an aggregator summary rather than a complete job description.";
  }

  const screenshotSetUnconfirmed = sourceReview?.mode === "screenshots"
    && sourceReview.user_confirmed_complete !== true;
  const unresolvedSourceConflicts = Boolean(sourceReview?.conflicts?.length)
    && sourceReview.conflicts_resolved !== true;
  if (screenshotSetUnconfirmed) {
    status = "partial";
    reason = "The screenshot set has not been confirmed to include the final responsibilities and qualifications page.";
  } else if (unresolvedSourceConflicts) {
    status = "partial";
    reason = "The extracted screenshots contain conflicting job details that must be reviewed before final tailoring.";
  }

  const fitAllowed = status === "complete" && hasResponsibilities && hasQualifications;
  const readinessStatus = fitAllowed
    ? "reviewed_complete"
    : status === "complete"
      ? "preliminary"
      : "needs_full_posting";
  const readinessReason = fitAllowed
    ? "The saved posting includes meaningful responsibilities and qualifications, so candidate fit can be assessed."
    : status === "complete"
      ? "The posting has substantial text, but it does not clearly include both responsibilities and qualifications."
      : reason;

  return {
    status,
    reason,
    word_count: wordCount,
    has_responsibilities: hasResponsibilities,
    has_qualifications: hasQualifications,
    appears_truncated: abruptEnding,
    source_review_complete: !screenshotSetUnconfirmed,
    unresolved_source_conflicts: unresolvedSourceConflicts,
    source: String(provenance.source || structuredBrief?.source || "saved_listing"),
    source_status: String(provenance.descriptionStatus || "unknown"),
    readiness_status: readinessStatus,
    readiness_reason: readinessReason,
    fit_allowed: fitAllowed,
    application_ready_allowed: fitAllowed,
    confidence: fitAllowed ? "available" : "unavailable",
    output_mode: fitAllowed ? "final_candidate" : "preliminary",
  };
}

export function extractPostingKeywords(postingText, targetTitle = "") {
  const text = String(postingText || "");
  const normalized = normalizeEvidenceText(`${targetTitle} ${text}`);
  const phrases = HIGH_SIGNAL_PHRASES.filter((phrase) => normalized.includes(normalizeEvidenceText(phrase)));
  const acronyms = [...text.matchAll(/\b[A-Z][A-Z0-9.+#/-]{1,12}\b/g)].map((match) => match[0]);
  const titleTerms = normalizeEvidenceText(targetTitle)
    .split(" ")
    .filter((term) => term.length > 2 && !STOPWORDS.has(term));
  return uniqueStrings([...phrases, ...acronyms, ...titleTerms], 30);
}

function excerptSupported(excerpt, baseResume) {
  const evidence = normalizeEvidenceText(excerpt);
  if (!evidence || evidence.length < 12) return false;
  return normalizeEvidenceText(baseResume).includes(evidence);
}

function inferEvidenceSection(lines, lineIndex) {
  const headings = /^(?:profile|summary|skills|experience|professional experience|employment|projects|education|training|certifications|languages)$/i;
  for (let index = lineIndex; index >= 0; index -= 1) {
    const candidate = String(lines[index] || "").replace(/[:|]+$/g, "").trim();
    if (headings.test(candidate)) return candidate.toLowerCase();
  }
  return "base resume";
}

function supportingCandidateNote(excerpt, candidateNotes = []) {
  const evidence = normalizeEvidenceText(excerpt);
  if (!evidence || evidence.length < 12) return null;
  return candidateNotes.find((note) => {
    if (!note?.user_confirmed || note.declined) return false;
    const noteText = normalizeEvidenceText([note.answer, note.context, note.employer_or_project, note.approximate_date].filter(Boolean).join(" "));
    return noteText.includes(evidence) || evidence.includes(normalizeEvidenceText(note.answer));
  }) || null;
}

function evidenceCitation(excerpt, baseResume, candidateNotes = []) {
  const candidateNote = supportingCandidateNote(excerpt, candidateNotes);
  if (candidateNote) {
    return {
      source: "candidate_note",
      evidence_id: candidateNote.id,
      requirement_id: candidateNote.requirement_id,
      section: candidateNote.employer_or_project || candidateNote.context || "candidate answer",
      line_index: null,
      excerpt: String(excerpt || "").replace(/\s+/g, " ").trim(),
      contribution_level: candidateNote.contribution_level || "supported",
    };
  }
  if (!excerptSupported(excerpt, baseResume)) return null;
  const lines = String(baseResume || "").split(/\r?\n/);
  const evidence = normalizeEvidenceText(excerpt);
  let lineIndex = lines.findIndex((line) => {
    const normalizedLine = normalizeEvidenceText(line);
    return normalizedLine.length >= 8 && (normalizedLine.includes(evidence) || evidence.includes(normalizedLine));
  });
  if (lineIndex < 0) {
    const anchor = evidence.split(" ").filter((term) => term.length > 3).slice(0, 4);
    lineIndex = lines.findIndex((line) => {
      const normalizedLine = normalizeEvidenceText(line);
      return anchor.length >= 2 && anchor.every((term) => normalizedLine.includes(term));
    });
  }
  return {
    source: "base_resume",
    section: lineIndex >= 0 ? inferEvidenceSection(lines, lineIndex) : "base resume",
    line_index: lineIndex >= 0 ? lineIndex + 1 : null,
    excerpt: String(excerpt || "").replace(/\s+/g, " ").trim(),
  };
}

function strictConceptsForRequirement(requirement) {
  return STRICT_EVIDENCE_CONCEPTS.filter((concept) => concept.requirement.test(requirement));
}

function semanticEvidenceMatch(requirement, excerpt) {
  const concepts = strictConceptsForRequirement(requirement);
  if (!concepts.length) return { valid: true, classification: null, concepts: [] };
  const valid = concepts.every((concept) => concept.evidence.test(excerpt));
  if (!valid) return { valid: false, classification: "missing", concepts: concepts.map((concept) => concept.id) };
  const classification = concepts.some((concept) => concept.directEvidence && !concept.directEvidence.test(excerpt))
    ? "adjacent"
    : concepts.every((concept) => concept.direct === true)
      ? "direct"
      : null;
  return { valid: true, classification, concepts: concepts.map((concept) => concept.id) };
}

function lineScore(requirement, line) {
  const requirementTerms = new Set(normalizeEvidenceText(requirement).split(" ").filter((term) => term.length > 3 && !STOPWORDS.has(term)));
  const lineTerms = new Set(normalizeEvidenceText(line).split(" ").filter(Boolean));
  return [...requirementTerms].reduce((score, term) => score + (lineTerms.has(term) ? 1 : 0), 0);
}

function deterministicEvidence(requirement, baseResume) {
  const concepts = strictConceptsForRequirement(requirement);
  if (!concepts.length) return null;
  const lines = String(baseResume || "").split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const candidates = lines
    .filter((line) => concepts.every((concept) => concept.evidence.test(line)))
    .map((line) => ({ line, score: lineScore(requirement, line) }))
    .sort((left, right) => right.score - left.score || right.line.length - left.line.length);
  if (!candidates.length) return null;
  const excerpt = candidates[0].line;
  const semantic = semanticEvidenceMatch(requirement, excerpt);
  return {
    excerpt,
    classification: semantic.classification || "adjacent",
    concepts: semantic.concepts,
  };
}

function cleanRequirement(value, index, baseResume, candidateNotes = []) {
  const requirement = String(value?.requirement || "").replace(/\s+/g, " ").trim().slice(0, 500);
  if (!requirement) return null;
  const requestedMatch = ["direct", "adjacent", "transferable", "missing"].includes(value?.evidence_match)
    ? value.evidence_match
    : "missing";
  const resumeEvidence = String(value?.resume_evidence || "").replace(/\s+/g, " ").trim().slice(0, 700);
  const excerptIsSupported = excerptSupported(resumeEvidence, baseResume)
    || Boolean(supportingCandidateNote(resumeEvidence, candidateNotes));
  const semantic = semanticEvidenceMatch(requirement, resumeEvidence);
  const deterministic = deterministicEvidence(requirement, baseResume);
  const requestedSupported = requestedMatch !== "missing" && excerptIsSupported && semantic.valid;
  const evidenceMatch = requestedSupported
    ? semantic.classification || requestedMatch
    : deterministic?.classification || "missing";
  const supportedEvidence = requestedSupported ? resumeEvidence : deterministic?.excerpt || "";
  const citation = evidenceMatch !== "missing"
    ? evidenceCitation(supportedEvidence, baseResume, candidateNotes)
    : null;
  const cleaned = {
    id: String(value?.id || `R${index + 1}`).slice(0, 20),
    requirement,
    parent_requirement: String(value?.parent_requirement || "").replace(/\s+/g, " ").trim().slice(0, 500),
    atomic_index: Number.isInteger(value?.atomic_index) ? value.atomic_index : 0,
    priority: ["required", "preferred", "responsibility", "context"].includes(value?.priority)
      ? value.priority
      : "context",
    evidence_match: evidenceMatch,
    resume_evidence: evidenceMatch !== "missing" ? supportedEvidence : "",
    evidence: citation ? [citation] : [],
    match_basis: evidenceMatch === "missing"
      ? "No exact candidate evidence satisfies this atomic requirement."
      : deterministic && !requestedSupported
        ? `Verified from an exact résumé line using ${deterministic.concepts.join(", ").replaceAll("_", " ")} evidence.`
        : "Verified from the exact evidence excerpt supplied for this requirement.",
    safe_language: evidenceMatch !== "missing"
      ? String(value?.safe_language || requirement).replace(/\s+/g, " ").trim().slice(0, 500)
      : "",
    keywords: uniqueStrings(value?.keywords, 8),
  };
  const assessed = { ...cleaned, ...applicationRiskForRequirement(cleaned) };
  return { ...assessed, ...requirementAssessmentMetadata(assessed) };
}

function coverageCounts(requirements) {
  const counts = { direct: 0, adjacent: 0, transferable: 0, missing: 0 };
  for (const requirement of requirements) counts[requirement.evidence_match] += 1;
  return counts;
}

function candidateFacingText(value, fallback, limit = 700) {
  return String(value || fallback || "")
    .replace(/because\s+fit_allowed\s+is\s+false\s+per\s+the\s+deterministic\s+posting\s+assessment,?\s*/gi, "Because the posting is not yet verified as complete, ")
    .replace(/\bfit_allowed\b/gi, "posting readiness")
    .replace(/\bapplication_ready_allowed\b/gi, "application readiness")
    .replace(/\bdeterministic posting assessment\b/gi, "posting-readiness check")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

function calibrateFit(requirements, requestedPath) {
  const core = requirements.filter((requirement) => ["required", "responsibility"].includes(requirement.priority));
  const assessed = core.length ? core : requirements;
  const counts = coverageCounts(assessed);
  const total = assessed.length;
  const supported = counts.direct + counts.adjacent + counts.transferable;
  const directRate = total ? counts.direct / total : 0;
  const adjacentEvidence = counts.direct + counts.adjacent;
  const adjacentRate = total ? adjacentEvidence / total : 0;
  const domainAdjacentEvidence = assessed.filter((requirement) => (
    ["direct", "adjacent"].includes(requirement.evidence_match)
      && !/\b(?:bachelor|degree|english|communication|interpersonal|stakeholders?|diverse teams?|team player|problem solv|organized|outcomes? driven)\b/i.test(requirement.requirement)
  )).length;
  const missingRate = total ? counts.missing / total : 1;
  const weightedRate = total
    ? (counts.direct + counts.adjacent * 0.72 + counts.transferable * 0.32) / total
    : 0;
  let path = requestedPath;
  if (directRate >= 0.6 && weightedRate >= 0.72 && missingRate <= 0.2) path = "direct";
  else if (weightedRate >= 0.45 && missingRate <= 0.45) path = "adjacent";
  else if (adjacentEvidence >= 3 && adjacentRate >= 0.2 && domainAdjacentEvidence >= 2) path = "adjacent";
  else path = "career_change";
  const verifiedBlockerCount = assessed.filter((requirement) => requirement.gap_severity === "verified_blocker").length;
  const readinessStatus = verifiedBlockerCount > 0
    ? "significant_gap"
    : path === "direct" && counts.missing === 0
    ? "strong_fit"
    : path !== "career_change" && missingRate <= 0.35
      ? "credible_stretch"
      : "significant_gap";
  return { path, readinessStatus, counts, total, supported, missingRate, verifiedBlockerCount };
}

function calibratedFitReason(calibration) {
  if (!calibration.total) return "The posting did not yield enough atomic requirements for a dependable candidate-fit judgment.";
  const { counts, total, supported } = calibration;
  return `Verified résumé evidence supports ${supported} of ${total} core requirements: ${counts.direct} direct, ${counts.adjacent} adjacent, ${counts.transferable} transferable, and ${counts.missing} unsupported.`;
}

function calibratedLevel(rawLevel, path) {
  const level = String(rawLevel || "").replace(/\s+/g, " ").trim().slice(0, 160);
  if (path !== "career_change") return level || "Role-aligned";
  if (!level || /\b(?:senior|lead|principal|director|manager|expert)\b/i.test(level)) return "Transitional or entry-level positioning";
  return level;
}

function applicationOutlook(requirements, gapCounts, candidateFit, postingAssessment) {
  const evidenceCounts = coverageCounts(requirements);
  const coreRequirements = requirements.filter((requirement) => ["required", "responsibility"].includes(requirement.priority));
  const coreInventory = coreRequirements.length ? coreRequirements : requirements;
  const coreEvidenceCounts = coverageCounts(coreInventory);
  const coreMaterialGaps = coreInventory.filter((requirement) => requirement.gap_severity === "material_gap").length;
  const coreBlockers = coreInventory.filter((requirement) => requirement.gap_severity === "verified_blocker").length;
  const coreMissingRate = coreInventory.length ? coreEvidenceCounts.missing / coreInventory.length : 1;
  const counts = {
    verified_strengths: evidenceCounts.direct,
    related_evidence: evidenceCounts.adjacent + evidenceCounts.transferable,
    material_gaps: gapCounts.material_gap,
    likely_blockers: gapCounts.verified_blocker,
    preferences: gapCounts.preference,
    development_gaps: gapCounts.development_gap,
    total: requirements.length,
    core_total: coreInventory.length,
    core_supported: coreEvidenceCounts.direct + coreEvidenceCounts.adjacent + coreEvidenceCounts.transferable,
  };
  const confidence = postingAssessment.fit_allowed === true
    ? candidateFit.confidence || (requirements.length >= 5 ? "high" : "medium")
    : "unavailable";

  if (postingAssessment.fit_allowed !== true || requirements.length === 0) {
    return {
      status: "assessment_incomplete",
      label: "Assessment incomplete",
      confidence,
      reason: postingAssessment.readiness_reason || postingAssessment.reason || "Review the complete posting before judging candidate fit.",
      what_would_change: "Provide and review the complete responsibilities and qualifications.",
      counts,
    };
  }
  if (coreBlockers > 0) {
    return {
      status: "likely_screening_blocker",
      label: "Likely screening blocker",
      confidence,
      reason: `${coreBlockers} explicit mandatory credential or eligibility requirement${coreBlockers === 1 ? " has" : "s have"} no supporting evidence.`,
      what_would_change: "Candidate-confirmed evidence of the required credential or eligibility condition.",
      counts,
    };
  }
  if (coreMaterialGaps > 0) {
    const highRisk = coreEvidenceCounts.direct <= coreMaterialGaps || coreMissingRate >= 0.45;
    return {
      status: highRisk ? "high_application_risk" : "viable_transition_material_gaps",
      label: highRisk ? "High application risk" : "Viable transition with material gaps",
      confidence,
      reason: `${coreMaterialGaps} core required capabilit${coreMaterialGaps === 1 ? "y remains" : "ies remain"} unsupported by exact candidate evidence.`,
      what_would_change: "Candidate-confirmed evidence that directly or honestly relates to the unsupported required capabilities.",
      counts,
    };
  }
  if (candidateFit.status === "strong" && evidenceCounts.missing === 0) {
    return {
      status: "strong_verified_alignment",
      label: "Strong verified alignment",
      confidence,
      reason: "The analyzed requirements are supported without an explicit mandatory blocker or material gap.",
      what_would_change: "Continue reviewing wording and contribution level before applying.",
      counts,
    };
  }
  return {
    status: "viable_manageable_gaps",
    label: "Viable with manageable gaps",
    confidence,
    reason: gapCounts.development_gap || gapCounts.preference
      ? "No explicit mandatory blocker was found; development or preference gaps remain visible."
      : "Verified adjacent or transferable evidence supports a credible application without claiming equivalence.",
    what_would_change: "Additional candidate-confirmed direct evidence may strengthen the application, but unsupported requirements will remain visible.",
    counts,
  };
}

export function sanitizeTailoringAnalysis(rawAnalysis, baseResume, deterministicPostingAssessment, fallbackKeywords = [], candidateNotes = [], reviewedRequirementInventory = []) {
  const raw = rawAnalysis && typeof rawAnalysis === "object" ? rawAnalysis : {};
  const requirements = mergeRequirementInventory(raw.requirements, reviewedRequirementInventory)
    .flatMap((value, index) => atomicRequirementValues(value, index))
    .slice(0, 40)
    .map((value, index) => cleanRequirement(value, index, baseResume, candidateNotes))
    .filter(Boolean);
  const coverage = coverageCounts(requirements);

  const transferableSkills = (Array.isArray(raw.verified_transferable_skills) ? raw.verified_transferable_skills : [])
    .slice(0, 20)
    .map((value) => ({
      skill: String(value?.skill || "").replace(/\s+/g, " ").trim().slice(0, 120),
      resume_evidence: String(value?.resume_evidence || "").replace(/\s+/g, " ").trim().slice(0, 700),
    }))
    .filter((value) => value.skill && (
      excerptSupported(value.resume_evidence, baseResume)
      || Boolean(supportingCandidateNote(value.resume_evidence, candidateNotes))
    ));

  const requestedPath = ["direct", "adjacent", "career_change"].includes(raw.fit_assessment?.path)
    ? raw.fit_assessment.path
    : "career_change";
  const calibration = calibrateFit(requirements, requestedPath);
  const path = calibration.path;

  const postingAssessment = {
    ...deterministicPostingAssessment,
    model_note: String(raw.posting_assessment?.reason || "").replace(/\s+/g, " ").trim().slice(0, 500),
  };

  const fitAllowed = postingAssessment.fit_allowed === true;
  let readinessStatus = "needs_full_posting";
  if (fitAllowed) {
    readinessStatus = calibration.readinessStatus;
  }

  const fitReason = calibratedFitReason(calibration);

  const candidateFit = fitAllowed
    ? {
      status: readinessStatus === "strong_fit" ? "strong" : readinessStatus === "credible_stretch" ? "adjacent" : "gap",
      path,
      confidence: calibration.total >= 5 ? "high" : "medium",
      reason: fitReason,
    }
    : {
      status: "not_assessed",
      path: null,
      confidence: "unavailable",
      reason: postingAssessment.readiness_reason || postingAssessment.reason,
    };

  const verifiedKeywords = uniqueStrings([
    ...(Array.isArray(raw.target_keywords) ? raw.target_keywords : []),
    ...requirements.flatMap((requirement) => requirement.keywords),
    ...fallbackKeywords,
  ], 40);

  const candidateQuestions = uniqueStrings(raw.candidate_questions, 5);
  const missingRequirements = requirements.filter((requirement) => requirement.evidence_match === "missing");
  const gapCounts = requirements.reduce((counts, requirement) => {
    counts[requirement.gap_severity] = (counts[requirement.gap_severity] || 0) + 1;
    return counts;
  }, {
    supported: 0,
    verified_blocker: 0,
    material_gap: 0,
    development_gap: 0,
    preference: 0,
  });
  const applicationRisk = gapCounts.verified_blocker > 0
    ? "high"
    : gapCounts.material_gap > 0
      ? "elevated"
      : gapCounts.development_gap > 0 || gapCounts.preference > 0
        ? "review"
        : "low";
  const outlook = applicationOutlook(requirements, gapCounts, candidateFit, postingAssessment);
  const evidenceQuestions = candidateQuestions.map((question, index) => {
    const prefixedId = question.match(/^\s*\[([^\]]+)\]\s*/)?.[1];
    const requirement = requirements.find((item) => item.id === prefixedId)
      || missingRequirements[index]
      || requirements[index]
      || null;
    return {
      id: `evidence-question-${prefixedId || requirement?.id || index + 1}`,
      requirement_id: prefixedId || requirement?.id || `Q${index + 1}`,
      requirement: requirement?.requirement || "Additional relevant evidence",
      question: question.replace(/^\s*\[[^\]]+\]\s*/, "").trim(),
    };
  });

  return {
    posting_assessment: postingAssessment,
    posting_readiness: {
      status: postingAssessment.readiness_status || (fitAllowed ? "reviewed_complete" : "needs_full_posting"),
      reason: postingAssessment.readiness_reason || postingAssessment.reason,
      description_status: postingAssessment.status,
      fit_allowed: fitAllowed,
      application_ready_allowed: postingAssessment.application_ready_allowed === true,
      confidence: fitAllowed ? "available" : "unavailable",
      output_mode: fitAllowed ? "final_candidate" : "preliminary",
    },
    candidate_fit: candidateFit,
    fit_assessment: {
      path,
      recommended_level: calibratedLevel(raw.fit_assessment?.recommended_level, path),
      note: path === requestedPath
        ? candidateFacingText(raw.fit_assessment?.note, fitReason, 600)
        : fitReason,
    },
    content_strategy: path,
    readiness: {
      status: readinessStatus,
      reason: candidateFit.reason,
    },
    requirements,
    coverage,
    core_coverage: {
      ...calibration.counts,
      total: calibration.total,
      supported: calibration.supported,
    },
    requirement_summary: {
      total: requirements.length,
      core_total: calibration.total,
      preferred_or_context_total: Math.max(0, requirements.length - calibration.total),
    },
    gap_summary: {
      application_risk: applicationRisk,
      counts: gapCounts,
      outlook,
      note: gapCounts.verified_blocker > 0
        ? "One or more explicit mandatory credentials or eligibility requirements have no supporting evidence. The candidate may still review the opportunity, but Gigscapes will not call the résumé application-ready."
        : gapCounts.material_gap > 0
          ? "Required capabilities remain unsupported. Employers may waive requirements, but the résumé must not claim them."
          : "No explicit mandatory blocker was detected. Review every requirement because an employer may weigh it differently.",
    },
    verified_transferable_skills: transferableSkills,
    target_keywords: verifiedKeywords,
    missing_evidence: uniqueStrings([
      ...requirements.filter((requirement) => requirement.evidence_match === "missing").map((requirement) => requirement.requirement),
      ...(Array.isArray(raw.missing_evidence) ? raw.missing_evidence : []),
    ], 12),
    prohibited_claims: uniqueStrings(raw.prohibited_claims, 12),
    candidate_questions: candidateQuestions,
    evidence_questions: evidenceQuestions,
  };
}

function exportedResumeText(resumeData) {
  return [
    resumeData?.title,
    resumeData?.profile,
    ...(resumeData?.skills || []),
    ...(resumeData?.experience || []).flatMap((entry) => entry?.bullets || []),
    ...(resumeData?.projects || []).flatMap((project) => [project?.name, project?.description, ...(project?.bullets || [])]),
    ...(resumeData?.training || []).flatMap((training) => [training?.name, training?.provider, training?.dates]),
  ].filter(Boolean).join(" ");
}

export function findSemanticIntegrityIssues(resumeData, baseResume, analysis, targetTitle, { isTrades = false } = {}) {
  const base = normalizeEvidenceText(baseResume);
  const output = normalizeEvidenceText(exportedResumeText(resumeData));
  const title = normalizeEvidenceText(resumeData?.title);
  const target = normalizeEvidenceText(targetTitle);
  const verifiedSkills = new Set((analysis?.verified_transferable_skills || []).map((item) => normalizeEvidenceText(item.skill)));
  const unsupported_skills = uniqueStrings((resumeData?.skills || []).filter((skill) => {
    const normalizedSkill = normalizeEvidenceText(skill);
    return normalizedSkill && !base.includes(normalizedSkill) && !verifiedSkills.has(normalizedSkill);
  }), 30).map((skill) => ({ skill }));

  const unsupported_projects = (resumeData?.projects || []).flatMap((project) => {
    const name = String(project?.name || "").trim();
    const normalizedName = normalizeEvidenceText(name);
    if (!normalizedName || base.includes(normalizedName)) return [];
    return [{ name }];
  });

  const unsupported_training = (resumeData?.training || []).flatMap((item) => {
    const name = String(item?.name || "").trim();
    const normalizedName = normalizeEvidenceText(name);
    if (!normalizedName || base.includes(normalizedName)) return [];
    return [{ name }];
  });

  const unsupported_target_terms = [];
  const titleAndSkills = normalizeEvidenceText([resumeData?.title, ...(resumeData?.skills || [])].join(" "));
  for (const requirement of analysis?.requirements || []) {
    if (requirement.evidence_match !== "missing") continue;
    for (const keyword of requirement.keywords || []) {
      const normalizedKeyword = normalizeEvidenceText(keyword);
      if (normalizedKeyword.length < 4 || base.includes(normalizedKeyword)) continue;
      if (titleAndSkills.includes(normalizedKeyword)) unsupported_target_terms.push({ term: keyword, requirement: requirement.requirement });
    }
  }

  const unsupported_positioning = [];
  if (analysis?.fit_assessment?.path === "career_change" && target && title.includes(target)) {
    const allowedTradeCandidate = isTrades && /\b(candidate|helper)\b/.test(title);
    if (!allowedTradeCandidate) unsupported_positioning.push({ title: resumeData?.title, target: targetTitle });
  }

  const risky_claims = [];
  const rawOutput = exportedResumeText(resumeData);
  for (const pattern of [
    /\btranslat(?:e|es|ed|ing) directly\b/gi,
    /\bdirectly analogous\b/gi,
    /\bcomparable to\b/gi,
    /\bequivalent to\b/gi,
    /\b(?:closely )?parallels?\b/gi,
    /\banalogous to\b/gi,
    /\bshare(?:s|d|ing)?\b[^.!?\n]{0,140}\b(?:sap\s+)?is[- ]?u\s+fi[- ]?ca\b/gi,
    /\b(?:same|shared)\b[^.!?\n]{0,100}\b(?:discipline|foundation|foundational structures?|engine|constructs?)\b[^.!?\n]{0,100}\b(?:sap\s+)?is[- ]?u\s+fi[- ]?ca\b/gi,
  ]) {
    for (const match of rawOutput.matchAll(pattern)) risky_claims.push({ claim: match[0] });
  }
  for (const claim of analysis?.prohibited_claims || []) {
    const normalizedClaim = normalizeEvidenceText(claim);
    if (normalizedClaim.length >= 8 && output.includes(normalizedClaim)) risky_claims.push({ claim });
  }

  return {
    unsupported_skills,
    unsupported_projects,
    unsupported_training,
    unsupported_target_terms,
    unsupported_positioning,
    risky_claims,
  };
}
