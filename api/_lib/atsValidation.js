const STRONG_VERBS = new Set([
  "achieve", "achieved", "administer", "administered", "architect", "architected",
  "build", "built", "coordinate", "coordinated", "create", "created", "deliver",
  "delivered", "deploy", "deployed", "design", "designed", "develop", "developed",
  "direct", "directed", "drive", "drove", "establish", "established", "execute",
  "executed", "implement", "implemented", "improve", "improved", "increase", "increased",
  "launch", "launched", "lead", "led", "manage", "managed", "mentor", "mentored",
  "migrate", "migrated", "negotiate", "negotiated", "optimize", "optimized", "organize",
  "organized", "reduce", "reduced", "resolve", "resolved", "scale", "scaled", "spearhead",
  "spearheaded", "streamline", "streamlined", "supervise", "supervised", "transform",
  "transformed", "troubleshoot", "troubleshot",
]);

const WEAK_OPENERS = [
  "responsible for", "helped with", "worked on", "assisted in", "participated in",
  "involved in", "duties included", "tasked with",
];

function normalized(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9%+$]+/g, " ").trim();
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

function endYear(value) {
  const text = String(value || "").toLowerCase();
  if (/present|current|now|ongoing/.test(text)) return Number.POSITIVE_INFINITY;
  const years = [...text.matchAll(/\b(?:19|20)\d{2}\b/g)].map((match) => Number(match[0]));
  return years.length ? Math.max(...years) : null;
}

function isCurrent(value) {
  return /present|current|now|ongoing/i.test(String(value || ""));
}

function firstWord(value) {
  return String(value || "").trim().toLowerCase().match(/^[a-z]+/)?.[0] || "";
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

export function buildAtsReview(resumeData, baseResume, jobBrief) {
  const base = String(baseResume || "");
  const baseNormalized = normalized(base);
  const allowedNumbers = new Set(numericClaims(base));
  const unsupported_metrics = [];
  const unsupported_history = [];
  const verb_issues = [];
  const tense_issues = [];

  const unsupportedClaims = [...new Set(textValues(resumeData).flatMap(numericClaims).filter((claim) => !allowedNumbers.has(claim)))];
  unsupported_metrics.push(...unsupportedClaims.map((claim) => ({ claim })));

  for (const [experienceIndex, experience] of (resumeData.experience || []).entries()) {
    const role = String(experience?.role || "").trim();
    const company = String(experience?.company || "").trim();
    const dates = String(experience?.dates || "").trim();

    if (role && !baseNormalized.includes(normalized(role))) {
      unsupported_history.push({ field: "role", value: role, experienceIndex });
    }
    if (company && !baseNormalized.includes(normalized(company))) {
      unsupported_history.push({ field: "company", value: company, experienceIndex });
    }
    if (dates && !baseNormalized.includes(normalized(dates))) {
      unsupported_history.push({ field: "dates", value: dates, experienceIndex });
    }

    for (const [bulletIndex, bullet] of (experience?.bullets || []).entries()) {
      const opening = firstWord(bullet);
      const lowerBullet = String(bullet || "").trim().toLowerCase();
      if (!STRONG_VERBS.has(opening) || WEAK_OPENERS.some((weak) => lowerBullet.startsWith(weak))) {
        verb_issues.push({ experienceIndex, bulletIndex, opening: opening || "missing" });
      }

      if (dates) {
        const current = isCurrent(dates);
        const looksPast = /ed$/.test(opening) || ["built", "drove", "led", "ran", "saw", "won"].includes(opening);
        if (current && looksPast) tense_issues.push({ experienceIndex, bulletIndex, expected: "present" });
        if (!current && !looksPast && ["lead", "manage", "drive", "build", "coordinate", "design", "develop", "deliver", "implement", "optimize", "supervise"].includes(opening)) {
          tense_issues.push({ experienceIndex, bulletIndex, expected: "past" });
        }
      }
    }
  }

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

  let score = 100;
  score -= Math.min(50, unsupported_metrics.length * 20);
  score -= Math.min(40, unsupported_history.length * 15);
  score -= Math.min(20, verb_issues.length * 4);
  score -= Math.min(16, tense_issues.length * 4);
  if (!reverse_chronological) score -= 10;
  if (keywords.length) score -= Math.round((missing_keywords.length / keywords.length) * 15);
  score = Math.max(0, Math.min(100, score));

  return {
    score,
    status: unsupported_metrics.length || unsupported_history.length ? "blocked" : score >= 85 ? "ready" : "review",
    reverse_chronological,
    unsupported_metrics,
    unsupported_history,
    verb_issues,
    tense_issues,
    matched_keywords,
    missing_keywords,
    disclaimer: "This checks structure and evidence alignment, but no résumé can guarantee an ATS score or interview.",
  };
}
