const PLACEHOLDER_IDENTITY = /^(?:<\s*)?(?:unknown|unnamed|name unavailable|candidate|n\/?a|null|undefined)(?:\s*>)?$/i;

const UNVERIFIED_PROGRESS_PATTERNS = [
  /\bactively building\b/i,
  /\bcurrently (?:learning|studying|training)\b/i,
  /\bdeveloping (?:new )?(?:skills|proficiency)\b/i,
  /\bpursuing (?:a |an )?(?:course|certificate|certification|degree|training|bootcamp)\b/i,
  /\benrolled in\b/i,
];

const TOKEN_STOPWORDS = new Set([
  "a", "an", "and", "are", "as", "at", "by", "for", "from", "in", "is", "of", "on", "or",
  "the", "this", "to", "with", "work", "worked", "working", "experience", "professional", "role",
]);

function normalized(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9+#.%]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueStrings(values, limit) {
  const seen = new Set();
  const result = [];
  for (const rawValue of values || []) {
    const value = String(rawValue || "").replace(/\s+/g, " ").trim();
    const key = normalized(value);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(value);
    if (result.length >= limit) break;
  }
  return result;
}

function sentences(value) {
  return String(value || "").trim().split(/(?<=[.!?])\s+/).filter(Boolean);
}

function limitByCompleteSentences(value, maxWords) {
  const source = sentences(value);
  const kept = [];
  let wordCount = 0;
  for (const sentence of source) {
    const sentenceWords = sentence.match(/[\p{L}\p{N}+#.%/-]+/gu)?.length || 0;
    if (kept.length && wordCount + sentenceWords > maxWords) break;
    kept.push(sentence);
    wordCount += sentenceWords;
    if (wordCount >= maxWords) break;
  }
  return kept.join(" ").trim();
}

function evidenceTokens(analysis) {
  const values = [
    ...(analysis?.verified_transferable_skills || []).flatMap((item) => [item?.skill, item?.resume_evidence]),
    ...(analysis?.requirements || [])
      .filter((requirement) => requirement?.evidence_match !== "missing")
      .flatMap((requirement) => [requirement?.safe_language, requirement?.resume_evidence, ...(requirement?.keywords || [])]),
  ];
  return new Set(normalized(values.filter(Boolean).join(" ")).split(" ").filter((token) => token.length > 2 && !TOKEN_STOPWORDS.has(token)));
}

function weightedEvidenceTokens(analysis) {
  const weights = new Map();
  const add = (value, weight) => {
    for (const token of normalized(value).split(" ")) {
      if (token.length <= 2 || TOKEN_STOPWORDS.has(token)) continue;
      weights.set(token, Math.max(weights.get(token) || 0, weight));
    }
  };
  for (const requirement of analysis?.requirements || []) {
    const weight = requirement?.evidence_match === "direct" ? 5
      : requirement?.evidence_match === "adjacent" ? 3
        : requirement?.evidence_match === "transferable" ? 2 : 0;
    if (!weight) continue;
    add(requirement.requirement, weight);
    add(requirement.safe_language, weight);
    add(requirement.resume_evidence, weight);
    for (const keyword of requirement.keywords || []) add(keyword, weight + 1);
  }
  for (const item of analysis?.verified_transferable_skills || []) {
    add(item.skill, 2);
    add(item.resume_evidence, 1);
  }
  for (const keyword of analysis?.target_keywords || []) add(keyword, 2);
  return weights;
}

function relevanceScore(value, tokens) {
  const valueTokens = new Set(normalized(value).split(" ").filter(Boolean));
  let score = 0;
  for (const token of tokens) {
    if (valueTokens.has(token)) score += token.length > 7 ? 2 : 1;
  }
  return score;
}

function rankAndLimitBullets(values, tokens, limit) {
  return (Array.isArray(values) ? values : [])
    .map((value, index) => ({ value: String(value || "").trim(), index, score: relevanceScore(value, tokens) }))
    .filter(({ value }) => value)
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .slice(0, limit)
    .map(({ value }) => value);
}

function weightedRelevanceScore(value, weights) {
  const valueTokens = new Set(normalized(value).split(" ").filter(Boolean));
  return [...valueTokens].reduce((score, token) => score + (weights.get(token) || 0), 0);
}

function similarity(left, right) {
  const a = new Set(normalized(left).split(" ").filter((token) => token.length > 3 && !TOKEN_STOPWORDS.has(token)));
  const b = new Set(normalized(right).split(" ").filter((token) => token.length > 3 && !TOKEN_STOPWORDS.has(token)));
  if (!a.size || !b.size) return 0;
  const overlap = [...a].filter((token) => b.has(token)).length;
  return overlap / Math.max(1, Math.min(a.size, b.size));
}

function entryId(entry, index) {
  return normalized([entry?.role, entry?.company, entry?.dates].filter(Boolean).join("-")) || `experience-${index + 1}`;
}

const DEGREE_REQUIREMENT_PATTERN = /\b(?:bachelor(?:'s)?|undergraduate)\s+(?:degree|education)|\b(?:ba|bs|bsc|bba)\b/i;
const DEGREE_EVIDENCE_PATTERN = /\b(?:bachelor(?:'s)?(?:\s+of|\s+degree)?|baccalaureate|ba|bs|bsc|bba)\b/i;

function restoreRequiredEducation(resumeData, analysis, baseResume) {
  if (Array.isArray(resumeData?.education) && resumeData.education.length) return resumeData;
  const requiresDegree = (analysis?.requirements || []).some((requirement) => DEGREE_REQUIREMENT_PATTERN.test(requirement?.requirement));
  if (!requiresDegree) return resumeData;
  const line = String(baseResume || "")
    .split(/\r?\n/)
    .map((value) => value.replace(/^[\s•*-]+/, "").replace(/\s+/g, " ").trim())
    .find((value) => DEGREE_EVIDENCE_PATTERN.test(value));
  if (!line) return resumeData;
  return {
    ...resumeData,
    education: [{ degree: line, institution: "", dates: "", restored_from_verified_evidence: true }],
  };
}

function focusResume(resumeData, analysis) {
  const weights = weightedEvidenceTokens(analysis);
  const careerChange = analysis?.fit_assessment?.path === "career_change";
  const duplicateGroups = [];
  const condensed = [];
  const omittedBullets = [];
  const includedExperienceIds = [];
  const seenBullets = [];
  let totalBullets = 0;

  const experience = (Array.isArray(resumeData?.experience) ? resumeData.experience : []).map((entry, entryIndex) => {
    const id = entryId(entry, entryIndex);
    includedExperienceIds.push(id);
    const source = (Array.isArray(entry?.bullets) ? entry.bullets : [])
      .map((value, bulletIndex) => ({
        value: String(value || "").replace(/\s+/g, " ").trim(),
        bulletIndex,
        score: weightedRelevanceScore(value, weights) + Math.max(0, 4 - entryIndex),
      }))
      .filter(({ value }) => value)
      .sort((a, b) => b.score - a.score || a.bulletIndex - b.bulletIndex);
    const defaultLimit = careerChange ? (entryIndex < 2 ? 3 : 2) : entryIndex < 2 ? 4 : entryIndex < 5 ? 3 : 2;
    const remaining = Math.max(1, 20 - totalBullets);
    const limit = Math.min(defaultLimit, remaining);
    const kept = [];

    for (const candidate of source) {
      const duplicate = seenBullets.find((existing) => similarity(candidate.value, existing.value) >= 0.78);
      if (duplicate) {
        duplicateGroups.push({ kept: duplicate.value, omitted: candidate.value, reason: "Near-duplicate accomplishment" });
        omittedBullets.push({ experience_id: id, bullet: candidate.value, reason: "near_duplicate" });
        continue;
      }
      if (kept.length >= limit) {
        omittedBullets.push({ experience_id: id, bullet: candidate.value, reason: candidate.score ? "lower_target_relevance" : "length_control" });
        continue;
      }
      kept.push(candidate.value);
      seenBullets.push({ value: candidate.value, experienceId: id });
    }

    if (source.length > kept.length) condensed.push({
      experience_id: id,
      role: entry?.role || "",
      original_bullets: source.length,
      included_bullets: kept.length,
    });
    totalBullets += kept.length;
    return { ...entry, bullets: kept };
  });

  const profileWords = String(resumeData?.profile || "").split(/\s+/).filter(Boolean).length;
  const bulletWords = experience.flatMap((entry) => entry.bullets || []).join(" ").split(/\s+/).filter(Boolean).length;
  const skillWords = (resumeData?.skills || []).join(" ").split(/\s+/).filter(Boolean).length;
  const supportingWords = [
    ...(resumeData?.projects || []).flatMap((project) => [project?.name, project?.description, ...(project?.bullets || [])]),
    ...(resumeData?.training || []).flatMap((item) => [item?.name, item?.provider, item?.dates]),
    ...(resumeData?.education || []).flatMap((item) => [item?.degree, item?.institution, item?.dates]),
    ...(resumeData?.languages || []),
  ].filter(Boolean).join(" ").split(/\s+/).filter(Boolean).length;
  const estimatedWords = profileWords + bulletWords + skillWords + supportingWords + experience.length * 8;
  const estimatedPages = Math.max(1, Math.ceil(estimatedWords / 475));

  return {
    resume: { ...resumeData, experience },
    focusReview: {
      status: estimatedPages <= 2 ? "focused" : "review",
      target_length: "one_to_two_pages",
      estimated_pages: estimatedPages,
      estimation_method: "content_density_fallback",
      estimated_template_id: "",
      estimated_words: estimatedWords,
      included_experience_ids: includedExperienceIds,
      condensed_experience: condensed,
      omitted_bullets: omittedBullets,
      omitted_experience: [],
      duplicate_groups: duplicateGroups,
      rationale: careerChange
        ? "Career-change output emphasizes verified direct, adjacent, and transferable evidence while compressing unrelated detail."
        : "Output prioritizes recent, requirement-aligned evidence and removes repetitive or lower-signal bullets.",
    },
  };
}

export function isPlaceholderIdentity(value) {
  const text = String(value || "").trim();
  return !text || PLACEHOLDER_IDENTITY.test(text);
}

function sanitizeIdentity(resumeData) {
  const name = isPlaceholderIdentity(resumeData?.name) ? "" : String(resumeData.name).trim();
  const contactValue = String(resumeData?.contact || "").trim();
  const contact = PLACEHOLDER_IDENTITY.test(contactValue) ? "" : contactValue;
  return { ...resumeData, name, contact };
}

function shapeCareerChangeResume(resumeData, analysis) {
  const tokens = evidenceTokens(analysis);
  const profileSentences = sentences(resumeData?.profile)
    .filter((sentence) => !UNVERIFIED_PROGRESS_PATTERNS.some((pattern) => pattern.test(sentence)));

  const verifiedSkills = uniqueStrings(
    (analysis?.verified_transferable_skills || []).map((item) => item?.skill),
    10,
  );
  const coverage = analysis?.coverage || {};
  const majorGap = Number(coverage.direct || 0) + Number(coverage.adjacent || 0) === 0;
  const skills = majorGap
    ? verifiedSkills
    : uniqueStrings([...verifiedSkills, ...(resumeData?.skills || [])], 10);

  const experience = (Array.isArray(resumeData?.experience) ? resumeData.experience : []).map((entry, index) => ({
    ...entry,
    bullets: rankAndLimitBullets(entry?.bullets, tokens, index < 2 ? 3 : 2),
  }));
  const foundationRole = String(experience[0]?.role || "Experienced professional").trim();
  const fallbackSkills = verifiedSkills.slice(0, 3);
  const fallbackProfile = `${foundationRole}${fallbackSkills.length ? ` with verified experience in ${fallbackSkills.join(", ")}` : ""}. Pursuing an evidence-led career transition without overstating target-role experience.`;

  return {
    ...resumeData,
    profile: limitByCompleteSentences(profileSentences.join(" "), 90) || fallbackProfile,
    skills,
    experience,
  };
}

export function shapeTailoredResume(resumeData, analysis) {
  return shapeTailoredResumeWithReview(resumeData, analysis).resume;
}

export function shapeTailoredResumeWithReview(resumeData, analysis, baseResume = "") {
  const sanitized = sanitizeIdentity(resumeData && typeof resumeData === "object" ? resumeData : {});
  const strategyShaped = analysis?.fit_assessment?.path === "career_change"
    ? shapeCareerChangeResume(sanitized, analysis)
    : sanitized;
  const evidenceComplete = restoreRequiredEducation(strategyShaped, analysis, baseResume);
  return focusResume(evidenceComplete, analysis);
}

export function applyPdfLayoutToFocusReview(focusReview, { pages, templateId, templateName } = {}) {
  const estimatedPages = Number.isInteger(pages) && pages > 0 ? pages : focusReview?.estimated_pages || 1;
  return {
    ...(focusReview || {}),
    status: estimatedPages <= 2 ? "focused" : "review",
    estimated_pages: estimatedPages,
    estimation_method: "direct_pdf_layout",
    estimated_template_id: String(templateId || ""),
    estimated_template_name: String(templateName || ""),
  };
}
