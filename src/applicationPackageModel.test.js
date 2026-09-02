import test from "node:test";
import assert from "node:assert/strict";

import {
  applicationArtifactsForIntent,
  applicationDocumentStateFromReadiness,
  applicationTargetKey,
  createApplicationPackageState,
  deriveApplicationPackageStatus,
  validateApplicationPackageState,
} from "./applicationPackageModel.js";

test("application workflows select only the documents the user requested", () => {
  assert.deepEqual(applicationArtifactsForIntent("package"), ["resume", "cover_letter"]);
  assert.deepEqual(applicationArtifactsForIntent("resume_only"), ["resume"]);
  assert.deepEqual(applicationArtifactsForIntent("cover_letter_only"), ["cover_letter"]);
});

test("package readiness is derived independently for selected documents", () => {
  assert.equal(deriveApplicationPackageStatus({ selectedArtifacts: ["resume"], resumeStatus: "ready" }), "ready");
  assert.equal(deriveApplicationPackageStatus({ selectedArtifacts: ["cover_letter"], coverLetterStatus: "ready" }), "ready");
  assert.equal(deriveApplicationPackageStatus({ selectedArtifacts: ["resume", "cover_letter"], resumeStatus: "ready", coverLetterStatus: "not_created" }), "in_progress");
  assert.equal(deriveApplicationPackageStatus({ selectedArtifacts: ["resume", "cover_letter"], resumeStatus: "ready", coverLetterStatus: "preliminary" }), "preliminary");
  assert.equal(deriveApplicationPackageStatus({ selectedArtifacts: ["resume", "cover_letter"], resumeStatus: "ready", coverLetterStatus: "stale" }), "needs_attention");
});

test("document readiness distinguishes missing, generating, stale, preliminary, and ready", () => {
  assert.equal(applicationDocumentStateFromReadiness(null, { exists: false }), "not_created");
  assert.equal(applicationDocumentStateFromReadiness(null, { busy: true }), "generating");
  assert.equal(applicationDocumentStateFromReadiness({ stale: true }), "stale");
  assert.equal(applicationDocumentStateFromReadiness({ canExport: true, preliminary: true }), "preliminary");
  assert.equal(applicationDocumentStateFromReadiness({ state: "application_ready" }), "ready");
});

test("application identity distinguishes similar positions at different companies", () => {
  assert.notEqual(
    applicationTargetKey({ title: "Finance Lead", company: "North" }),
    applicationTargetKey({ title: "Finance Lead", company: "South" }),
  );
});

test("application package state is hash-validated", () => {
  const state = createApplicationPackageState({
    item: { id: "listing-1", title: "Finance Lead", company: "North" },
    intent: "package",
    resumeStatus: "ready",
    coverLetterStatus: "preliminary",
    sourceFingerprint: "source-1",
    updatedAt: "2026-09-02T12:00:00.000Z",
  });
  assert.equal(state.packageStatus, "preliminary");
  assert.deepEqual(validateApplicationPackageState(state), state);
  assert.equal(validateApplicationPackageState({ ...state, coverLetterStatus: "ready" }), null);
});
