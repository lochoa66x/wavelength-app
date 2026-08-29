import { findSemanticIntegrityIssues } from "./tailoringEvidence.js";
import { isPlaceholderIdentity } from "./resumeQuality.js";
import { buildWritingReview } from "./resumeWriting.js";

function normalized(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9%+$]+/g, " ")
    .trim();
}

const HISTORY_TOKEN_ALIASES = new Map([
  ["sr", ["senior"]],
  ["snr", ["senior"]],
  ["jr", ["junior"]],
  ["mgr", ["manager"]],
  ["mgmt", ["management"]],
  ["dir", ["director"]],
  ["assoc", ["associate"]],
  ["asst", ["assistant"]],
  ["admin", ["administrator"]],
  ["coord", ["coordinator"]],
  ["dev", ["developer"]],
  ["eng", ["engineer"]],
  ["engr", ["engineer"]],
  ["spec", ["specialist"]],
]);

const HISTORY_JOINERS = new Set(["a", "an", "and", "at", "for", "of", "the"]);
const COMPANY_SUFFIXES = new Set([
  "co", "company", "corp", "corporation", "inc", "incorporated", "llc", "limited", "ltd", "plc",
]);

function historyTokens(value, field) {
  return normalized(value)
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((token) => HISTORY_TOKEN_ALIASES.get(token) || [token])
    .filter((token) => !HISTORY_JOINERS.has(token))
    .filter((token) => field !== "company" || !COMPANY_SUFFIXES.has(token));
}

function historySegments(baseResume) {
  return String(baseResume || "")
    .split(/\r?\n/)
    .flatMap((line) => {
      const parts = line.split(/\s+(?:[|•·]|[—–])\s+|\t+|\s{2,}/).map((part) => part.trim()).filter(Boolean);
      return parts.length ? parts : [line];
    })
    .filter(Boolean);
}

function historyFieldSupported(value, baseResume, field) {
  const candidateTokens = historyTokens(value, field);
  if (!candidateTokens.length) return true;

  const candidatePhrase = candidateTokens.join(" ");
  const basePhrase = historyTokens(baseResume, field).join(" ");
  if (basePhrase.includes(candidatePhrase)) return true;

  return historySegments(baseResume).some((segment) => {
    const sourceTokens = new Set(historyTokens(segment, field));
    return candidateTokens.every((token) => sourceTokens.has(token));
  });
}

function dateFieldSupported(value, baseResume) {
  const candidate = normalized(value);
  if (!candidate) return true;

  const base = normalized(baseResume);
  if (base.includes(candidate)) return true;

  const years = [...candidate.matchAll(/\b(?:19|20)\d{2}\b/g)].map((match) => match[0]);
  const current = isCurrent(candidate);
  if (!years.length && !current) return false;

  return String(baseResume || "").split(/\r?\n/).some((line) => {
    const normalizedLine = normalized(line);
    return years.every((year) => normalizedLine.includes(year))
      && (!current || isCurrent(normalizedLine));
  });
}

function numericClaims(value) {
  return [...String(value || "").matchAll(/(?:[$€£]\s*)?\b\d[\d,]*(?:\.\d+)?(?:\s*%|\+)?/g)]
    .map((match) => match[0].replace(/\s+/g, "").toLowerCase());
}

function textValues(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(textValues);
  if (value && typeof value === "object") return Object.values(value).flatMap(textValues);
  return [];
}

function exportedResumeValues(resumeData) {
  const resume = resumeData || {};
  return textValues({
    name: resume.name,
    title: resume.title,
    contact: resume.contact,
    profile: resume.profile,
    skills: resume.skills,
    projects: resume.projects,
    training: resume.training,
    experience: resume.experience,
    education: resume.education,
    languages: resume.languages,
    certifications: resume.certifications,
    safety_record: resume.safety_record,
    safety_certifications: resume.safety_certifications,
  });
}

function endYear(value) {
  const text = String(value || "").toLowerCase();
  if (/present|current|now|ongoing/.test(text)) return Number.POSITIVE_INFINITY;
  const years = [...text.matchAll(/\b(?:19|20)\d{2}\b/g)].map((match) => Number(match[0]));
  return years.length ? Math.max(...years) : null;
}

function isCurrent(value) {
  return /present|current|now|ongoing/i.test(String(value || ""));
}

function stableChronologicalSort(experience) {
  return experience
    .map((entry, index) => ({ entry, index, score: endYear(entry?.dates) }))
    .sort((a, b) => {
      if (a.score === null && b.score === null) return a.index - b.index;
      if (a.score === null) return 1;
      if (b.score === null) return -1;
      return b.score - a.score || a.index - b.index;
    })
    .map(({ entry }) => entry);
}

export function enforceReverseChronology(resumeData) {
  return {
    ...resumeData,
    experience: stableChronologicalSort(Array.isArray(resumeData?.experience) ? resumeData.experience : []),
  };
}

const CHANGE_STOPWORDS = new Set([
  "a", "an", "and", "as", "at", "by", "for", "from", "in", "into", "of", "on", "or", "the", "to", "with",
  "worked", "work", "responsible", "including", "using", "supported", "provided",
]);

function changeTokens(value) {
  return new Set(normalized(value).split(" ").filter((token) => token.length > 2 && !CHANGE_STOPWORDS.has(token)));
}

function changeSimilarity(left, right) {
  const leftText = normalized(left);
  const rightText = normalized(right);
  if (!leftText || !rightText) return 0;
  if (leftText === rightText) return 1;
  if (leftText.includes(rightText) || rightText.includes(leftText)) return 0.92;
  const leftTokens = changeTokens(leftText);
  const rightTokens = changeTokens(rightText);
  const denominator = Math.min(leftTokens.size, rightTokens.size);
  if (denominator < 3) return 0;
  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return overlap / denominator;
}

function resumeEvidenceLines(baseResume) {
  return String(baseResume || "").split(/\r?\n/).map((raw, index) => ({
    line_index: index + 1,
    excerpt: raw.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").replace(/\s+/g, " ").trim(),
  })).filter(({ excerpt }) => excerpt.length >= 18 && !/^(?:profile|summary|skills|experience|professional experience|employment|projects|education|training|certifications|languages)$/i.test(excerpt));
}

function bestRequirementForBullet(bullet, requirements = []) {
  return requirements.map((requirement) => ({
    requirement,
    score: Math.max(
      changeSimilarity(bullet, requirement.requirement),
      ...((requirement.evidence || []).map((citation) => changeSimilarity(bullet, citation.excerpt))),
    ),
  })).filter(({ score }) => score >= 0.28).sort((left, right) => right.score - left.score)[0]?.requirement || null;
}

export function buildTailoringChangeLedger(resumeData, baseResume, analysis = {}) {
  const sourceLines = resumeEvidenceLines(baseResume);
  const requirements = Array.isArray(analysis?.requirements) ? analysis.requirements : [];
  const changes = [];

  for (const [experienceIndex, experience] of (resumeData?.experience || []).entries()) {
    for (const [bulletIndex, proposedValue] of (experience?.bullets || []).entries()) {
      const proposed = String(proposedValue || "").replace(/\s+/g, " ").trim();
      if (!proposed) continue;
      const requirement = bestRequirementForBullet(proposed, requirements);
      const requirementCitation = requirement?.evidence?.find((citation) => citation?.excerpt);
      const rankedSources = sourceLines.map((source) => ({
        ...source,
        score: changeSimilarity(proposed, source.excerpt),
      })).sort((left, right) => right.score - left.score || left.line_index - right.line_index);
      const bestSource = requirementCitation && changeSimilarity(proposed, requirementCitation.excerpt) >= 0.24
        ? {
          excerpt: requirementCitation.excerpt,
          line_index: requirementCitation.line_index || null,
          score: changeSimilarity(proposed, requirementCitation.excerpt),
          source: requirementCitation.source || "base_resume",
          section: requirementCitation.section || "base resume",
        }
        : rankedSources[0];
      if (!bestSource || bestSource.score < 0.3) continue;

      const original = bestSource.excerpt;
      const exact = normalized(original) === normalized(proposed);
      const changeType = exact
        ? "retained"
        : proposed.length < original.length * 0.72
          ? "condensed"
          : requirement
            ? "repositioned"
            : "rephrased";
      const reason = exact
        ? "Kept this verified evidence because it is already clear and relevant."
        : requirement
          ? `Rephrased verified evidence to make its connection to “${requirement.requirement}” explicit without adding a new fact.`
          : "Clarified verified evidence for the target role without adding a new fact.";
      changes.push({
        id: `experience-${experienceIndex}-bullet-${bulletIndex}`,
        section: "experience",
        role: String(experience?.role || "Experience").slice(0, 160),
        experience_index: experienceIndex,
        bullet_index: bulletIndex,
        original,
        proposed,
        change_type: changeType,
        reason,
        requirement_id: requirement?.id || null,
        requirement: requirement?.requirement || "",
        evidence_citations: [{
          source: bestSource.source || "base_resume",
          section: bestSource.section || "base resume",
          line_index: bestSource.line_index || null,
          excerpt: original,
        }],
      });
    }
  }
  return changes.slice(0, 60);
}

export function buildAtsReview(resumeData, baseResume, jobBrief, options = {}) {
  const base = String(baseResume || "");
  const allowedNumbers = new Set(numericClaims(base));
  const unsupported_metrics = [];
  const unsupported_history = [];

  const unsupportedClaims = [...new Set(exportedResumeValues(resumeData).flatMap(numericClaims).filter((claim) => !allowedNumbers.has(claim)))];
  unsupported_metrics.push(...unsupportedClaims.map((claim) => ({ claim })));

  for (const [experienceIndex, experience] of (resumeData.experience || []).entries()) {
    const role = String(experience?.role || "").trim();
    const company = String(experience?.company || "").trim();
    const dates = String(experience?.dates || "").trim();

    if (role && !historyFieldSupported(role, base, "role")) {
      unsupported_history.push({ field: "role", value: role, experienceIndex });
    }
    if (company && !historyFieldSupported(company, base, "company")) {
      unsupported_history.push({ field: "company", value: company, experienceIndex });
    }
    if (dates && !dateFieldSupported(dates, base)) {
      unsupported_history.push({ field: "dates", value: dates, experienceIndex });
    }

  }

  const writingReview = buildWritingReview(resumeData, baseResume, options);
  const tailoringChanges = buildTailoringChangeLedger(resumeData, baseResume, options.analysis);
  const verb_issues = writingReview.issues
    .filter((issue) => ["weak_opener", "imprecise_verb", "unrecognized_opener", "contribution_level"].includes(issue.issue_type))
    .map((issue) => ({ experienceIndex: issue.experience_index, bulletIndex: issue.bullet_index, opening: issue.original.match(/^[A-Za-z]+/)?.[0]?.toLowerCase() || "missing" }));
  const tense_issues = writingReview.issues
    .filter((issue) => issue.issue_type === "tense")
    .map((issue) => ({ experienceIndex: issue.experience_index, bulletIndex: issue.bullet_index, expected: /past tense/i.test(issue.explanation) ? "past" : "present" }));

  const years = (resumeData.experience || []).map((entry) => endYear(entry?.dates)).filter((year) => year !== null);
  const reverse_chronological = years.every((year, index) => index === 0 || years[index - 1] >= year);
  const searchableOutput = normalized([
    resumeData.title,
    resumeData.profile,
    ...(resumeData.skills || []),
    ...(resumeData.experience || []).flatMap((entry) => entry.bullets || []),
  ].join(" "));
  const keywords = [...new Set((jobBrief?.keywords || []).map((keyword) => String(keyword).trim()).filter(Boolean))];
  const matched_keywords = keywords.filter((keyword) => searchableOutput.includes(normalized(keyword)));
  const missing_keywords = keywords.filter((keyword) => !searchableOutput.includes(normalized(keyword)));

  const semantic = options.analysis
    ? findSemanticIntegrityIssues(
      resumeData,
      baseResume,
      options.analysis,
      options.targetTitle,
      { isTrades: options.isTrades },
    )
    : {
      unsupported_skills: [],
      unsupported_projects: [],
      unsupported_training: [],
      unsupported_target_terms: [],
      unsupported_positioning: [],
      risky_claims: [],
    };

  let score = 100;
  score -= Math.min(50, unsupported_metrics.length * 20);
  score -= Math.min(40, unsupported_history.length * 15);
  score -= Math.min(20, verb_issues.length * 4);
  score -= Math.min(16, tense_issues.length * 4);
  if (!reverse_chronological) score -= 10;
  if (keywords.length) score -= Math.round((missing_keywords.length / keywords.length) * 15);
  score = Math.max(0, Math.min(100, score));

  const integrityBlocked = Boolean(
    unsupported_metrics.length
      || unsupported_history.length
      || semantic.unsupported_skills.length
      || semantic.unsupported_projects.length
      || semantic.unsupported_training.length
      || semantic.unsupported_target_terms.length
      || semantic.unsupported_positioning.length
      || semantic.risky_claims.length
  );
  const writingScore = Math.max(0, 100
    - Math.min(20, verb_issues.length * 4)
    - Math.min(16, tense_issues.length * 4));
  const writingStatus = writingReview.status;
  const identityMissing = isPlaceholderIdentity(resumeData?.name);
  const postingAssessment = options.postingAssessment || options.analysis?.posting_assessment || {
    status: "unverified",
    reason: "The posting was not independently assessed.",
    fit_allowed: false,
    application_ready_allowed: false,
  };
  const assessmentVerified = postingAssessment.status === "complete"
    && postingAssessment.fit_allowed === true
    && postingAssessment.application_ready_allowed === true;
  const postingReadiness = options.analysis?.posting_readiness || {
    status: assessmentVerified ? "reviewed_complete" : "needs_full_posting",
    reason: postingAssessment.reason,
    description_status: postingAssessment.status,
    fit_allowed: assessmentVerified,
    application_ready_allowed: assessmentVerified,
    confidence: assessmentVerified ? "available" : "unavailable",
    output_mode: assessmentVerified ? "final_candidate" : "preliminary",
  };
  const postingVerified = postingReadiness.status === "reviewed_complete"
    && postingReadiness.fit_allowed === true
    && postingReadiness.application_ready_allowed === true;
  const coverage = options.analysis?.coverage || {
    direct: 0,
    adjacent: 0,
    transferable: 0,
    missing: 0,
  };
  const coverageTotal = ["direct", "adjacent", "transferable", "missing"]
    .reduce((total, key) => total + Number(coverage[key] || 0), 0);
  const requirementCount = Array.isArray(options.analysis?.requirements) ? options.analysis.requirements.length : 0;
  const requirementAnalysisReady = requirementCount > 0
    && coverageTotal > 0
    && requirementCount === coverageTotal;
  const verifiedBlockerCount = Number(options.analysis?.gap_summary?.counts?.verified_blocker || 0);
  const readiness = options.analysis?.readiness || {
    status: integrityBlocked ? "significant_gap" : "credible_stretch",
    reason: "Application readiness requires a complete requirement-to-evidence analysis.",
  };
  const fitReady = !["significant_gap", "needs_full_posting"].includes(readiness.status)
    && verifiedBlockerCount === 0;
  const writingBlocked = writingReview.blocking_issue_count > 0;
  const status = integrityBlocked || writingBlocked
    ? "blocked"
    : writingStatus === "review" || !postingVerified || !requirementAnalysisReady || !fitReady
      ? "review"
      : "ready";
  const applicationReady = Boolean(
    postingVerified
      && !integrityBlocked
      && !identityMissing
      && requirementAnalysisReady
      && reverse_chronological
      && !writingBlocked
      && fitReady
  );

  const focusReview = options.focusReview || {
    status: "not_available",
    target_length: "one_to_two_pages",
    estimated_pages: null,
    included_experience_ids: [],
    condensed_experience: [],
    omitted_bullets: [],
    omitted_experience: [],
    duplicate_groups: [],
    rationale: "A deterministic focus review was not supplied.",
  };

  const exportReadiness = {
    status: applicationReady ? "ready" : "preliminary",
    application_ready: applicationReady,
    blockers: [
      ...(postingVerified ? [] : ["posting_readiness"]),
      ...(requirementAnalysisReady ? [] : ["requirement_analysis"]),
      ...(fitReady ? [] : ["candidate_fit"]),
      ...(integrityBlocked ? ["evidence_integrity"] : []),
      ...(writingBlocked ? ["contribution_language"] : []),
      ...(identityMissing ? ["candidate_identity"] : []),
      ...(!reverse_chronological ? ["chronology"] : []),
    ],
    consistency: "Screen preview, copied text, DOCX, and ATS-safe PDF use the same validated tailored résumé data.",
  };

  return {
    score,
    status,
    reverse_chronological,
    unsupported_metrics,
    unsupported_history,
    unsupported_skills: semantic.unsupported_skills,
    unsupported_projects: semantic.unsupported_projects,
    unsupported_training: semantic.unsupported_training,
    unsupported_target_terms: semantic.unsupported_target_terms,
    unsupported_positioning: semantic.unsupported_positioning,
    risky_claims: semantic.risky_claims,
    verb_issues,
    tense_issues,
    matched_keywords,
    missing_keywords,
    integrity: {
      status: integrityBlocked ? "blocked" : "pass",
      issue_count: unsupported_metrics.length
        + unsupported_history.length
        + semantic.unsupported_skills.length
        + semantic.unsupported_projects.length
        + semantic.unsupported_training.length
        + semantic.unsupported_target_terms.length
        + semantic.unsupported_positioning.length
        + semantic.risky_claims.length,
    },
    posting: postingAssessment,
    posting_readiness: postingReadiness,
    candidate_fit: options.analysis?.candidate_fit || {
      status: postingReadiness.fit_allowed ? "not_available" : "not_assessed",
      confidence: postingReadiness.fit_allowed ? "low" : "unavailable",
      reason: postingReadiness.reason,
    },
    requirements: options.analysis?.requirements || [],
    gap_summary: options.analysis?.gap_summary || null,
    core_coverage: options.analysis?.core_coverage || null,
    requirement_summary: options.analysis?.requirement_summary || null,
    coverage: {
      ...coverage,
      total: coverageTotal,
      matched_keywords,
      missing_keywords,
    },
    parseability: {
      status: reverse_chronological ? "pass" : "review",
      checks: [
        "Reverse-chronological work history",
        "Single-column ATS-safe export",
        "Standard section headings",
      ],
    },
    writing: {
      status: writingStatus,
      score: writingScore,
      issue_count: writingReview.issue_count,
    },
    writing_review: writingReview,
    tailoring_changes: tailoringChanges,
    focus_review: focusReview,
    export_readiness: exportReadiness,
    identity: {
      status: identityMissing ? "missing" : "complete",
      reason: identityMissing
        ? "A real candidate name is required before export; placeholders are never inserted."
        : "Candidate name is present.",
    },
    application_ready: applicationReady,
    output_mode: applicationReady ? "final" : "preliminary",
    readiness,
    missing_evidence: options.analysis?.missing_evidence || [],
    candidate_questions: options.analysis?.candidate_questions || [],
    evidence_questions: options.analysis?.evidence_questions || [],
    disclaimer: "This evaluates evidence integrity, requirement coverage, writing, and parseability separately. No résumé can guarantee an ATS result or interview.",
  };
}
