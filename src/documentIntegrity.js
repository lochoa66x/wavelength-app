// Shared by generation, saved-draft review, and export authorization.
// These checks catch specific meaning changes; they are not a general fact checker.
export const INTERNAL_DOCUMENT_LANGUAGE = /\b(?:candidate[- ](?:selected|confirmed) (?:capabilit(?:y|ies)|evidence)|evidence-backed strength|why this paragraph exists|usage boundary|candidate citation catalog)\b|\[(?:CANDIDATE NOTE|C\d+|P\d+)[^\]]*\]/i;

export function hasInternalDocumentLanguage(text) {
  return INTERNAL_DOCUMENT_LANGUAGE.test(String(text || ""));
}

export function claimMeaningIssues(proposed, sources = []) {
  const text = String(proposed || "");
  const source = sources.map((entry) => typeof entry === "string" ? entry : entry?.excerpt || "").join(" ");
  const issues = [];
  const trainingOnly = /\b(?:train(?:ed|ing)|guidance|advis(?:ed|ing))\b/i.test(source)
    && !/\b(?:implemented|configured|owned|led|managed|responsible for (?:the )?(?:implementation|configuration))\b/i.test(source);
  if (trainingOnly && /\b(?:responsible for|implemented|configured|owned|led|managed|supervised)\b/i.test(text)) {
    issues.push("Training or guidance does not establish implementation ownership.");
  }
  const projectedMetrics = [...source.matchAll(/\b(?:projected|forecast|estimated|expected|potential)\b[^.;]{0,90}?(\d+(?:\.\d+)?\s*%)/gi)].map((match) => match[1].replace(/\s/g, ""));
  const proposedMetrics = text.replace(/\s*(%) /g, "$1 ");
  for (const metric of projectedMetrics) {
    if (proposedMetrics.includes(metric) && !text.split(/[.;]/).some((clause) => clause.replace(/\s/g, "").includes(metric) && /\b(?:projected|forecast|estimated|expected|potential)\b/i.test(clause))) {
      issues.push("Keep projected or estimated results qualified as such.");
      break;
    }
  }
  if (hasInternalDocumentLanguage(text)) issues.push("Remove internal document-generation terminology.");
  return issues;
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
  if (/\b(?:certification|certified|credential)\b/i.test(target)) {
    const named = [/\bPMP\b/i, /\bSAP Activate\b/i].filter((pattern) => pattern.test(target));
    if (named.length && !named.some((pattern) => pattern.test(source)
        && /\b(?:PMP|certified|certification|credential)\b/i.test(source))) {
      return { valid: false, reason: "Project experience does not establish the named credential." };
    }
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
