import { COVER_LETTER_VOICES, COVER_LETTER_LENGTHS } from "./coverLetterControls.js";
import { hasInternalDocumentLanguage, claimMeaningIssues, contributionEditIssue, coverLetterRecipientAddress } from "./documentIntegrity.js";
import { createResumePackage, stableHash } from "./resumeModel.js";
import { hasUsableResumeIdentity, hasVerifiedPosting } from "./resumeReadiness.js";
import { createApplicationPresentation, validateApplicationPresentation } from "./applicationPresentation.js";
import { containsSelfDisqualifyingCoverLetterLanguage } from "./coverLetterLanguage.js";
import { pendingApplicationConfirmations } from './applicationConfirmations.js';
import {resumeProfessionalLinks} from './resumeIdentity.js';

export const COVER_LETTER_SCHEMA_VERSION = 1;
export const COVER_LETTER_PARAGRAPH_LIMIT = 2_400;
export { COVER_LETTER_VOICES, COVER_LETTER_LENGTHS } from "./coverLetterControls.js";

const VOICES = new Set(COVER_LETTER_VOICES.map(({ id }) => id));
const LENGTHS = new Set(COVER_LETTER_LENGTHS.map(({ id }) => id));
const PARAGRAPH_PURPOSES = new Set(["opening", "evidence", "closing"]);
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

function sentenceCaseOpening(value) {
  return clean(value, 240).replace(/^([a-z])/, (letter) => letter.toUpperCase());
}

function stripEmbeddedSignoff(value) {
  return clean(value, Number.POSITIVE_INFINITY)
    .replace(/\s+(?:sincerely|best regards|kind regards|regards|respectfully)\s*,(?:\s+.{0,180})?$/i, "")
    .trim();
}

function normalizeSignoff(value) {
  const signoff = clean(value, 200).toLowerCase();
  if (signoff.startsWith("best regards")) return "Best regards,";
  if (signoff.startsWith("kind regards")) return "Kind regards,";
  if (signoff.startsWith("regards")) return "Regards,";
  return "Sincerely,";
}

function coverLetterContactLine(candidateIdentity, candidate, baseResume) {
  const explicit = clean(candidateIdentity?.contact ?? candidateIdentity?.contactLine ?? candidate?.contactLine, 1_000);
  const explicitParts = explicit.split(/\s*(?:\||·)\s*/).filter(Boolean);
  const professionalLinks = Array.isArray(candidate?.professionalLinks)
    ? candidate.professionalLinks.map((entry) => clean(entry?.url, 500)).filter(Boolean)
    : [];
  const direct = [candidate?.email, candidate?.phone, ...professionalLinks].map((entry) => clean(entry, 500)).filter(Boolean);
  const safeExplicit = explicitParts.filter((part) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(part)
    || (part.replace(/\D/g, "").length >= 7)
    || /^https?:\/\//i.test(part));
  return [...new Set([...direct, ...safeExplicit, ...resumeProfessionalLinks(baseResume).map((entry) => entry.url)])].join(" · ");
}

function targetSnapshot(item = {}) {
  return {
    id: clean(item.id == null ? "" : String(item.id), 180),
    jobTitle: sentenceCaseOpening(item.title ?? item.jobTitle),
    company: clean(item.company, 240),
    location: clean(item.location, 240),
    ...(item.employerAddress ? { employerAddress: clean(item.employerAddress, 500) } : {}),
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
  const text = stripEmbeddedSignoff(raw?.text);
  return {
    id: clean(raw?.id, 80) || `paragraph-${index + 1}`,
    purpose,
    text,
    generatedText: clean(raw?.generatedText ?? raw?.generated_text ?? text, Number.POSITIVE_INFINITY),
    evidenceRefs: cleanArray(raw?.evidenceRefs ?? raw?.evidence_refs),
    requirementRefs: cleanArray(raw?.requirementRefs ?? raw?.requirement_refs),
    explanation: clean(raw?.explanation, 800),
    evidenceMatch: ["direct", "adjacent", "transferable", "neutral"].includes(raw?.evidenceMatch ?? raw?.evidence_match)
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
  if (value.contentHash !== stableHash(planContent(value), "cover-letter")) return null;
  const normalized = {
    ...value,
    target: targetSnapshot(value.target),
    paragraphs: value.paragraphs.map(normalizeParagraph).filter((entry) => entry.text),
    signoff: normalizeSignoff(value.signoff),
  };
  return { ...normalized, contentHash: stableHash(planContent(normalized), "cover-letter") };
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
    contactLine: coverLetterContactLine(candidateIdentity, resumePackage.document.candidate, baseResume),
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
    signoff: normalizeSignoff(raw.signoff),
    sourceFingerprint,
    createdAt: clean(raw.createdAt ?? raw.created_at, 60) || new Date().toISOString(),
    updatedAt: clean(raw.updatedAt ?? raw.updated_at, 60) || new Date().toISOString(),
  };
  return { ...normalized, contentHash: stableHash(planContent(normalized), "cover-letter") };
}

export function validateCoverLetterEdit(text, paragraph, { baseResume = "", candidateEvidence = [], item = {} } = {}) {
  if (String(text || '').length > COVER_LETTER_PARAGRAPH_LIMIT) return { ok: false, message: `This paragraph is ${String(text).length - COVER_LETTER_PARAGRAPH_LIMIT} characters over the ${COVER_LETTER_PARAGRAPH_LIMIT.toLocaleString('en-US')}-character limit. Shorten it before saving; your draft and full input are preserved.` };
  const next = clean(text, Number.POSITIVE_INFINITY);
  if (hasInternalDocumentLanguage(next)) return { ok: false, message: "Remove internal application terminology from the letter." };
  const meaningIssues = claimMeaningIssues(next, paragraph?.evidenceRefs || [], { candidateCorpus: baseResume });
  const contributionIssue = contributionEditIssue(next, paragraph?.evidenceRefs || []);
  if (contributionIssue) meaningIssues.push(contributionIssue);
  if (meaningIssues.length) return { ok: false, message: meaningIssues.join(" ") };
  if (next.length < 20) return { ok: false, message: "Keep at least one complete, specific sentence or remove the paragraph." };
  if (containsSelfDisqualifyingCoverLetterLanguage(next)) {
    return { ok: false, message: "Keep the letter focused on relevant strengths. Leave missing qualifications and fit concerns out of employer-facing wording." };
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
  const internalLanguage = (plan?.paragraphs || []).some((entry) => hasInternalDocumentLanguage(entry.text));
  const meaningChanged = !internalLanguage && (plan?.paragraphs || []).some((entry) => claimMeaningIssues(entry.text, entry.evidenceRefs, { candidateCorpus: baseResume }).length > 0 || entry.text.length > COVER_LETTER_PARAGRAPH_LIMIT);
  const selfDisqualifying = (plan?.paragraphs || []).some((entry) => containsSelfDisqualifyingCoverLetterLanguage(entry.text));
  const incomplete = (plan?.paragraphs?.length || 0) < 2 || !plan?.candidate?.fullName || !plan?.target?.jobTitle;
  const missingIdentity = !hasUsableResumeIdentity(plan?.candidate?.fullName);
  const requirementCount = Array.isArray(atsReview?.requirements) ? atsReview.requirements.length : 0;
  const coverageTotal = ["direct", "adjacent", "transferable", "missing"]
    .reduce((total, key) => total + Number(atsReview?.coverage?.[key] || 0), 0);
  const assessmentIncomplete = !hasVerifiedPosting(atsReview) || requirementCount === 0 || requirementCount !== coverageTotal;
  const pendingConfirmations = pendingApplicationConfirmations(atsReview);
  const significantGap = ["significant_gap", "needs_full_posting"].includes(atsReview?.readiness?.status) || pendingConfirmations.length > 0;
  const integrityBlocked = atsReview?.integrity?.status === "blocked";
  const blocked = missingIdentity || stale || invalidHash || unverified || selfDisqualifying || internalLanguage || incomplete || integrityBlocked || meaningChanged;
  const preliminary = !blocked && (assessmentIncomplete || significantGap);
  return {
    state: blocked ? "blocked" : preliminary ? "preliminary" : "application_ready",
    canExport: !blocked,
    preliminary,
    stale,
    invalidHash,
    selfDisqualifying,
    internalLanguage,
    meaningChanged,
    pendingConfirmations,
    message: missingIdentity
      ? "Add your real name to the saved résumé before exporting a cover letter."
      : integrityBlocked
        ? "Resolve the résumé evidence integrity issues before exporting a matching cover letter."
      : meaningChanged
        ? "This wording changes the scope or responsibility in its sources. Edit the affected paragraph or regenerate the letter before exporting."
      : stale
        ? "The résumé, posting, or confirmed evidence changed. Generate the letter again before exporting."
        : invalidHash
          ? "The letter content no longer matches its trusted draft. Generate it again."
          : unverified
            ? "Recheck or restore the edited paragraph before exporting."
            : internalLanguage
              ? "This saved draft contains internal application wording. Edit the affected paragraph or regenerate the letter; your draft is preserved."
            : selfDisqualifying
              ? "This saved draft uses self-disqualifying language from an earlier version. Generate a fresh draft before exporting."
              : incomplete
                ? "Generate a complete evidence-backed letter before exporting."
                : pendingConfirmations.length
                  ? `Document checks passed. ${pendingConfirmations.map(r=>r.message).join(' ')}`
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
    candidateCorpus: context.baseResume || '',
    readiness,
    sourceFingerprint: createCoverLetterSourceFingerprint(context),
    applicationPresentation,
    authorizationHash: stableHash({ contentHash: plan.contentHash, sourceFingerprint: plan.sourceFingerprint, candidateCorpusHash: stableHash(context.baseResume || '', 'candidate-evidence'), presentationHash: applicationPresentation.presentationHash, mode: readiness.preliminary ? "preliminary" : "final" }, "cover-authorization"),
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
  if ((context.plan?.paragraphs || []).some((entry) => hasInternalDocumentLanguage(entry.text))) throw new Error("Remove internal application wording before exporting.");
  if ((context.plan?.paragraphs || []).some((entry) => claimMeaningIssues(entry.text, entry.evidenceRefs, { candidateCorpus: context.candidateCorpus }).length || entry.text.length > COVER_LETTER_PARAGRAPH_LIMIT)) throw new Error("Correct wording that changes the scope or responsibility in its sources before exporting.");
  const applicationPresentation = validateApplicationPresentation(context.applicationPresentation);
  const expectedAuthorization = stableHash({
    contentHash: context.plan.contentHash,
    sourceFingerprint: context.plan.sourceFingerprint,
    candidateCorpusHash: stableHash(context.candidateCorpus || '', 'candidate-evidence'),
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
    plan?.createdAt && Number.isFinite(new Date(plan.createdAt).getTime()) ? new Date(plan.createdAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" }) : undefined,
    plan?.target?.company,
    coverLetterRecipientAddress(plan?.target),
    plan?.target?.jobTitle ? `Re: ${plan.target.jobTitle}` : undefined,
    "",
    plan?.salutation,
    "",
    ...(plan?.paragraphs || []).flatMap((paragraph) => [paragraph.text, ""]),
    plan?.signoff,
    plan?.candidate?.fullName,
  ].filter((value, index, values) => value !== undefined && !(value === "" && values[index - 1] === "")).join("\n").trim();
}

export function safeCoverLetterFilename(plan, extension, { preliminary = false } = {}) {
  const base = [plan?.candidate?.fullName || "candidate", plan?.target?.jobTitle || "application", "cover-letter", ...(preliminary ? ["preliminary"] : [])]
    .join("-")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
  return `${base || "cover-letter"}.${extension}`;
}
