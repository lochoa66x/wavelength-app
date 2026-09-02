import { stableHash } from "./resumeModel.js";

export const APPLICATION_PACKAGE_SCHEMA_VERSION = 1;
export const APPLICATION_WORKFLOW_INTENTS = Object.freeze([
  Object.freeze({
    id: "package",
    label: "Build application package",
    description: "Prepare a tailored résumé and matching cover letter for one opportunity.",
    artifacts: Object.freeze(["resume", "cover_letter"]),
  }),
  Object.freeze({
    id: "resume_only",
    label: "Tailor résumé only",
    description: "Adapt your verified experience to a reviewed job posting.",
    artifacts: Object.freeze(["resume"]),
  }),
  Object.freeze({
    id: "cover_letter_only",
    label: "Create cover letter only",
    description: "Write an evidence-backed letter without changing your saved résumé.",
    artifacts: Object.freeze(["cover_letter"]),
  }),
]);

const INTENTS = new Map(APPLICATION_WORKFLOW_INTENTS.map((entry) => [entry.id, entry]));
const DOCUMENT_STATES = new Set(["not_created", "generating", "draft", "preliminary", "ready", "stale", "failed"]);

function clean(value, max = 240) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

export function normalizeApplicationIntent(value) {
  return INTENTS.has(value) ? value : "resume_only";
}

export function applicationArtifactsForIntent(value) {
  return [...INTENTS.get(normalizeApplicationIntent(value)).artifacts];
}

export function normalizeApplicationDocumentState(value) {
  return DOCUMENT_STATES.has(value) ? value : "not_created";
}

export function applicationDocumentStateFromReadiness(readiness, { exists = true, busy = false, failed = false } = {}) {
  if (busy) return "generating";
  if (failed) return "failed";
  if (!exists) return "not_created";
  if (readiness?.stale) return "stale";
  if (readiness?.state === "application_ready" || readiness?.applicationReady === true) return "ready";
  if (readiness?.canExport || readiness?.preliminary) return "preliminary";
  return "draft";
}

export function deriveApplicationPackageStatus({ selectedArtifacts = [], resumeStatus, coverLetterStatus } = {}) {
  const selected = selectedArtifacts.filter((artifact) => artifact === "resume" || artifact === "cover_letter");
  if (!selected.length) return "empty";
  const states = selected.map((artifact) => normalizeApplicationDocumentState(
    artifact === "resume" ? resumeStatus : coverLetterStatus,
  ));
  if (states.every((state) => state === "ready")) return "ready";
  if (states.some((state) => ["failed", "stale"].includes(state))) return "needs_attention";
  if (states.some((state) => state === "generating")) return "in_progress";
  if (states.some((state) => state === "preliminary")) return "preliminary";
  if (states.some((state) => ["draft", "not_created"].includes(state))) return "in_progress";
  return "empty";
}

function targetSnapshot(item = {}) {
  return {
    id: clean(item.id == null ? "" : String(item.id), 180),
    jobTitle: clean(item.title ?? item.jobTitle),
    company: clean(item.company),
    location: clean(item.location),
  };
}

export function applicationTargetKey(item = {}) {
  const target = targetSnapshot(item);
  return stableHash(target.id ? { id: target.id } : target, "application-target");
}

export function createApplicationPackageState({
  item = {},
  intent = "resume_only",
  resumeStatus = "not_created",
  coverLetterStatus = "not_created",
  sourceFingerprint = "",
  updatedAt = new Date().toISOString(),
} = {}) {
  const normalizedIntent = normalizeApplicationIntent(intent);
  const selectedArtifacts = applicationArtifactsForIntent(normalizedIntent);
  const normalizedResumeStatus = normalizeApplicationDocumentState(resumeStatus);
  const normalizedCoverLetterStatus = normalizeApplicationDocumentState(coverLetterStatus);
  const body = {
    kind: "application-package-state",
    schemaVersion: APPLICATION_PACKAGE_SCHEMA_VERSION,
    targetKey: applicationTargetKey(item),
    target: targetSnapshot(item),
    intent: normalizedIntent,
    selectedArtifacts,
    resumeStatus: normalizedResumeStatus,
    coverLetterStatus: normalizedCoverLetterStatus,
    packageStatus: deriveApplicationPackageStatus({
      selectedArtifacts,
      resumeStatus: normalizedResumeStatus,
      coverLetterStatus: normalizedCoverLetterStatus,
    }),
    sourceFingerprint: clean(sourceFingerprint, 180),
    updatedAt: clean(updatedAt, 60) || new Date().toISOString(),
  };
  return Object.freeze({ ...body, stateHash: stableHash(body, "application-package-state") });
}

export function validateApplicationPackageState(value) {
  if (value?.kind !== "application-package-state" || value.schemaVersion !== APPLICATION_PACKAGE_SCHEMA_VERSION) return null;
  const rebuilt = createApplicationPackageState({
    item: { id: value.target?.id, title: value.target?.jobTitle, company: value.target?.company, location: value.target?.location },
    intent: value.intent,
    resumeStatus: value.resumeStatus,
    coverLetterStatus: value.coverLetterStatus,
    sourceFingerprint: value.sourceFingerprint,
    updatedAt: value.updatedAt,
  });
  return rebuilt.stateHash === value.stateHash ? value : null;
}
