import test from "node:test";
import assert from "node:assert/strict";

import {
  candidateEvidenceForRequest,
  candidateEvidenceStorageKey,
  customEvidenceTargetKey,
  isVerifiedReusableEvidence,
  loadCandidateEvidence,
  loadReusableCandidateEvidence,
  mergeReusableCandidateEvidence,
  reusableCandidateEvidenceStorageKey,
  saveCandidateEvidence,
  saveReusableCandidateEvidence,
} from "./candidateEvidenceStorage.js";

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

test("reusable evidence is account-isolated and excludes application-only reminders", () => {
  const storage = memoryStorage();
  const reusable = { id: "profile-1", answer_status: "yes", scope: "profile", answer: "Led UAT.", user_confirmed: true };
  const application = { id: "app-1", answer_status: "yes", scope: "application", answer: "Configured a workflow.", user_confirmed: true };
  const unsure = { id: "unsure-1", answer_status: "unsure", scope: "profile" };

  assert.equal(saveReusableCandidateEvidence("user-a", [reusable, application, unsure], storage), true);
  assert.deepEqual(loadReusableCandidateEvidence("user-a", storage), [reusable]);
  assert.deepEqual(loadReusableCandidateEvidence("user-b", storage), []);
});

test("new reusable answers replace records for the same requirement note", () => {
  const existing = [{ id: "note-1", scope: "profile", answer_status: "yes", answer: "Old answer", user_confirmed: true }];
  const additions = [{ id: "note-1", scope: "profile", answer_status: "yes", answer: "Updated answer", user_confirmed: true }];
  assert.deepEqual(mergeReusableCandidateEvidence(existing, additions), additions);
});

test("only confirmed, non-declined Yes evidence can become reusable", () => {
  const valid = { id: "valid", scope: "profile", answer_status: "yes", answer: "Led UAT.", user_confirmed: true };
  assert.equal(isVerifiedReusableEvidence(valid), true);
  for (const invalid of [
    { ...valid, user_confirmed: false },
    { ...valid, answer_status: "no" },
    { ...valid, answer_status: "unsure" },
    { ...valid, answer: "" },
    { ...valid, declined: true },
    { ...valid, scope: "application" },
  ]) assert.equal(isVerifiedReusableEvidence(invalid), false);
});

test("legacy reusable storage is filtered before it can reach tailoring", () => {
  const storage = memoryStorage();
  const valid = { id: "valid", scope: "profile", answer_status: "yes", answer: "Led UAT.", user_confirmed: true };
  const unsafe = { id: "unsafe", scope: "profile", answer_status: "yes", answer: "Unconfirmed claim", user_confirmed: false };
  storage.setItem(reusableCandidateEvidenceStorageKey("user-a"), JSON.stringify([unsafe, valid]));
  assert.deepEqual(loadReusableCandidateEvidence("user-a", storage), [valid]);
});

test("request evidence prioritizes the current application and caps the payload", () => {
  const application = [
    { id: "same", answer_status: "yes", answer: "Current application" },
    { id: "app-2", answer_status: "no" },
    { id: "unsure", answer_status: "unsure" },
  ];
  const reusable = [
    { id: "same", scope: "profile", answer_status: "yes", answer: "Older reusable answer", user_confirmed: true },
    ...Array.from({ length: 6 }, (_, index) => ({ id: `profile-${index}`, scope: "profile", answer_status: "yes", answer: `Verified answer ${index}`, user_confirmed: true })),
  ];
  const selected = candidateEvidenceForRequest(application, reusable);

  assert.equal(selected.length, 5);
  assert.equal(selected[0].answer, "Current application");
  assert.equal(selected.some((record) => record.id === "unsure"), false);
});

test("unverified reusable evidence is excluded from request payloads", () => {
  const selected = candidateEvidenceForRequest([], [
    { id: "unconfirmed", scope: "profile", answer_status: "yes", answer: "Claim", user_confirmed: false },
    { id: "unsure", scope: "profile", answer_status: "unsure", answer: "Maybe", user_confirmed: true },
    { id: "verified", scope: "profile", answer_status: "yes", answer: "Verified claim", user_confirmed: true },
  ]);
  assert.deepEqual(selected.map((record) => record.id), ["verified"]);
});

test("custom posting evidence uses a stable source identity with a field fallback", () => {
  assert.equal(
    customEvidenceTargetKey({ source_url: " HTTPS://EXAMPLE.COM/JOB/1 " }),
    "custom:https://example.com/job/1",
  );
  assert.equal(
    customEvidenceTargetKey({ title: "SAP Lead", company: "Example", location: "Toronto" }),
    "custom:sap lead|example|toronto",
  );
});
