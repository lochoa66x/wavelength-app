import test from "node:test";
import assert from "node:assert/strict";

import {
  approveEvidenceCoachProposal,
  attachEvidenceCoachProposal,
  editEvidenceCoachProposal,
  evidenceCoachRequest,
  rejectEvidenceCoachProposal,
} from "./evidenceCoachModel.js";

const record = {
  requirement_id: "R1",
  requirement: "Coordinate stakeholder workshops",
  question: "What did you do?",
  answer: "I facilitated workshops.",
  contribution_level: "contributed",
  user_confirmed: false,
};
const proposal = {
  proposed_wording: "Facilitated stakeholder workshops.",
  facts_used: [{ source_field: "answer", source_excerpt: "facilitated workshops" }],
  unresolved_details: [],
  follow_up_question: "",
  contribution_level: "contributed",
  confidence: "high",
  disposition: "reviewable",
  evidence_hash: "a".repeat(64),
};

test("a proposal remains unconfirmed until the candidate approves it", () => {
  const pending = attachEvidenceCoachProposal(record, proposal);
  assert.equal(pending.raw_answer, record.answer);
  assert.equal(pending.answer, record.answer);
  assert.equal(pending.user_confirmed, false);
  assert.equal(pending.coach_status, "pending_review");

  const approved = approveEvidenceCoachProposal(pending);
  assert.equal(approved.answer, proposal.proposed_wording);
  assert.equal(approved.user_confirmed, true);
  assert.equal(approved.approval_status, "approved");
});

test("editing converts the proposal back into an unconfirmed candidate statement", () => {
  const pending = attachEvidenceCoachProposal(record, proposal);
  const edited = editEvidenceCoachProposal({ ...pending, coach_edit: "I facilitated two workshops." });
  assert.equal(edited.answer, "I facilitated two workshops.");
  assert.equal(edited.coach_proposal, null);
  assert.equal(edited.user_confirmed, false);
  assert.equal(edited.coach_status, "candidate_edit");
});

test("rejecting restores the candidate's original source words", () => {
  const pending = attachEvidenceCoachProposal(record, proposal);
  const rejected = rejectEvidenceCoachProposal(pending);
  assert.equal(rejected.answer, record.answer);
  assert.equal(rejected.user_confirmed, false);
  assert.equal(rejected.approval_status, "rejected");
});

test("the coach request contains no full resume or unrelated profile fields", () => {
  const payload = evidenceCoachRequest({ ...record, email: "private@example.com", full_resume: "PRIVATE" }, record);
  assert.deepEqual(Object.keys(payload).sort(), ["candidate_input", "requirement"]);
  assert.equal(JSON.stringify(payload).includes("private@example.com"), false);
  assert.equal(JSON.stringify(payload).includes("PRIVATE"), false);
});
