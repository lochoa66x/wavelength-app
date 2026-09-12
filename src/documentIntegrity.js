import { candidateClaimIssues, credentialEvidenceIssues, normalizeClaimNumbers } from './candidateClaims.js';
// Shared by generation, saved-draft review, and export authorization.
// These checks catch specific meaning changes; they are not a general fact checker.
export const INTERNAL_DOCUMENT_LANGUAGE = /\b(?:candidate[- ](?:selected|confirmed) (?:capabilit(?:y|ies)|evidence)|evidence-backed strength|why this paragraph exists|usage boundary|candidate citation catalog)\b|\[(?:CANDIDATE NOTE|C\d+|P\d+)[^\]]*\]/i;

export function hasInternalDocumentLanguage(text) {
  return INTERNAL_DOCUMENT_LANGUAGE.test(String(text || ""));
}

export function claimMeaningIssues(proposed, sources = [], context = {}) {
  const text = String(proposed || "");
  const source = sources.map((entry) => typeof entry === "string" ? entry : entry?.excerpt || "").join(" ");
  const issues = [];
  const statements = sources.map((entry) => typeof entry === "string" ? entry : entry?.excerpt || "")
    .map((entry) => entry.replace(/^[\s•*-]+/, "").trim()).filter(Boolean);
  const normalizedSource = normalizeClaimNumbers(source);
  for (const match of normalizeClaimNumbers(text).matchAll(/\balongside\s+(\d+)\s+(educators?|teachers?|staff|people|workers?|mechanics?|carpenters?)\b/gi)) {
    const [, count, people] = match;
    const explicitAlongside = new RegExp(`\\balongside\\s+${count}\\s+${people}\\b`, "i");
    const totalGroup = new RegExp(`\\b(?:room|classroom|team|crew)\\b[^.!?]{0,90}\\b(?:with|of)\\b[^.!?]{0,45}\\b${count}\\s+${people}\\b`, "i");
    if (totalGroup.test(normalizedSource) && !explicitAlongside.test(normalizedSource)) issues.push("Preserve the stated total group size; do not rewrite it as that many additional colleagues alongside the candidate.");
  }
  const participationOnly = statements.length > 0 && statements.every((entry) => /^(?:I )?(?:participated|contributed|assisted|supported)\b/i.test(entry));
  const directAction = text.match(/(?:^|\bI (?:also )?(?:have )?)(created|implemented|configured|developed|designed|integrated)\b/i)?.[1];
  if (participationOnly && directAction && !statements.some((entry) => new RegExp(`\\b${directAction}\\b`, "i").test(entry))) {
    issues.push("The cited sources describe participation or contribution. Keep that responsibility level instead of claiming the work was independently created or implemented.");
  }
  const trainingOnly = /\b(?:train(?:ed|ing)|guidance|advis(?:ed|ing))\b/i.test(source)
    && !/\b(?:implemented|configured|owned|led|managed|responsible for (?:the )?(?:implementation|configuration))\b/i.test(source);
  if (trainingOnly && /\b(?:responsible for|implemented|configured|owned|led|managed|supervised)\b/i.test(text)) {
    issues.push("Training or guidance does not establish implementation ownership.");
  }
  const qualifier = /\b(?:projected|forecast|estimated|expected|potential)\b/i;
  const clauses = (value) => value.split(/;|(?<!\d)\.|\.(?!\d)/).filter(Boolean);
  const metrics = (value) => [...value.matchAll(/\b\d+(?:\.\d+)?\s*%/g)].map((match) => match[0].replace(/\s/g, ""));
  const projectedMetrics = clauses(source).flatMap((clause) => {
    const start = clause.search(qualifier);
    return start < 0 ? [] : metrics(clause.slice(start));
  });
  for (const metric of projectedMetrics) {
    if (clauses(text).some((clause) => metrics(clause).includes(metric) && !qualifier.test(clause))) {
      issues.push("Keep projected or estimated results qualified as such.");
      break;
    }
  }
  if (hasInternalDocumentLanguage(text)) issues.push("Remove internal document-generation terminology.");
  return [...new Set([...issues, ...candidateClaimIssues(proposed, sources, context)])];
}

// An edit is scoped to the paragraph's citations. A leadership verb elsewhere
// in the résumé cannot promote this paragraph's support work to ownership.
export function contributionEditIssue(proposed, sources = []) {
  const leadership = /\b(?:led|owned|managed|directed|oversaw|supervised|was responsible for)\b/i;
  const sourceText = sources.map((entry) => typeof entry === "string" ? entry : entry?.excerpt || "").join(" ");
  const pastClaim = /\bI (?:have )?(?:led|owned|managed|directed|overseen|supervised|was responsible for)\b/i.test(proposed);
  return pastClaim && !leadership.test(sourceText)
    ? "The cited evidence does not establish leadership or ownership of this work. Keep the supported responsibility level or regenerate using relevant evidence."
    : "";
}

const OWNERSHIP_PARTS = [
  [/\bbudget\b/i, /\bbudget\b/i],
  [/\bresourc(?:e|es|ing)\b/i, /\bresourc(?:e|es|ing)\b/i],
  [/\bRAID\b/i, /\bRAID\b|\brisks?.*issues?.*dependencies\b/i],
  [/\bsteering\b/i, /\bsteering\b/i],
];

export function requirementEvidenceBoundary(requirement, evidence) {
  const target = String(requirement || "");
  const source = String(evidence || "");
  const credentials = credentialEvidenceIssues(target, source);
  if (credentials.length) return { valid: false, reason: credentials[0] };
  const tenure = normalizeClaimNumbers(target).match(/\b(\d+)\s*\+?\s*years?\b/i);
  if (tenure) {
    const actual = normalizeClaimNumbers(source).match(/\b(\d+)\s*\+?\s*years?\b/i);
    if (!actual || Number(actual[1]) < Number(tenure[1])) return { valid: false, reason: 'This excerpt does not establish the required duration of experience.' };
  }
  if (/\b(?:lead|own|manage|direct|supervise|independently)\b/i.test(target)
      && /\b(?:observed|assisted|supported|helped|knowledge|under supervision)\b/i.test(source)
      && !/\b(?:led|owned|managed|directed|supervised|accountable)\b/i.test(source)) {
    return { valid: true, classification: 'adjacent', reason: 'Related experience is supported; independent leadership or ownership is not established.' };
  }
  const requiredParts = OWNERSHIP_PARTS.filter(([pattern]) => pattern.test(target));
  if (/\b(?:own|lead|manage|direct)\b/i.test(target) && requiredParts.length) {
    if (!/\b(?:project|delivery|PMO|planning|plan|budget|resources?|resourcing|RAID|steering|reporting|deliverables?)\b/i.test(source)) {
      return { valid: false, reason: "This evidence does not establish related project responsibility." };
    }
    const missing = requiredParts.some(([, pattern]) => !pattern.test(source));
    const owner = /\b(?:owned|led|managed|directed|accountable|responsible for)\b/i.test(source);
    if (missing || !owner) return { valid: true, classification: "adjacent", reason: "Related delivery evidence; full responsibility and ownership are not established." };
  }
  return { valid: true, classification: null, reason: "" };
}

// Job location and remote eligibility are not employer mailing addresses.
// Only an explicitly supplied employer address belongs in the recipient block.
export function coverLetterRecipientAddress(target = {}) {
  return String(target.employerAddress || "").trim();
}
