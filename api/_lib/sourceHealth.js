const SAFE_NUMERIC_METRICS = [
  "requests",
  "received",
  "fresh",
  "unique",
  "saved",
  "inserted",
  "updated",
  "uncertain",
  "closed",
  "reactivated",
  "boards",
  "failed",
];

const SAFE_SKIP_CATEGORIES = new Set([
  "configuration",
  "disabled_by_policy",
]);

const SAFE_RUN_MODES = new Set([
  "authoritative_snapshot",
  "observation_only",
  "partial",
]);

function safeMetric(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : undefined;
}

export function categorizeSourceError(error) {
  const message = String(error?.message || "").toLowerCase();
  if (/missing|not configured|configuration/.test(message)) return "configuration";
  if (/no valid fresh|empty|invalid batch/.test(message)) return "invalid_batch";
  if (/supabase|database|could not (?:load|save|finalize)|permission/.test(message)) return "database";
  if (/timeout|fetch|request|api|unavailable|upstream|board/.test(message)) return "upstream";
  return "unknown";
}

export async function runSourceImport(task, { now = Date.now } = {}) {
  const startedAt = now();
  try {
    const value = await task();
    return { status: "fulfilled", value, durationMs: Math.max(0, now() - startedAt) };
  } catch (reason) {
    return { status: "rejected", reason, durationMs: Math.max(0, now() - startedAt) };
  }
}

export function summarizeSourceOutcome(outcome, failureMessage) {
  const durationMs = safeMetric(outcome?.durationMs) ?? 0;
  if (outcome?.status !== "fulfilled") {
    return {
      ok: false,
      state: "failed",
      error: failureMessage,
      errorCategory: categorizeSourceError(outcome?.reason),
      durationMs,
    };
  }

  const value = outcome.value && typeof outcome.value === "object" ? outcome.value : {};
  const summary = {
    ok: true,
    state: value.skipped ? "skipped" : "success",
    skipped: Boolean(value.skipped),
    durationMs,
  };
  if (value.skipped) {
    summary.skipCategory = SAFE_SKIP_CATEGORIES.has(value.skipCategory)
      ? value.skipCategory
      : "configuration";
  }
  if (SAFE_RUN_MODES.has(value.runMode)) summary.runMode = value.runMode;
  for (const metric of SAFE_NUMERIC_METRICS) {
    const safe = safeMetric(value[metric]);
    if (safe !== undefined) summary[metric] = safe;
  }
  return summary;
}

export function summarizeCronHealth(sources = {}) {
  const summaries = Object.values(sources);
  const attempted = summaries.filter(({ skipped }) => !skipped).length;
  const succeeded = summaries.filter(({ ok, skipped }) => ok && !skipped).length;
  const failed = summaries.filter(({ ok }) => !ok).length;
  const skipped = summaries.filter((summary) => summary.skipped).length;
  return {
    state: attempted === 0 ? "skipped" : succeeded === 0 ? "failed" : failed > 0 ? "partial" : "success",
    attempted,
    succeeded,
    failed,
    skipped,
  };
}

export function logCronHealth(logger, event, health, sources) {
  logger(JSON.stringify({ event, health, sources }));
}
