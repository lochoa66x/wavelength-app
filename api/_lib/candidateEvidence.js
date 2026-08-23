const MAX_EVIDENCE_ITEMS = 5;

const CONTRIBUTION_LEVELS = new Set(["supported", "contributed", "owned", "led"]);

function cleanText(value, maxLength) {
  return String(value || "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function validateCandidateEvidence(input) {
  if (input == null) return { evidence: [], errors: [] };
  if (!Array.isArray(input)) {
    return { evidence: [], errors: ["candidateEvidence must be an array."] };
  }
  if (input.length > MAX_EVIDENCE_ITEMS) {
    return { evidence: [], errors: [`candidateEvidence accepts at most ${MAX_EVIDENCE_ITEMS} answers.`] };
  }

  const evidence = [];
  const errors = [];
  input.forEach((raw, index) => {
    const errorCountBefore = errors.length;
    if (!raw || typeof raw !== "object") {
      errors.push(`Answer ${index + 1} is invalid.`);
      return;
    }
    const declined = raw.declined === true;
    const requirementId = cleanText(raw.requirement_id, 40);
    const answer = cleanText(raw.answer, 1200);
    if (raw.user_confirmed !== true) errors.push(`Answer ${index + 1} must be confirmed by the candidate.`);
    if (!requirementId) errors.push(`Answer ${index + 1} is missing its requirement reference.`);
    if (!declined && answer.length < 3) errors.push(`Answer ${index + 1} needs a factual response or “I don't have this experience.”`);
    if (errors.length > errorCountBefore) return;

    evidence.push({
      id: cleanText(raw.id, 80) || `candidate-note-${index + 1}`,
      requirement_id: requirementId,
      source: "candidate_note",
      answer: declined ? "" : answer,
      context: declined ? "" : cleanText(raw.context, 500),
      approximate_date: declined ? "" : cleanText(raw.approximate_date, 80),
      employer_or_project: declined ? "" : cleanText(raw.employer_or_project, 180),
      contribution_level: CONTRIBUTION_LEVELS.has(raw.contribution_level) ? raw.contribution_level : "supported",
      declined,
      user_confirmed: true,
      created_at: cleanText(raw.created_at, 40) || new Date().toISOString(),
    });
  });

  return errors.length ? { evidence: [], errors } : { evidence, errors: [] };
}

export function formatCandidateEvidence(evidence) {
  const confirmed = (evidence || []).filter((item) => item.user_confirmed === true && !item.declined && item.answer);
  if (!confirmed.length) return "No additional candidate-confirmed notes were supplied.";
  return confirmed.map((item) => [
    `[CANDIDATE NOTE ${item.id}]`,
    `Requirement: ${item.requirement_id}`,
    `Contribution level: ${item.contribution_level}`,
    `Answer: ${item.answer}`,
    item.context ? `Context: ${item.context}` : "",
    item.employer_or_project ? `Employer or project: ${item.employer_or_project}` : "",
    item.approximate_date ? `Approximate date: ${item.approximate_date}` : "",
  ].filter(Boolean).join("\n")).join("\n\n");
}
