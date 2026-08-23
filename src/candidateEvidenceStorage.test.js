import test from "node:test";
import assert from "node:assert/strict";

import { candidateEvidenceStorageKey, loadCandidateEvidence, saveCandidateEvidence } from "./candidateEvidenceStorage.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test("candidate evidence is isolated by account and target posting", () => {
  assert.notEqual(candidateEvidenceStorageKey("user-a", "job-1"), candidateEvidenceStorageKey("user-b", "job-1"));
  assert.notEqual(candidateEvidenceStorageKey("user-a", "job-1"), candidateEvidenceStorageKey("user-a", "job-2"));
});

test("candidate evidence round trips without crossing accounts", () => {
  const storage = memoryStorage();
  const records = [{ id: "note-1", requirement_id: "R1", answer: "Led a finance workshop.", user_confirmed: true }];
  assert.equal(saveCandidateEvidence("user-a", "job-1", records, storage), true);
  assert.deepEqual(loadCandidateEvidence("user-a", "job-1", storage), records);
  assert.deepEqual(loadCandidateEvidence("user-b", "job-1", storage), []);
});

