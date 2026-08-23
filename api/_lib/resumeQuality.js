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
  const sanitized = sanitizeIdentity(resumeData && typeof resumeData === "object" ? resumeData : {});
  if (analysis?.fit_assessment?.path !== "career_change") return sanitized;
  return shapeCareerChangeResume(sanitized, analysis);
}
