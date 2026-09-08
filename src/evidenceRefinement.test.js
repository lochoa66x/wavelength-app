import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import {
  candidateEvidencePreview,
  evidenceAnswerState,
  normalizeEvidenceDraft,
  prepareCandidateEvidenceForSubmission,
  submittableCandidateEvidence,
} from "./evidenceRefinement.js";

const panelSource = readFileSync(new URL("./EvidenceRefinementPanel.jsx", import.meta.url), "utf8");

test("legacy candidate notes retain their answer state", () => {
  assert.equal(evidenceAnswerState({ answer: "Led the workshops." }), "yes");
  assert.equal(evidenceAnswerState({ declined: true }), "no");
});

test("not-sure answers stay local and unconfirmed yes answers are not submitted", () => {
  const submitted = submittableCandidateEvidence([
    { id: "unsure", requirement_id: "R1", answer_status: "unsure" },
    { id: "unconfirmed", requirement_id: "R2", answer_status: "yes", answer: "Supported testing." },
    { id: "confirmed", requirement_id: "R3", answer_status: "yes", answer: "Led UAT workshops.", user_confirmed: true },
    { id: "no", requirement_id: "R4", answer_status: "no" },
  ]);

  assert.deepEqual(submitted.map((record) => record.id), ["confirmed", "no"]);
  assert.equal(submitted[1].declined, true);
  assert.equal(submitted[1].user_confirmed, true);
});

test("preview shows only literal candidate fields and responsibility level", () => {
  const preview = candidateEvidencePreview({
    answer_status: "yes",
    answer: "Facilitated requirements workshops.",
    contribution_level: "led",
    employer_or_project: "CBSA",
    approximate_date: "2023",
    context: "S/4HANA integration",
  });

  assert.match(preview, /Candidate statement: Facilitated requirements workshops\./);
  assert.match(preview, /Responsibility level: led\./);
  assert.match(preview, /Employer\/project: CBSA\./);
  assert.match(preview, /Approximate date: 2023\./);
  assert.match(preview, /Result\/context: S\/4HANA integration\./);
});

test("normalization never confirms a positive answer implicitly", () => {
  const normalized = normalizeEvidenceDraft({ answer_status: "yes", answer: "Configured the workflow." });
  assert.equal(normalized.user_confirmed, false);
  assert.equal(normalized.scope, "application");
});

test("using complete answers is the single candidate action that prepares them for submission", () => {
  const prepared = prepareCandidateEvidenceForSubmission([
    { id: "yes", requirement_id: "R1", answer_status: "yes", answer: "Configured contract accounts." },
    { id: "empty", requirement_id: "R2", answer_status: "yes", answer: "" },
    { id: "no", requirement_id: "R3", answer_status: "no" },
    { id: "unsure", requirement_id: "R4", answer_status: "unsure" },
  ]);

  assert.equal(prepared[0].user_confirmed, true);
  assert.equal(prepared[1].user_confirmed, false);
  assert.equal(prepared[2].user_confirmed, true);
  assert.equal(prepared[3].user_confirmed, false);
  assert.deepEqual(submittableCandidateEvidence(prepared).map((record) => record.id), ["yes", "no"]);
});

test("evidence refinement is optional, compact, and has no redundant confirmation checkbox", () => {
  assert.match(panelSource, /Strengthen this draft/);
  assert.match(panelSource, /Up to \$\{visibleQuestions\.length\} short questions/);
  assert.match(panelSource, /Use these answers/);
  assert.match(panelSource, /Remember this answer on this browser for future applications/);
  assert.doesNotMatch(panelSource, /I confirm this preview|confirm the preview before re-tailoring/);
});
