import test from "node:test";
import assert from "node:assert/strict";

import { formatCandidateEvidence, validateCandidateEvidence } from "../api/_lib/candidateEvidence.js";

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

test("declining a question is valid but is never formatted as supporting evidence", () => {
  const result = validateCandidateEvidence([{
    id: "n1",
    requirement_id: "R1",
    declined: true,
    user_confirmed: true,
  }]);
  assert.equal(result.errors.length, 0);
  assert.match(formatCandidateEvidence(result.evidence), /No additional/);
});

