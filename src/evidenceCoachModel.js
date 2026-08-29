const CONTRIBUTION_LEVELS = new Set(["supported", "contributed", "owned", "led"]);
const DISPOSITIONS = new Set(["reviewable", "follow_up"]);
const CONFIDENCE_LEVELS = new Set(["high", "medium", "low"]);

function clean(value, maxLength = 1_600) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";
}

export function normalizeEvidenceCoachProposal(raw = {}) {
  const disposition = DISPOSITIONS.has(raw.disposition) ? raw.disposition : "follow_up";
  return {
    proposed_wording: disposition === "reviewable" ? clean(raw.proposed_wording) : "",
    facts_used: Array.isArray(raw.facts_used)
      ? raw.facts_used.slice(0, 10).map((fact) => ({
        source_field: clean(fact?.source_field, 40),
        source_excerpt: clean(fact?.source_excerpt, 500),
      })).filter((fact) => fact.source_field && fact.source_excerpt)
      : [],
    unresolved_details: Array.isArray(raw.unresolved_details)
      ? raw.unresolved_details.slice(0, 8).map((entry) => clean(entry, 240)).filter(Boolean)
      : [],
    follow_up_question: disposition === "follow_up" ? clean(raw.follow_up_question, 600) : "",
    contribution_level: CONTRIBUTION_LEVELS.has(raw.contribution_level) ? raw.contribution_level : "supported",
    confidence: CONFIDENCE_LEVELS.has(raw.confidence) ? raw.confidence : "low",
    disposition,
    evidence_hash: clean(raw.evidence_hash, 80),
  };
}

export function attachEvidenceCoachProposal(record = {}, rawProposal = {}) {
  const proposal = normalizeEvidenceCoachProposal(rawProposal);
  return {
    ...record,
    raw_answer: clean(record.raw_answer || record.answer, 1_200),
    coach_proposal: proposal,
    coach_edit: proposal.proposed_wording,
    coach_status: proposal.disposition === "reviewable" ? "pending_review" : "follow_up",
    approval_status: "pending",
    evidence_hash: proposal.evidence_hash,
    user_confirmed: false,
  };
}

export function approveEvidenceCoachProposal(record = {}) {
  const proposal = normalizeEvidenceCoachProposal(record.coach_proposal);
  if (proposal.disposition !== "reviewable" || proposal.proposed_wording.length < 3) return record;
  return {
    ...record,
    answer: proposal.proposed_wording,
    contribution_level: proposal.contribution_level,
    coach_status: "approved",
    approval_status: "approved",
    user_confirmed: true,
  };
}

export function editEvidenceCoachProposal(record = {}) {
  const edited = clean(record.coach_edit || record.coach_proposal?.proposed_wording, 1_600);
  return {
    ...record,
    answer: edited,
    raw_answer: clean(record.raw_answer || record.answer, 1_200),
    coach_proposal: null,
    coach_edit: "",
    coach_status: "candidate_edit",
    approval_status: "",
    evidence_hash: "",
    user_confirmed: false,
  };
}

export function rejectEvidenceCoachProposal(record = {}) {
  return {
    ...record,
    answer: clean(record.raw_answer || record.answer, 1_200),
    coach_proposal: null,
    coach_edit: "",
    coach_follow_up_answer: "",
    coach_status: "rejected",
    approval_status: "rejected",
    evidence_hash: "",
    user_confirmed: false,
  };
}

export function evidenceCoachRequest(record = {}, question = {}) {
  return {
    requirement: {
      id: clean(question.requirement_id || record.requirement_id, 40),
      text: clean(question.requirement || record.requirement, 1_500),
      question: clean(question.question || record.question, 1_000),
    },
    candidate_input: {
      answer: clean(record.raw_answer || record.answer, 1_200),
      context: clean(record.context, 500),
      employer_or_project: clean(record.employer_or_project, 180),
      approximate_date: clean(record.approximate_date, 80),
      contribution_level: CONTRIBUTION_LEVELS.has(record.contribution_level) ? record.contribution_level : "supported",
      follow_up_answer: clean(record.coach_follow_up_answer, 800),
    },
  };
}

export function clearEvidenceCoachReview(record = {}) {
  return {
    ...record,
    coach_proposal: null,
    coach_edit: "",
    coach_follow_up_answer: "",
    coach_status: "",
    approval_status: "",
    evidence_hash: "",
    raw_answer: "",
  };
}
