import { createResumePackage, stableHash } from "./resumeModel.js";
import { hasUsableResumeIdentity, hasVerifiedPosting } from "./resumeReadiness.js";
import { createApplicationPresentation, validateApplicationPresentation } from "./applicationPresentation.js";

export const COVER_LETTER_SCHEMA_VERSION = 1;
export const COVER_LETTER_VOICES = Object.freeze([
  { id: "direct", label: "Direct", description: "Concise and practical." },
  { id: "warm", label: "Warm", description: "Personable without invented enthusiasm." },
  { id: "confident", label: "Confident", description: "Assured while preserving the evidence boundary." },
]);
export const COVER_LETTER_LENGTHS = Object.freeze([
  { id: "short", label: "Short", description: "About 220–300 words." },
  { id: "standard", label: "Standard", description: "About 320–430 words." },
]);

const VOICES = new Set(COVER_LETTER_VOICES.map(({ id }) => id));
const LENGTHS = new Set(COVER_LETTER_LENGTHS.map(({ id }) => id));
const PARAGRAPH_PURPOSES = new Set(["opening", "evidence", "transition", "closing"]);
const RISKY_EDIT_PATTERNS = [
  /\b(?:referred|referral|recommended)\s+by\b/i,
  /\b(?:dream|passion(?:ate)?|thrilled|excited)\b/i,
  /\b(?:worked|partnered|collaborated)\s+with\s+(?:your|the)\s+(?:company|team|organization)\b/i,
  /\b(?:authorized|eligible)\s+to\s+work\b/i,
  /\b(?:relocat(?:e|ing|ion)|start\s+date|available\s+immediately|salary|compensation)\b/i,
];
const SAFE_ADDED_WORDS = new Set([
  "a", "an", "and", "as", "at", "be", "because", "by", "can", "for", "from", "has", "have", "help", "i", "in", "is", "it", "my", "of", "on", "or", "our", "that", "the", "their", "this", "through", "to", "toward", "with", "would", "your",
  "appreciate", "consideration", "contribute", "contributing", "discuss", "opportunity", "role", "team", "thank", "value", "welcome", "work",
]);

function clean(value, maxLength = 4_000) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";
}

function cleanArray(value, maxItems = 8, maxLength = 600) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, maxItems).map((item) => clean(item, maxLength)).filter(Boolean);
}

function targetSnapshot(item = {}) {
  return {
    id: clean(item.id == null ? "" : String(item.id), 180),
    jobTitle: clean(item.title ?? item.jobTitle, 240),
    company: clean(item.company, 240),
    location: clean(item.location, 240),
  };
}

export function createCoverLetterSourceFingerprint({ baseResume, resumeData, item, atsReview, candidateEvidence = [] } = {}) {
  const resumePackage = createResumePackage(resumeData, { item, atsReview });
  return stableHash({
    baseResume: clean(baseResume, 16_000),
    resumeContentHash: resumePackage.contentHash,
    target: targetSnapshot(item),
    postingReadiness: atsReview?.posting_readiness || null,
    readiness: atsReview?.readiness || null,
    requirements: Array.isArray(atsReview?.requirements) ? atsReview.requirements : [],
    candidateEvidence: Array.isArray(candidateEvidence) ? candidateEvidence : [],
  }, "cover-source");
}

function normalizeParagraph(raw, index) {
  const purpose = PARAGRAPH_PURPOSES.has(raw?.purpose) ? raw.purpose : index === 0 ? "opening" : "evidence";
  const text = clean(raw?.text, 2_400);
  return {
    id: clean(raw?.id, 80) || `paragraph-${index + 1}`,
    purpose,
    text,
    generatedText: clean(raw?.generatedText ?? raw?.generated_text ?? text, 2_400),
    evidenceRefs: cleanArray(raw?.evidenceRefs ?? raw?.evidence_refs),
    requirementRefs: cleanArray(raw?.requirementRefs ?? raw?.requirement_refs),
    explanation: clean(raw?.explanation, 800),
    evidenceMatch: ["direct", "adjacent", "transferable", "boundary", "neutral"].includes(raw?.evidenceMatch ?? raw?.evidence_match)
      ? raw?.evidenceMatch ?? raw?.evidence_match
      : "neutral",
    verification: raw?.verification === "user_edit_unverified" ? "user_edit_unverified" : "verified",
  };
}

function planContent(plan) {
  return {
    schemaVersion: plan.schemaVersion,
    candidate: plan.candidate,
    target: plan.target,
    voice: plan.voice,
    length: plan.length,
    salutation: plan.salutation,
    paragraphs: plan.paragraphs,
    signoff: plan.signoff,
    sourceFingerprint: plan.sourceFingerprint,
  };
}

export function validateStoredCoverLetterPlan(value) {
  if (value?.kind !== "cover-letter-plan" || value.schemaVersion !== COVER_LETTER_SCHEMA_VERSION) return null;
  if (!Array.isArray(value.paragraphs) || !value.candidate || !value.target) return null;
  return value.contentHash === stableHash(planContent(value), "cover-letter") ? value : null;
}

export function createCoverLetterPlan(raw = {}, {
  baseResume = "",
  resumeData = {},
  item = {},
  atsReview = {},
  candidateEvidence = [],
  candidateIdentity = null,
  voice = raw.voice,
  length = raw.length,
} = {}) {
  const resumePackage = createResumePackage(resumeData, { item, atsReview });
  const sourceFingerprint = createCoverLetterSourceFingerprint({ baseResume, resumeData: resumePackage, item, atsReview, candidateEvidence });
  const candidate = {
    fullName: clean(candidateIdentity?.name ?? candidateIdentity?.fullName, 180) || resumePackage.document.candidate.fullName,
    contactLine: clean(candidateIdentity?.contact ?? candidateIdentity?.contactLine, 1_000) || resumePackage.document.candidate.contactLine,
  };
  const normalized = {
    kind: "cover-letter-plan",
    schemaVersion: COVER_LETTER_SCHEMA_VERSION,
    draftId: clean(raw.draftId ?? raw.draft_id, 100) || stableHash({ sourceFingerprint, createdAt: raw.createdAt || Date.now() }, "letter"),
    candidate,
    target: targetSnapshot(item),
    voice: VOICES.has(voice) ? voice : "direct",
    length: LENGTHS.has(length) ? length : "standard",
    salutation: clean(raw.salutation, 200) || "Dear Hiring Team,",
    paragraphs: Array.isArray(raw.paragraphs) ? raw.paragraphs.slice(0, 6).map(normalizeParagraph).filter((entry) => entry.text) : [],
    signoff: clean(raw.signoff, 200) || "Sincerely,",
    sourceFingerprint,
    createdAt: clean(raw.createdAt ?? raw.created_at, 60) || new Date().toISOString(),
    updatedAt: clean(raw.updatedAt ?? raw.updated_at, 60) || new Date().toISOString(),
  };
  return { ...normalized, contentHash: stableHash(planContent(normalized), "cover-letter") };
}

export function validateCoverLetterEdit(text, paragraph, { baseResume = "", candidateEvidence = [], item = {} } = {}) {
  const next = clean(text, 2_400);
  if (next.length < 20) return { ok: false, message: "Keep at least one complete, specific sentence or remove the paragraph." };
  if (RISKY_EDIT_PATTERNS.some((pattern) => pattern.test(next))) {
    return { ok: false, message: "This edit adds a motivation, relationship, availability, or compensation claim that the evidence contract cannot verify." };
  }
  const allowedCorpus = [
    baseResume,
    paragraph?.generatedText,
    paragraph?.evidenceRefs?.join(" "),
    paragraph?.requirementRefs?.join(" "),
    item?.title,
    item?.company,
    ...(candidateEvidence || []).map((entry) => `${entry?.answer || ""} ${entry?.context || ""} ${entry?.employer_or_project || ""}`),
  ].join(" ").toLowerCase();
  const unsupportedNumbers = (next.match(/\b\d[\d,.%+/-]*\b/g) || []).filter((token) => !allowedCorpus.includes(token.toLowerCase()));
  if (unsupportedNumbers.length) return { ok: false, message: "The edit adds a number that is not present in the verified résumé or candidate evidence." };

  const substantiveWordPattern = /[a-z][a-z0-9+#.-]{2,}[a-z0-9+#]/g;
  const sourceWords = new Set(allowedCorpus.match(substantiveWordPattern) || []);
  const addedClaimWords = (next.toLowerCase().match(substantiveWordPattern) || [])
    .filter((word) => !sourceWords.has(word) && !SAFE_ADDED_WORDS.has(word));
  if (addedClaimWords.length) {
    return { ok: false, message: "This edit adds wording that is not present in the verified sources. Rephrase using the cited evidence, or regenerate the paragraph." };
  }
  return { ok: true, text: next };
}

export function updateCoverLetterParagraph(plan, paragraphId, text, context) {
  const paragraph = plan?.paragraphs?.find((entry) => entry.id === paragraphId);
  if (!paragraph) return { ok: false, message: "That paragraph is no longer part of this draft." };
  const validation = validateCoverLetterEdit(text, paragraph, context);
  if (!validation.ok) return validation;
  const paragraphs = plan.paragraphs.map((entry) => entry.id === paragraphId
    ? { ...entry, text: validation.text, verification: "verified" }
    : entry);
  const next = { ...plan, paragraphs, updatedAt: new Date().toISOString() };
  return { ok: true, plan: { ...next, contentHash: stableHash(planContent(next), "cover-letter") } };
}

export function removeCoverLetterParagraph(plan, paragraphId) {
  const paragraphs = (plan?.paragraphs || []).filter((entry) => entry.id !== paragraphId);
  const next = { ...plan, paragraphs, updatedAt: new Date().toISOString() };
  return { ...next, contentHash: stableHash(planContent(next), "cover-letter") };
}

export function restoreCoverLetterParagraph(plan, paragraphId) {
  const paragraphs = (plan?.paragraphs || []).map((entry) => entry.id === paragraphId
    ? { ...entry, text: entry.generatedText, verification: "verified" }
    : entry);
  const next = { ...plan, paragraphs, updatedAt: new Date().toISOString() };
  return { ...next, contentHash: stableHash(planContent(next), "cover-letter") };
}

export function getCoverLetterReadiness(plan, { baseResume = "", resumeData = {}, item = {}, atsReview = {}, candidateEvidence = [] } = {}) {
  const expectedFingerprint = createCoverLetterSourceFingerprint({ baseResume, resumeData, item, atsReview, candidateEvidence });
  const stale = !plan || plan.sourceFingerprint !== expectedFingerprint;
  const invalidHash = Boolean(plan) && plan.contentHash !== stableHash(planContent(plan), "cover-letter");
  const unverified = (plan?.paragraphs || []).some((entry) => entry.verification !== "verified");
  const incomplete = (plan?.paragraphs?.length || 0) < 2 || !plan?.candidate?.fullName || !plan?.target?.jobTitle;
  const missingIdentity = !hasUsableResumeIdentity(plan?.candidate?.fullName);
  const requirementCount = Array.isArray(atsReview?.requirements) ? atsReview.requirements.length : 0;
  const coverageTotal = ["direct", "adjacent", "transferable", "missing"]
    .reduce((total, key) => total + Number(atsReview?.coverage?.[key] || 0), 0);
  const assessmentIncomplete = !hasVerifiedPosting(atsReview) || requirementCount === 0 || requirementCount !== coverageTotal;
  const significantGap = ["significant_gap", "needs_full_posting"].includes(atsReview?.readiness?.status);
  const blocked = missingIdentity || stale || invalidHash || unverified || incomplete;
  const preliminary = !blocked && (assessmentIncomplete || significantGap);
  return {
    state: blocked ? "blocked" : preliminary ? "preliminary" : "application_ready",
    canExport: !blocked,
    preliminary,
    stale,
    invalidHash,
    message: missingIdentity
      ? "Add your real name to the saved résumé before exporting a cover letter."
      : stale
        ? "The résumé, posting, or confirmed evidence changed. Generate the letter again before exporting."
        : invalidHash
          ? "The letter content no longer matches its trusted draft. Generate it again."
          : unverified
            ? "Recheck or restore the edited paragraph before exporting."
            : incomplete
              ? "Generate a complete evidence-backed letter before exporting."
              : preliminary
                ? "Preliminary letter — the reviewed evidence or posting is not yet sufficient for application-ready status."
                : "Application-ready cover letter — identity, posting, and evidence checks passed.",
  };
}

export function createCoverLetterExportContext(plan, context = {}) {
  const readiness = getCoverLetterReadiness(plan, context);
  if (!readiness.canExport) throw new Error(readiness.message);
  const createdAt = Date.now();
  const applicationPresentation = context.applicationPresentation
    ? validateApplicationPresentation(context.applicationPresentation)
    : createApplicationPresentation();
  return {
    kind: "cover-letter-export-context",
    plan,
    readiness,
    sourceFingerprint: createCoverLetterSourceFingerprint(context),
    applicationPresentation,
    authorizationHash: stableHash({ contentHash: plan.contentHash, sourceFingerprint: plan.sourceFingerprint, presentationHash: applicationPresentation.presentationHash, mode: readiness.preliminary ? "preliminary" : "final" }, "cover-authorization"),
    createdAt,
    expiresAt: createdAt + 5 * 60 * 1_000,
  };
}

export function validateCoverLetterExportContext(context, now = Date.now()) {
  if (context?.kind !== "cover-letter-export-context") throw new Error("A trusted cover-letter export context is required.");
  if (now > context.expiresAt) throw new Error("The cover-letter export authorization expired. Review the draft again.");
  if (context.plan?.sourceFingerprint !== context.sourceFingerprint) throw new Error("The cover letter is stale because its source evidence changed.");
  const expectedContentHash = stableHash(planContent(context.plan), "cover-letter");
  if (context.plan?.contentHash !== expectedContentHash) throw new Error("The cover-letter content hash is invalid or stale.");
  const applicationPresentation = validateApplicationPresentation(context.applicationPresentation);
  const expectedAuthorization = stableHash({
    contentHash: context.plan.contentHash,
    sourceFingerprint: context.plan.sourceFingerprint,
    presentationHash: applicationPresentation.presentationHash,
    mode: context.readiness.preliminary ? "preliminary" : "final",
  }, "cover-authorization");
  if (context.authorizationHash !== expectedAuthorization) throw new Error("The cover-letter export authorization is stale.");
  return context;
}

export function coverLetterToPlainText(plan) {
  return [
    plan?.candidate?.fullName,
    plan?.candidate?.contactLine,
    "",
    plan?.target?.company,
    plan?.target?.jobTitle,
    "",
    plan?.salutation,
    "",
    ...(plan?.paragraphs || []).flatMap((paragraph) => [paragraph.text, ""]),
    plan?.signoff,
    plan?.candidate?.fullName,
  ].filter((value, index, values) => value !== undefined && !(value === "" && values[index - 1] === "")).join("\n").trim();
}

export function safeCoverLetterFilename(plan, extension, { preliminary = false } = {}) {
  const base = [plan?.candidate?.fullName || "candidate", plan?.target?.jobTitle || "cover-letter", preliminary ? "preliminary" : "cover-letter"]
    .join("-")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return `${base || "cover-letter"}.${extension}`;
}
