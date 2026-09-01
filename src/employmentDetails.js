const EMPLOYMENT_FIELD_KEYS = new Set([
  "employmenttype",
  "employment",
  "jobtype",
  "type",
]);

const UNKNOWN_VALUES = new Set(["", "unknown", "unlabeled", "na", "null", "undefined", "notprovided"]);

const SCHEDULES = [
  { key: "full-time", label: "Full-time", pattern: /\bfull[\s-]?time\b/i },
  { key: "part-time", label: "Part-time", pattern: /\bpart[\s-]?time\b/i },
];

const ENGAGEMENTS = [
  { key: "permanent", label: "permanent", pattern: /\b(?:permanent|indefinite)\b/i },
  { key: "contract", label: "contract", pattern: /\b(?:contract(?:or)?|fixed[\s-]?term)\b/i },
  { key: "temporary", label: "temporary", pattern: /\b(?:temporary|temp)\b/i },
  { key: "freelance", label: "freelance", pattern: /\bfreelance\b/i },
  { key: "internship", label: "internship", pattern: /\b(?:internship|intern)\b/i },
  { key: "seasonal", label: "seasonal", pattern: /\bseasonal\b/i },
];

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function key(value) {
  return clean(value)
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function stripSourceNote(value) {
  return clean(value)
    .replace(/\s*\((?:stated|shown|listed|found)\s+in[^)]*\)\s*$/i, "")
    .trim();
}

function unique(values) {
  const seen = new Set();
  const result = [];
  for (const value of values || []) {
    const cleaned = stripSourceNote(value);
    const valueKey = key(cleaned);
    if (UNKNOWN_VALUES.has(valueKey) || seen.has(valueKey)) continue;
    seen.add(valueKey);
    result.push(cleaned);
  }
  return result;
}

function analyze(value) {
  const cleaned = stripSourceNote(value);
  const schedule = SCHEDULES.find((candidate) => candidate.pattern.test(cleaned)) || null;
  const engagement = ENGAGEMENTS.find((candidate) => candidate.pattern.test(cleaned)) || null;
  const durationMatch = cleaned.match(/\b(\d{1,3})\s*[-–—]?\s*(day|week|month|year)s?\b/i);
  const duration = durationMatch
    ? `${durationMatch[1]} ${durationMatch[2].toLowerCase()}${durationMatch[1] === "1" ? "" : "s"}`
    : "";

  return {
    schedule,
    engagement,
    duration,
    recognized: Boolean(schedule || engagement || duration),
  };
}

function employmentField(field) {
  return EMPLOYMENT_FIELD_KEYS.has(key(field));
}

function combinedLabel(analyses) {
  const schedule = analyses.find((analysis) => analysis.schedule)?.schedule || null;
  const engagement = analyses.find((analysis) => analysis.engagement)?.engagement || null;
  const duration = analyses.find((analysis) => analysis.duration)?.duration || "";
  return [schedule?.label, engagement?.label, duration ? `(${duration})` : ""].filter(Boolean).join(" ");
}

export function reconcileEmploymentDetails(currentValue, conflicts) {
  const list = Array.isArray(conflicts) ? conflicts : [];
  const employmentConflicts = list.filter((conflict) => employmentField(conflict?.field));
  if (!employmentConflicts.length) return { value: clean(currentValue), conflicts: list, reconciled: false };

  const values = unique([
    ...employmentConflicts.flatMap((conflict) => conflict?.values || []),
    currentValue,
  ]);
  const analyses = values.map(analyze);
  const schedules = new Set(analyses.map((analysis) => analysis.schedule?.key).filter(Boolean));
  const engagements = new Set(analyses.map((analysis) => analysis.engagement?.key).filter(Boolean));
  const durations = new Set(analyses.map((analysis) => analysis.duration).filter(Boolean));
  const compatible = analyses.length > 1
    && analyses.every((analysis) => analysis.recognized)
    && schedules.size <= 1
    && engagements.size <= 1
    && durations.size <= 1;

  if (!compatible) return { value: clean(currentValue), conflicts: list, reconciled: false };

  return {
    value: combinedLabel(analyses) || clean(currentValue),
    conflicts: list.filter((conflict) => !employmentField(conflict?.field)),
    reconciled: true,
  };
}
