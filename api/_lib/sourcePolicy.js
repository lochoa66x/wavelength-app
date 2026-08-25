export const JOB_SOURCE_POLICY_VERSION = "2026-08-25";

export const IMPORTABLE_JOB_SOURCES = new Set([
  "adzuna",
  "ashby",
  "greenhouse",
  "himalayas",
  "jobicy",
  "jooble",
  "lever",
]);

const SAFE_SKIP_CATEGORIES = new Set([
  "configuration",
  "disabled_by_policy",
]);

function sourceId(value) {
  return String(value || "").trim().toLowerCase();
}

export function parseDisabledJobSources(value) {
  const raw = String(value || "").trim();
  if (!raw) return new Set();

  const sources = raw.split(",").map(sourceId).filter(Boolean);
  if (sources.some((source) => !IMPORTABLE_JOB_SOURCES.has(source))) {
    throw new Error("JOB_SOURCE_DISABLED contains an unsupported source");
  }
  return new Set(sources);
}

export function sourceImportDecision({ source, configured = true, disabledSources = new Set() } = {}) {
  const normalized = sourceId(source);
  if (!IMPORTABLE_JOB_SOURCES.has(normalized)) {
    throw new Error("Unsupported job source policy decision");
  }
  if (disabledSources?.has(normalized)) {
    return { enabled: false, skipCategory: "disabled_by_policy" };
  }
  if (!configured) {
    return { enabled: false, skipCategory: "configuration" };
  }
  return { enabled: true };
}

export function skippedSourceImport(decision, metrics = {}) {
  const skipCategory = SAFE_SKIP_CATEGORIES.has(decision?.skipCategory)
    ? decision.skipCategory
    : "configuration";
  return {
    skipped: true,
    skipCategory,
    requests: 0,
    received: 0,
    saved: 0,
    ...metrics,
  };
}

export function filterEligibleAtsBoards(boards = [], disabledSources = new Set()) {
  return boards.filter(({ provider }) => !disabledSources?.has(sourceId(provider)));
}
