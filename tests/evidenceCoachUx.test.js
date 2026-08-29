import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const panel = readFileSync(new URL("../src/EvidenceRefinementPanel.jsx", import.meta.url), "utf8");
const privacy = readFileSync(new URL("../src/PrivateProcessingDialog.jsx", import.meta.url), "utf8");
const gate = readFileSync(new URL("../src/privateProcessing.js", import.meta.url), "utf8");

test("the optional coach exposes source, proposal, facts, unresolved details, and candidate controls", () => {
  for (const label of [
    "Your source words",
    "Proposed evidence statement",
    "Exact facts used",
    "Unresolved details",
    "Approve proposal",
    "Edit proposal",
    "Reject",
    "Answer follow-up",
    "Cancel",
  ]) assert.match(panel, new RegExp(label));
  assert.match(panel, /aria-live="polite"/);
});

test("evidence clarification has its own just-in-time private-processing disclosure", () => {
  assert.match(gate, /"evidence_coach"/);
  assert.match(privacy, /does not send your full résumé/);
  assert.match(privacy, /approve, edit, reject, or answer a follow-up/);
});
