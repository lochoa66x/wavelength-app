export const MAX_SCREENSHOTS = 8;
export const SCREENSHOT_BATCH_SIZE = 4;

const UNKNOWN_VALUE = /^(?:<\s*)?(?:unknown|unlabeled|n\/?a|null|undefined|not provided)(?:\s*>)?$/i;
const IDENTITY_FIELDS = ["title", "company"];
const LIST_FIELDS = ["responsibilities", "required_qualifications", "preferred_qualifications", "keywords"];

function cleanValue(value) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return UNKNOWN_VALUE.test(text) ? "" : text;
}

function comparisonKey(value) {
  return cleanValue(value)
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9+#]+/g, " ")
    .trim();
}

function uniqueValues(values, limit = 40) {
  const seen = new Set();
  const result = [];
  for (const value of values || []) {
    const cleaned = cleanValue(value).replace(/^(?:[-*•▪◦]|\d+[.)])\s*/, "");
    const key = comparisonKey(cleaned);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
    if (result.length >= limit) break;
  }
  return result;
}

export function appendScreenshotFiles(currentFiles, incomingFiles, limit = MAX_SCREENSHOTS) {
  const seen = new Set();
  const result = [];
  for (const file of [...(currentFiles || []), ...(incomingFiles || [])]) {
    const key = [file.name, file.size, file.type, file.lastModified].join(":");
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(file);
    if (result.length >= limit) break;
  }
  return result;
}

export function screenshotBatches(files, batchSize = SCREENSHOT_BATCH_SIZE) {
  const batches = [];
  for (let index = 0; index < files.length; index += batchSize) {
    batches.push(files.slice(index, index + batchSize));
  }
  return batches;
}

function collectConflicts(briefs) {
  const conflicts = [];
  for (const field of IDENTITY_FIELDS) {
    const values = uniqueValues(briefs.map((brief) => brief?.[field]), 8);
    if (values.length > 1) conflicts.push({ field, values });
  }
  for (const brief of briefs) {
    for (const conflict of brief?.source_review?.conflicts || []) {
      const field = cleanValue(conflict?.field);
      const values = uniqueValues(conflict?.values, 8);
      if (!field || values.length < 2) continue;
      const existing = conflicts.find((candidate) => candidate.field === field);
      if (existing) existing.values = uniqueValues([...existing.values, ...values], 8);
      else conflicts.push({ field, values });
    }
  }
  return conflicts.filter((conflict) => conflict.values.length > 1).slice(0, 8);
}

export function mergeExtractedJobBriefs(briefs, { pageCount } = {}) {
  const validBriefs = (briefs || []).filter(Boolean);
  if (!validBriefs.length) return null;

  const descriptions = uniqueValues(validBriefs.map((brief) => brief.description), 8);
  const firstKnown = (field) => validBriefs.map((brief) => cleanValue(brief[field])).find(Boolean) || "";
  const category = validBriefs.map((brief) => cleanValue(brief.category)).find((value) => value && value !== "other")
    || firstKnown("category")
    || "other";
  const conflicts = collectConflicts(validBriefs);
  const finalReview = validBriefs.at(-1)?.source_review || {};

  const merged = {
    title: firstKnown("title"),
    company: firstKnown("company"),
    location: firstKnown("location"),
    type: firstKnown("type") || "Unlabeled",
    category,
    description: descriptions.join("\n\n").slice(0, 16000),
    source_url: firstKnown("source_url"),
  };
  for (const field of LIST_FIELDS) {
    merged[field] = uniqueValues(validBriefs.flatMap((brief) => brief[field] || []), field === "keywords" ? 40 : 30);
  }
  merged.source_review = {
    mode: "screenshots",
    page_count: Number.isInteger(pageCount) ? pageCount : validBriefs.length,
    appears_complete: finalReview.appears_complete === true,
    completeness_notes: uniqueValues(validBriefs.map((brief) => brief?.source_review?.completeness_notes), 8).join(" ").slice(0, 800),
    user_confirmed_complete: false,
    conflicts,
    conflicts_resolved: conflicts.length === 0,
  };
  return merged;
}
