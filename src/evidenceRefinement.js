const ANSWER_STATES = new Set(["yes", "no", "unsure"]);
const EVIDENCE_SCOPES = new Set(["application", "profile"]);

export function evidenceAnswerState(record = {}) {
  if (ANSWER_STATES.has(record.answer_status)) return record.answer_status;
  if (record.declined === true) return "no";
  if (String(record.answer || "").trim()) return "yes";
  return "";
}

export function normalizeEvidenceDraft(record = {}) {
  const answerStatus = evidenceAnswerState(record);
  return {
    ...record,
    capability_level: capabilityLevel(record),
    evidence_kind: record.evidence_kind === "self_attested_capability" ? "self_attested_capability" : "candidate_example",
    answer_status: answerStatus,
    scope: EVIDENCE_SCOPES.has(record.scope) ? record.scope : "application",
    declined: answerStatus === "no",
    user_confirmed: answerStatus === "no" || (answerStatus === "yes" && record.user_confirmed === true),
  };
}

function selfAttestedCapabilityStatement(record = {}) {
  return capabilityStatement(record);
}

export function candidateEvidencePreview(record = {}) {
  const normalized = normalizeEvidenceDraft(record);
  if (normalized.answer_status === "no") return "No additional experience confirmed for this requirement.";
  if (normalized.answer_status === "unsure") return "Not sure — this will not be used as supporting evidence.";
  if (normalized.answer_status !== "yes") return "Select this capability if it accurately describes you.";

  const answer = String(normalized.answer || "").trim() || selfAttestedCapabilityStatement(normalized);
  if (!answer) return "Select this capability if it accurately describes you.";

  return [
    `Candidate statement: ${answer}`,
    `Responsibility level: ${String(normalized.contribution_level || "supported").trim()}.`,
    normalized.employer_or_project ? `Employer/project: ${String(normalized.employer_or_project).trim()}.` : "",
    normalized.approximate_date ? `Approximate date: ${String(normalized.approximate_date).trim()}.` : "",
    normalized.context ? `Result/context: ${String(normalized.context).trim()}.` : "",
  ].filter(Boolean).join(" ");
}

export function prepareCandidateEvidenceForSubmission(records = []) {
  return (Array.isArray(records) ? records : []).map((record) => {
    const normalized = normalizeEvidenceDraft(record);
    const selectedCapability = normalized.answer_status === "yes"
      && normalized.evidence_kind === "self_attested_capability"
      && String(normalized.requirement || "").trim().length >= 3;
    const sourceAnswer = String(normalized.answer || "").trim();
    const generatedStatement = /^I have (?:this capability|a capability|knowledge|hands-on experience)|^I have led or owned work/i.test(sourceAnswer);
    const answer = selectedCapability && (!sourceAnswer || generatedStatement) ? selfAttestedCapabilityStatement(normalized) : sourceAnswer;
    const hasUsableYesAnswer = normalized.answer_status === "yes" && answer.length >= 3;
    return {
      ...normalized,
      answer,
      user_confirmed: normalized.answer_status === "no" || hasUsableYesAnswer,
    };
  });
}

export function submittableCandidateEvidence(records = []) {
  return (Array.isArray(records) ? records : [])
    .map(normalizeEvidenceDraft)
    .filter((record) => record.answer_status === "no" || (
      record.answer_status === "yes"
      && record.user_confirmed === true
      && (String(record.answer || "").trim().length >= 3 || (
        record.evidence_kind === "self_attested_capability"
        && String(record.requirement || "").trim().length >= 3
      ))
    ));
}
import { capabilityLevel, capabilityStatement } from "./capabilityClaims.js";
