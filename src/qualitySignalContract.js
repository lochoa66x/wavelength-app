export const QUALITY_SIGNAL_SCHEMA_VERSION = 1;
export const QUALITY_SIGNAL_MAX_BYTES = 4_096;

export const QUALITY_SIGNAL_VALUES = Object.freeze({
  eventName: Object.freeze([
    "posting_review_completed",
    "tailoring_completed",
    "tailoring_blocked",
    "export_attempted",
    "export_completed",
    "export_failed",
    "fit_feedback_submitted",
    "suggestion_feedback_submitted",
  ]),
  route: Object.freeze(["app", "custom_job"]),
  postingSource: Object.freeze(["public_listing", "public_url", "pasted_text", "screenshots", "not_applicable"]),
  occupationFamily: Object.freeze([
    "general-professional",
    "sap-functional",
    "project-leadership",
    "technical",
    "admin-customer-operations",
    "skilled-trades-field-services",
    "marketing-communications",
    "creative-design",
    "not_applicable",
  ]),
  candidatePath: Object.freeze(["direct", "adjacent", "transferable", "major-transition", "not_applicable"]),
  postingReadiness: Object.freeze(["reviewed_complete", "needs_full_posting", "preliminary", "not_available", "not_applicable"]),
  exportReadiness: Object.freeze(["final", "preliminary", "blocked", "not_applicable"]),
  integrityStatus: Object.freeze(["pass", "review", "blocked", "unknown", "not_applicable"]),
  templateId: Object.freeze([
    "ats-core-v1",
    "sap-functional-v1",
    "project-leadership-v1",
    "career-transition-v1",
    "technical-software-v1",
    "admin-customer-operations-v1",
    "skilled-trades-field-services-v1",
    "marketing-communications-v1",
    "creative-design-v1",
    "not_applicable",
  ]),
  exportFormat: Object.freeze(["docx", "pdf", "text", "not_applicable"]),
  outcome: Object.freeze(["completed", "completed_with_fallback", "blocked", "failed", "not_applicable"]),
  errorCategory: Object.freeze([
    "stale_exporter",
    "invalid_content",
    "browser_download",
    "serialization",
    "timeout",
    "network",
    "validation",
    "storage",
    "unknown",
    "not_applicable",
  ]),
  coverageBand: Object.freeze(["none", "0-24", "25-49", "50-74", "75-89", "90-100", "not_available"]),
  durationBand: Object.freeze(["under_5s", "5-30s", "30-90s", "90s_plus", "not_available"]),
  feedback: Object.freeze(["helpful", "not_helpful", "opened", "did_not_open", "not_applicable"]),
  feedbackReason: Object.freeze([
    "positioning_accurate",
    "positioning_unclear",
    "missing_relevant_evidence",
    "too_generic",
    "document_opened",
    "document_did_not_open",
    "formatting_issue",
    "missing_content",
    "not_applicable",
  ]),
});

export const QUALITY_SIGNAL_FIELDS = Object.freeze([
  "schemaVersion",
  ...Object.keys(QUALITY_SIGNAL_VALUES),
]);

const ALLOWED_BY_FIELD = Object.freeze(Object.fromEntries(
  Object.entries(QUALITY_SIGNAL_VALUES).map(([key, values]) => [key, new Set(values)]),
));
const DEFAULT_BY_FIELD = Object.freeze({ coverageBand: "not_available", durationBand: "not_available" });

function byteLength(value) {
  if (typeof TextEncoder === "function") return new TextEncoder().encode(value).length;
  return Buffer.byteLength(value, "utf8");
}

export function qualitySignalJsonBytes(value) {
  try {
    return byteLength(JSON.stringify(value));
  } catch {
    return Number.POSITIVE_INFINITY;
  }
}

export function validateQualitySignal(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { ok: false, error: "invalid_shape" };
  }
  const keys = Object.keys(value).sort();
  const expectedKeys = [...QUALITY_SIGNAL_FIELDS].sort();
  if (keys.length !== expectedKeys.length || keys.some((key, index) => key !== expectedKeys[index])) {
    return { ok: false, error: "invalid_fields" };
  }
  if (value.schemaVersion !== QUALITY_SIGNAL_SCHEMA_VERSION) {
    return { ok: false, error: "invalid_schema_version" };
  }
  for (const [field, allowed] of Object.entries(ALLOWED_BY_FIELD)) {
    if (typeof value[field] !== "string" || !allowed.has(value[field])) {
      return { ok: false, error: `invalid_${field}` };
    }
  }
  if (qualitySignalJsonBytes(value) > QUALITY_SIGNAL_MAX_BYTES) {
    return { ok: false, error: "payload_too_large" };
  }
  return { ok: true, value };
}

export function buildQualitySignal(eventName, dimensions = {}) {
  const value = { schemaVersion: QUALITY_SIGNAL_SCHEMA_VERSION };
  for (const [field, allowedValues] of Object.entries(QUALITY_SIGNAL_VALUES)) {
    const candidate = field === "eventName" ? eventName : dimensions[field];
    if (candidate === undefined && (allowedValues.includes("not_applicable") || DEFAULT_BY_FIELD[field])) {
      value[field] = DEFAULT_BY_FIELD[field] || "not_applicable";
    } else if (allowedValues.includes(candidate)) {
      value[field] = candidate;
    } else {
      throw new Error(`Invalid quality signal dimension: ${field}`);
    }
  }
  const result = validateQualitySignal(value);
  if (!result.ok) throw new Error(`Invalid quality signal contract: ${result.error}`);
  return value;
}
