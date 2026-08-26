import { createResumePackage } from "./resumeModel.js";
import { getResumeExportReadiness } from "./resumeReadiness.js";
import { buildQualitySignal, validateQualitySignal } from "./qualitySignalContract.js";

export const QUALITY_SIGNAL_CONSENT_KEY = "gigscapes:quality-signal-consent:v1";
export const QUALITY_SIGNAL_CONSENT_EVENT = "gigscapes:quality-signal-consent-change";

let inFlightControllers = new Set();

function browserStorage() {
  try {
    return typeof window !== "undefined" ? window.localStorage : null;
  } catch {
    return null;
  }
}

export function readQualitySignalConsent(storage = browserStorage()) {
  if (!storage) return false;
  try {
    const value = JSON.parse(storage.getItem(QUALITY_SIGNAL_CONSENT_KEY));
    return value?.schemaVersion === 1 && value?.enabled === true;
  } catch {
    return false;
  }
}

export function writeQualitySignalConsent(enabled, storage = browserStorage(), now = Date.now()) {
  const next = enabled === true;
  try {
    storage?.setItem(QUALITY_SIGNAL_CONSENT_KEY, JSON.stringify({ schemaVersion: 1, enabled: next, updatedAt: now }));
  } catch {
    return false;
  }
  if (!next) clearPendingQualitySignals();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(QUALITY_SIGNAL_CONSENT_EVENT, { detail: { enabled: next } }));
  }
  return true;
}

export function clearPendingQualitySignals() {
  for (const controller of inFlightControllers) controller.abort();
  inFlightControllers = new Set();
}

export async function emitQualitySignal(signal, {
  fetchImpl = globalThis.fetch,
  storage = browserStorage(),
  timeoutMs = 2_500,
} = {}) {
  if (!readQualitySignalConsent(storage)) return { status: "disabled" };
  const validation = validateQualitySignal(signal);
  if (!validation.ok) return { status: "rejected", reason: validation.error };
  if (typeof fetchImpl !== "function") return { status: "unavailable" };

  const controller = new AbortController();
  inFlightControllers.add(controller);
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl("/api/quality-signal", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Gigscapes-Quality-Signal": "1" },
      body: JSON.stringify(signal),
      credentials: "omit",
      cache: "no-store",
      keepalive: true,
      signal: controller.signal,
    });
    return { status: response.ok ? "accepted" : "failed" };
  } catch {
    return { status: controller.signal.aborted ? "aborted" : "failed" };
  } finally {
    clearTimeout(timeout);
    inFlightControllers.delete(controller);
  }
}

export function postingSourceForMode(mode) {
  return mode === "paste" ? "pasted_text" : mode === "screenshots" ? "screenshots" : mode === "url" ? "public_url" : "not_applicable";
}

export function durationBand(durationMs) {
  if (!Number.isFinite(durationMs) || durationMs < 0) return "not_available";
  if (durationMs < 5_000) return "under_5s";
  if (durationMs < 30_000) return "5-30s";
  if (durationMs < 90_000) return "30-90s";
  return "90s_plus";
}

export function coverageBand(atsReview) {
  const values = ["direct", "adjacent", "transferable", "missing"].map((key) => Number(atsReview?.coverage?.[key]));
  if (values.some((value) => !Number.isFinite(value) || value < 0)) return "not_available";
  const covered = values[0] + values[1] + values[2];
  const total = covered + values[3];
  if (!total) return "none";
  const percentage = (covered / total) * 100;
  if (percentage < 25) return "0-24";
  if (percentage < 50) return "25-49";
  if (percentage < 75) return "50-74";
  if (percentage < 90) return "75-89";
  return "90-100";
}

function normalizePostingReadiness(status) {
  if (status === "reviewed_complete" || status === "needs_full_posting" || status === "preliminary") return status;
  return "not_available";
}

function normalizeIntegrityStatus(status) {
  return ["pass", "review", "blocked"].includes(status) ? status : "unknown";
}

export function resumeQualitySignalDimensions({
  resumeData,
  resumePackage,
  item,
  atsReview,
  route,
  postingSource,
  exportFormat = "not_applicable",
  outcome = "not_applicable",
  errorCategory = "not_applicable",
  durationMs,
  feedback = "not_applicable",
  feedbackReason = "not_applicable",
} = {}) {
  const pkg = resumePackage || createResumePackage(resumeData || {}, { item, atsReview });
  const readiness = getResumeExportReadiness(pkg, atsReview);
  return {
    route,
    postingSource,
    occupationFamily: pkg.classification.occupationFamily,
    candidatePath: pkg.classification.careerStrategy,
    postingReadiness: normalizePostingReadiness(atsReview?.posting_readiness?.status),
    exportReadiness: readiness.missingIdentity ? "blocked" : readiness.preliminary ? "preliminary" : "final",
    integrityStatus: normalizeIntegrityStatus(atsReview?.integrity?.status),
    templateId: pkg.presentation.selectedTemplateId || pkg.presentation.recommendedTemplateId,
    exportFormat,
    outcome,
    errorCategory,
    coverageBand: coverageBand(atsReview),
    durationBand: durationBand(durationMs),
    feedback,
    feedbackReason,
  };
}

export function emitResumeQualitySignal(eventName, input, options) {
  const storage = options?.storage ?? browserStorage();
  if (!readQualitySignalConsent(storage)) return Promise.resolve({ status: "disabled" });
  try {
    return emitQualitySignal(
      buildQualitySignal(eventName, resumeQualitySignalDimensions(input)),
      { ...options, storage },
    );
  } catch {
    return Promise.resolve({ status: "rejected" });
  }
}
