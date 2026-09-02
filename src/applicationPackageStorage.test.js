import test from "node:test";
import assert from "node:assert/strict";

import { createApplicationPackageState } from "./applicationPackageModel.js";
import { createCoverLetterPlan } from "./coverLetterModel.js";
import { coverLetterStorageKey } from "./coverLetterStorage.js";
import {
  applicationPackageStorageKey,
  listApplicationPackageStates,
  saveApplicationPackageState,
} from "./applicationPackageStorage.js";

function memoryStorage() {
  const values = new Map();
  return {
    get length() { return values.size; },
    key: (index) => [...values.keys()][index] ?? null,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test("application package metadata is account- and target-scoped", () => {
  const storage = memoryStorage();
  const state = createApplicationPackageState({ item: { id: "one", title: "Role" }, intent: "package" });
  assert.equal(saveApplicationPackageState("user-1", state, storage), true);
  assert.equal(listApplicationPackageStates("user-1", storage).length, 1);
  assert.equal(listApplicationPackageStates("user-2", storage).length, 0);
  assert.notEqual(applicationPackageStorageKey("user-1", state.targetKey), applicationPackageStorageKey("user-2", state.targetKey));
});

test("legacy cover-letter drafts appear as local application records without rewriting them", () => {
  const storage = memoryStorage();
  const item = { id: "legacy-1", title: "Analyst", company: "Cedar" };
  const context = {
    baseResume: "Avery Chen\navery@example.com\nAnalyzed service requests.",
    resumeData: { name: "Avery Chen", contact: "avery@example.com", title: "Analyst" },
    item,
    atsReview: {
      posting_readiness: { status: "reviewed_complete", fit_allowed: true, application_ready_allowed: true },
      readiness: { status: "strong_fit" },
      requirements: [{ id: "R1" }],
      coverage: { direct: 1 },
    },
  };
  const plan = createCoverLetterPlan({ paragraphs: [
    { id: "opening", purpose: "opening", text: "I am applying with verified experience analyzing service requests.", evidence_refs: ["Analyzed service requests."], requirement_refs: ["Analysis"], explanation: "Uses verified experience." },
    { id: "closing", purpose: "closing", text: "Thank you for considering my application for this opportunity.", explanation: "Provides a restrained closing." },
  ] }, context);
  const key = coverLetterStorageKey("user-1", item);
  storage.setItem(key, JSON.stringify(plan));
  const records = listApplicationPackageStates("user-1", storage);
  assert.equal(records.length, 1);
  assert.equal(records[0].target.jobTitle, "Analyst");
  assert.equal(records[0].coverLetterStatus, "draft");
  assert.equal(storage.getItem(key), JSON.stringify(plan));
});
