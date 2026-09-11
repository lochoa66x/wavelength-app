import { validateEvidenceCoachProposal } from "./evidenceCoach.js";
import { capabilityLevel, capabilityStatement } from "../../src/capabilityClaims.js";

const MAX_EVIDENCE_ITEMS = 12;

const CONTRIBUTION_LEVELS = new Set(["supported", "contributed", "owned", "led"]);
const EVIDENCE_SCOPES = new Set(["application", "profile"]);

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
    const declined = raw.answer_status === "no" || raw.declined === true;
    const requirementId = cleanText(raw.requirement_id, 40);
    const requirement = cleanText(raw.requirement, 1500);
    const evidenceKind = raw.evidence_kind === "self_attested_capability" ? "self_attested_capability" : "candidate_example";
    const selfAttestedAnswer = evidenceKind === "self_attested_capability" && requirement
      ? capabilityStatement({ ...raw, requirement })
      : "";
    const answer = cleanText(raw.answer, 1200) || selfAttestedAnswer;
    if (raw.user_confirmed !== true) errors.push(`Answer ${index + 1} must be confirmed by the candidate.`);
    if (!requirementId) errors.push(`Answer ${index + 1} is missing its requirement reference.`);
    if (!declined && answer.length < 3) errors.push(`Answer ${index + 1} needs a factual response or “I don't have this experience.”`);
    let coachProvenance = null;
    if (!declined && (raw.coach_status === "approved" || raw.approval_status === "approved" || raw.evidence_hash)) {
      if (raw.coach_status !== "approved" || raw.approval_status !== "approved") {
        errors.push(`Answer ${index + 1} has an evidence proposal that was not explicitly approved.`);
      } else {
        const coachInput = {
          requirement: {
            id: requirementId,
            text: cleanText(raw.requirement, 1500),
            question: cleanText(raw.question, 1000),
          },
          candidate_input: {
            answer: cleanText(raw.raw_answer, 1200),
            context: cleanText(raw.context, 500),
            approximate_date: cleanText(raw.approximate_date, 80),
            employer_or_project: cleanText(raw.employer_or_project, 180),
            contribution_level: CONTRIBUTION_LEVELS.has(raw.contribution_level) ? raw.contribution_level : "supported",
            follow_up_answer: cleanText(raw.coach_follow_up_answer, 800),
          },
        };
        const checked = validateEvidenceCoachProposal(raw.coach_proposal, coachInput);
        if (checked.issues.length || checked.proposal.evidence_hash !== raw.evidence_hash || checked.proposal.proposed_wording !== answer) {
          errors.push(`Answer ${index + 1} has a stale or unverified evidence proposal.`);
        } else {
          coachProvenance = {
            kind: "evidence_coach",
            approval_status: "approved",
            evidence_hash: checked.proposal.evidence_hash,
            raw_answer: coachInput.candidate_input.answer,
            facts_used: checked.proposal.facts_used,
          };
        }
      }
    }
    if (errors.length > errorCountBefore) return;

    evidence.push({
      id: cleanText(raw.id, 80) || `candidate-note-${index + 1}`,
      requirement_id: requirementId,
      requirement,
      source: "candidate_note",
      evidence_kind: evidenceKind,
      capability_level: capabilityLevel(raw),
      answer: declined ? "" : answer,
      context: declined ? "" : cleanText(raw.context, 500),
      approximate_date: declined ? "" : cleanText(raw.approximate_date, 80),
      employer_or_project: declined ? "" : cleanText(raw.employer_or_project, 180),
      contribution_level: CONTRIBUTION_LEVELS.has(raw.contribution_level) ? raw.contribution_level : "supported",
      scope: EVIDENCE_SCOPES.has(raw.scope) ? raw.scope : "application",
      answer_status: declined ? "no" : "yes",
      declined,
      user_confirmed: true,
      created_at: cleanText(raw.created_at, 40) || new Date().toISOString(),
      ...(coachProvenance ? { provenance: coachProvenance } : {}),
    });
  });

  return errors.length ? { evidence: [], errors } : { evidence, errors: [] };
}

export function formatCandidateEvidence(evidence) {
  const confirmed = (evidence || []).filter((item) => item.user_confirmed === true && (item.declined || item.answer));
  if (!confirmed.length) return "No additional candidate-confirmed notes were supplied.";
  return confirmed.map((item) => item.declined
    ? [
        `[CANDIDATE NOTE ${item.id}]`,
        `Requirement: ${item.requirement_id}`,
        "Candidate response: No — do not imply or add this experience.",
      ].join("\n")
    : item.evidence_kind === "self_attested_capability" ? [
        `[CANDIDATE NOTE ${item.id}]`,
        `Requirement: ${item.requirement_id}`,
        `Confirmed experience level: ${capabilityLevel(item)}.`,
        `Candidate statement: ${capabilityStatement(item)}`,
        item.answer && !/^I have (?:this capability|a capability|knowledge|hands-on experience|led or owned work)/i.test(item.answer) ? `Optional candidate detail: ${item.answer}` : "",
        `Scope: ${item.scope}`,
        "Usage boundary: Knowledge means familiarity, applied means hands-on work, led means leadership in this area. Unspecified legacy selections do not establish hands-on experience or leadership. Never copy these metadata labels into document prose. Do not invent an employer, project, date, duration, result, credential, or historical accomplishment.",
      ].filter(Boolean).join("\n")
    : [
        `[CANDIDATE NOTE ${item.id}]`,
        `Requirement: ${item.requirement_id}`,
        `Contribution level: ${item.contribution_level}`,
        `Scope: ${item.scope}`,
        `Answer: ${item.answer}`,
        item.context ? `Context: ${item.context}` : "",
        item.employer_or_project ? `Employer or project: ${item.employer_or_project}` : "",
        item.approximate_date ? `Approximate date: ${item.approximate_date}` : "",
      ].filter(Boolean).join("\n"))
    .join("\n\n");
}
