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
    answer_status: answerStatus,
    scope: EVIDENCE_SCOPES.has(record.scope) ? record.scope : "application",
    declined: answerStatus === "no",
    user_confirmed: answerStatus === "no" || (answerStatus === "yes" && record.user_confirmed === true),
  };
}

export function candidateEvidencePreview(record = {}) {
  const normalized = normalizeEvidenceDraft(record);
  if (normalized.answer_status === "no") return "No additional experience confirmed for this requirement.";
  if (normalized.answer_status === "unsure") return "Not sure — this will not be used as supporting evidence.";
  if (normalized.answer_status !== "yes" || !String(normalized.answer || "").trim()) return "Add your own factual example to preview it here.";

  return [
    `Candidate statement: ${String(normalized.answer).trim()}`,
    `Responsibility level: ${String(normalized.contribution_level || "supported").trim()}.`,
    normalized.employer_or_project ? `Employer/project: ${String(normalized.employer_or_project).trim()}.` : "",
    normalized.approximate_date ? `Approximate date: ${String(normalized.approximate_date).trim()}.` : "",
    normalized.context ? `Result/context: ${String(normalized.context).trim()}.` : "",
  ].filter(Boolean).join(" ");
}

export function submittableCandidateEvidence(records = []) {
  return (Array.isArray(records) ? records : [])
    .map(normalizeEvidenceDraft)
    .filter((record) => record.answer_status === "no" || (
      record.answer_status === "yes"
      && record.user_confirmed === true
      && String(record.answer || "").trim().length >= 3
    ));
}
