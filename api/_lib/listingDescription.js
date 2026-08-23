import { createHash } from "node:crypto";

export const DESCRIPTION_SOURCES = new Set([
  "provider_snippet", "provider_full", "employer_jsonld", "employer_html",
  "user_link", "user_paste", "user_screenshot",
]);

export const USER_DESCRIPTION_SOURCES = new Set(["user_link", "user_paste", "user_screenshot"]);
export const ENRICHED_DESCRIPTION_SOURCES = new Set([
  "employer_jsonld", "employer_html", "user_link", "user_paste", "user_screenshot",
]);

export function descriptionWordCount(value) {
  return String(value || "").trim().split(/\s+/).filter(Boolean).length;
}

export function assessDescriptionStatus(value) {
  const words = descriptionWordCount(value);
  if (words < 35) return "insufficient";
  if (words < 140) return "partial";
  return "complete";
}

export function descriptionHash(value) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();
  return normalized ? createHash("sha256").update(normalized).digest("hex") : null;
}

export function isFreshCompleteDescription(row, now = new Date(), maxAgeDays = 7) {
  if (row?.description_status !== "complete") return false;
  const fetchedAt = new Date(row.description_fetched_at || 0);
  if (Number.isNaN(fetchedAt.getTime())) return false;
  return now.getTime() - fetchedAt.getTime() <= maxAgeDays * 86_400_000;
}

export function isFailureCoolingDown(row, now = new Date(), cooldownMinutes = 30) {
  if (!row?.description_enrichment_error_code) return false;
  const attemptedAt = new Date(row.description_fetched_at || 0);
  if (Number.isNaN(attemptedAt.getTime())) return false;
  return now.getTime() - attemptedAt.getTime() <= cooldownMinutes * 60_000;
}

export function shouldPreserveExistingDescription(existing, candidateText) {
  if (!existing?.description) return false;
  if (USER_DESCRIPTION_SOURCES.has(existing.description_source)) return true;
  return existing.description_status === "complete"
    && descriptionWordCount(existing.description) >= descriptionWordCount(candidateText);
}

export function classifyEnrichmentError(error) {
  const message = String(error?.message || "").toLowerCase();
  if (error?.code === "source_mismatch") return "source_mismatch";
  if (error?.name === "AbortError" || message.includes("timed out") || message.includes("timeout")) return "timeout";
  if ([401, 403, 429].includes(error?.httpStatus) || message.includes("captcha") || message.includes("blocked")) return "blocked";
  if (error?.httpStatus || message.includes("http ")) return "http_error";
  if (message.includes("content-type") || message.includes("did not return") || message.includes("too large")) return "invalid_content";
  if (message.includes("enough posting text") || message.includes("readable")) return "unreadable";
  if (message.includes("incomplete")) return "incomplete";
  return "unknown";
}

export function publicDescriptionMetadata(row) {
  return {
    status: row?.description_status || assessDescriptionStatus(row?.description),
    source: row?.description_source || "provider_snippet",
    sourceUrl: row?.description_source_url || row?.url || "",
    fetchedAt: row?.description_fetched_at || null,
    errorCode: row?.description_enrichment_error_code || null,
  };
}
