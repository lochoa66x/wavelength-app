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
  const abruptEnding = /(?:\.{3}|…|\b[a-z]{1,5}…?)$/i.test(text)
    || (text.length > 0 && !/[.!?)\]"']$/.test(text));
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
  } else if (wordCount < 140 || abruptEnding || (!hasResponsibilities && !hasQualifications && wordCount < 260)) {
    status = "partial";
    reason = abruptEnding
      ? "The saved posting appears to end abruptly, so the technology stack or qualifications may be incomplete."
      : "The saved posting looks like an aggregator summary rather than a complete job description.";
  }

  const sourceReview = structuredBrief?.source_review;
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

function cleanRequirement(value, index, baseResume, candidateNotes = []) {
  const requirement = String(value?.requirement || "").replace(/\s+/g, " ").trim().slice(0, 500);
  if (!requirement) return null;
  const requestedMatch = ["direct", "adjacent", "transferable", "missing"].includes(value?.evidence_match)
    ? value.evidence_match
    : "missing";
  const resumeEvidence = String(value?.resume_evidence || "").replace(/\s+/g, " ").trim().slice(0, 700);
  const supported = requestedMatch === "missing"
    || excerptSupported(resumeEvidence, baseResume)
    || Boolean(supportingCandidateNote(resumeEvidence, candidateNotes));
  const citation = supported && requestedMatch !== "missing"
    ? evidenceCitation(resumeEvidence, baseResume, candidateNotes)
    : null;
  return {
    id: String(value?.id || `R${index + 1}`).slice(0, 20),
    requirement,
    priority: ["required", "preferred", "responsibility", "context"].includes(value?.priority)
      ? value.priority
      : "context",
    evidence_match: supported ? requestedMatch : "missing",
    resume_evidence: supported && requestedMatch !== "missing" ? resumeEvidence : "",
    evidence: citation ? [citation] : [],
    safe_language: supported && requestedMatch !== "missing"
      ? String(value?.safe_language || "").replace(/\s+/g, " ").trim().slice(0, 500)
      : "",
    keywords: uniqueStrings(value?.keywords, 8),
  };
}

function coverageCounts(requirements) {
  const counts = { direct: 0, adjacent: 0, transferable: 0, missing: 0 };
  for (const requirement of requirements) counts[requirement.evidence_match] += 1;
  return counts;
}

export function sanitizeTailoringAnalysis(rawAnalysis, baseResume, deterministicPostingAssessment, fallbackKeywords = [], candidateNotes = []) {
  const raw = rawAnalysis && typeof rawAnalysis === "object" ? rawAnalysis : {};
  const requirements = (Array.isArray(raw.requirements) ? raw.requirements : [])
    .slice(0, 24)
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

  let path = ["direct", "adjacent", "career_change"].includes(raw.fit_assessment?.path)
    ? raw.fit_assessment.path
    : "career_change";
  if (requirements.length && coverage.direct === 0) {
    path = coverage.adjacent > 0 && coverage.transferable === 0 && coverage.missing === 0
      ? "adjacent"
      : "career_change";
  } else if (path === "direct" && coverage.missing > coverage.direct) {
    path = "adjacent";
  }

  const postingAssessment = {
    ...deterministicPostingAssessment,
    model_note: String(raw.posting_assessment?.reason || "").replace(/\s+/g, " ").trim().slice(0, 500),
  };

  const fitAllowed = postingAssessment.fit_allowed === true;
  const missingRequired = requirements.some((requirement) => requirement.priority === "required" && requirement.evidence_match === "missing");
  let readinessStatus = "needs_full_posting";
  if (fitAllowed) {
    readinessStatus = path === "direct" ? "strong_fit" : path === "adjacent" ? "credible_stretch" : "significant_gap";
    if (missingRequired) readinessStatus = path === "direct" ? "credible_stretch" : "significant_gap";
  }

  const candidateFit = fitAllowed
    ? {
      status: readinessStatus === "strong_fit" ? "strong" : readinessStatus === "credible_stretch" ? "adjacent" : "gap",
      path,
      confidence: requirements.length >= 5 ? "high" : "medium",
      reason: String(raw.readiness?.reason || raw.fit_assessment?.note || postingAssessment.reason).replace(/\s+/g, " ").trim().slice(0, 700),
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
      recommended_level: String(raw.fit_assessment?.recommended_level || (path === "career_change" ? "Entry-level or transitional" : "Role-aligned")).replace(/\s+/g, " ").trim().slice(0, 160),
      note: String(raw.fit_assessment?.note || "Position the candidate using only verified evidence from the base résumé.").replace(/\s+/g, " ").trim().slice(0, 600),
    },
    content_strategy: path,
    readiness: {
      status: readinessStatus,
      reason: candidateFit.reason,
    },
    requirements,
    coverage,
    verified_transferable_skills: transferableSkills,
    target_keywords: verifiedKeywords,
    missing_evidence: uniqueStrings(raw.missing_evidence, 12),
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
