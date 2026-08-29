import test from "node:test";
import assert from "node:assert/strict";

import { formatCandidateEvidence, validateCandidateEvidence } from "../api/_lib/candidateEvidence.js";
import { validateEvidenceCoachProposal } from "../api/_lib/evidenceCoach.js";

test("candidate evidence requires explicit confirmation", () => {
  const result = validateCandidateEvidence([{ requirement_id: "R1", answer: "Led workshops." }]);
  assert.equal(result.evidence.length, 0);
  assert.match(result.errors[0], /confirmed/);
});

test("validated candidate evidence is normalized and formatted separately", () => {
  const result = validateCandidateEvidence([{
    id: "n1",
    requirement_id: "R1",
    answer: "  Led SAP finance workshops.  ",
    context: "S/4HANA design",
    contribution_level: "led",
    user_confirmed: true,
  }]);
  assert.equal(result.errors.length, 0);
  assert.equal(result.evidence[0].source, "candidate_note");
  assert.match(formatCandidateEvidence(result.evidence), /Answer: Led SAP finance workshops\./);
});

test("declining a question becomes an explicit hard constraint, not supporting evidence", () => {
  const result = validateCandidateEvidence([{
    id: "n1",
    requirement_id: "R1",
    answer_status: "no",
    user_confirmed: true,
  }]);
  assert.equal(result.errors.length, 0);
  assert.equal(result.evidence[0].answer, "");
  assert.match(formatCandidateEvidence(result.evidence), /do not imply or add this experience/);
});

test("validated evidence preserves its application or reusable scope", () => {
  const result = validateCandidateEvidence([{
    id: "n1",
    requirement_id: "R1",
    answer_status: "yes",
    answer: "Supported the S/4HANA integration design.",
    scope: "profile",
    contribution_level: "supported",
    user_confirmed: true,
  }]);
  assert.equal(result.errors.length, 0);
  assert.equal(result.evidence[0].scope, "profile");
  assert.match(formatCandidateEvidence(result.evidence), /Scope: profile/);
});

test("approved coach evidence is revalidated and retains traceable provenance", () => {
  const coachInput = {
    requirement: { id: "R1", text: "Facilitate workshops", question: "What did you do?" },
    candidate_input: {
      answer: "I facilitated requirements workshops.",
      context: "Finance and technology attended.",
      employer_or_project: "Northstar",
      approximate_date: "2023",
      contribution_level: "contributed",
      follow_up_answer: "",
    },
  };
  const coachProposal = {
    proposed_wording: "Facilitated requirements workshops attended by finance and technology.",
    facts_used: [
      { source_field: "answer", source_excerpt: "facilitated requirements workshops" },
      { source_field: "context", source_excerpt: "Finance and technology attended" },
    ],
    unresolved_details: [],
    follow_up_question: "",
    contribution_level: "contributed",
    confidence: "high",
    disposition: "reviewable",
  };
  const checked = validateEvidenceCoachProposal(coachProposal, coachInput);
  assert.deepEqual(checked.issues, []);

  const result = validateCandidateEvidence([{
    id: "n1",
    requirement_id: "R1",
    requirement: coachInput.requirement.text,
    question: coachInput.requirement.question,
    answer_status: "yes",
    answer: checked.proposal.proposed_wording,
    raw_answer: coachInput.candidate_input.answer,
    context: coachInput.candidate_input.context,
    employer_or_project: coachInput.candidate_input.employer_or_project,
    approximate_date: coachInput.candidate_input.approximate_date,
    contribution_level: "contributed",
    coach_proposal: checked.proposal,
    coach_status: "approved",
    approval_status: "approved",
    evidence_hash: checked.proposal.evidence_hash,
    user_confirmed: true,
  }]);
  assert.deepEqual(result.errors, []);
  assert.equal(result.evidence[0].provenance.kind, "evidence_coach");
  assert.equal(result.evidence[0].provenance.raw_answer, coachInput.candidate_input.answer);
  assert.equal(result.evidence[0].provenance.evidence_hash, checked.proposal.evidence_hash);
});

test("tampering with an approved coach proposal is rejected before tailoring", () => {
  const result = validateCandidateEvidence([{
    requirement_id: "R1",
    requirement: "Facilitate workshops",
    question: "What did you do?",
    answer_status: "yes",
    answer: "Managed 40 employees.",
    raw_answer: "I attended one workshop.",
    contribution_level: "supported",
    coach_proposal: {
      proposed_wording: "Managed 40 employees.",
      facts_used: [{ source_field: "answer", source_excerpt: "attended one workshop" }],
      unresolved_details: [],
      follow_up_question: "",
      contribution_level: "led",
      confidence: "high",
      disposition: "reviewable",
    },
    coach_status: "approved",
    approval_status: "approved",
    evidence_hash: "a".repeat(64),
    user_confirmed: true,
  }]);
  assert.equal(result.evidence.length, 0);
  assert.match(result.errors.join(" "), /stale or unverified/);
});
