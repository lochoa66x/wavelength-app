import test from "node:test";
import assert from "node:assert/strict";

import { createCoverLetterPlan } from "./coverLetterModel.js";
import { coverLetterStorageKey, loadCoverLetterDraft, loadCoverLetterDraftForReview, saveCoverLetterDraft } from "./coverLetterStorage.js";

function storage() {
  const values = new Map();
  return { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, String(value)), removeItem: (key) => values.delete(key) };
}

const baseResume = "Avery Chen\navery@example.com\nOffice Coordinator\nCoordinated customer requests.";
const resumeData = { name: "Avery Chen", contact: "avery@example.com", title: "Office Coordinator", profile: "Office coordinator.", experience: [{ role: "Office Coordinator", bullets: ["Coordinated customer requests."] }] };
const atsReview = { posting_readiness: { status: "reviewed_complete", fit_allowed: true, application_ready_allowed: true }, requirements: [{ id: "R1" }], coverage: { direct: 1 }, readiness: { status: "strong_fit" } };
const item = { id: "listing-1", title: "Administrative Assistant", company: "Cedar Services" };
const raw = { paragraphs: [{ id: "p1", purpose: "opening", text: "I am applying with experience coordinating customer requests.", evidence_refs: ["Coordinated customer requests."], requirement_refs: ["Customer requests"], explanation: "Uses verified coordination evidence.", evidence_match: "direct" }, { id: "p2", purpose: "closing", text: "Thank you for considering my application for this role.", evidence_refs: [], requirement_refs: [], explanation: "Closes the letter.", evidence_match: "neutral" }] };

test("cover-letter drafts are account- and target-scoped and reject stale sources", () => {
  const local = storage();
  const context = { baseResume, resumeData, item, atsReview };
  const plan = createCoverLetterPlan(raw, context);
  assert.equal(saveCoverLetterDraft("user-1", item, plan, local), true);
  assert.deepEqual(loadCoverLetterDraft("user-1", item, context, local), plan);
  assert.equal(loadCoverLetterDraft("user-2", item, context, local), null);
  assert.equal(loadCoverLetterDraft("user-1", item, { ...context, baseResume: `${baseResume}\nChanged` }, local), null);
  assert.deepEqual(loadCoverLetterDraftForReview("user-1", item, local), plan);
  assert.notEqual(coverLetterStorageKey("user-1", item), coverLetterStorageKey("user-2", item));
});

test("review loading rejects a locally corrupted letter while preserving a valid stale draft", () => {
  const local = storage();
  const context = { baseResume, resumeData, item, atsReview };
  const plan = createCoverLetterPlan(raw, context);
  saveCoverLetterDraft("user-1", item, plan, local);
  const key = coverLetterStorageKey("user-1", item);
  local.setItem(key, JSON.stringify({ ...plan, paragraphs: [{ ...plan.paragraphs[0], text: "tampered" }] }));
  assert.equal(loadCoverLetterDraftForReview("user-1", item, local), null);
});
