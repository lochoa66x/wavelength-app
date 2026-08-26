import test from "node:test";
import assert from "node:assert/strict";

import { buildQualitySignal, validateQualitySignal } from "./qualitySignalContract.js";
import {
  QUALITY_SIGNAL_CONSENT_KEY,
  emitQualitySignal,
  emitResumeQualitySignal,
  readQualitySignalConsent,
  writeQualitySignalConsent,
} from "./qualitySignals.js";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, value); },
    removeItem(key) { values.delete(key); },
  };
}

test("quality sharing is off by default and malformed consent fails closed", () => {
  assert.equal(readQualitySignalConsent(memoryStorage()), false);
  assert.equal(readQualitySignalConsent(memoryStorage({ [QUALITY_SIGNAL_CONSENT_KEY]: "not-json" })), false);
  assert.equal(readQualitySignalConsent(memoryStorage({ [QUALITY_SIGNAL_CONSENT_KEY]: JSON.stringify({ schemaVersion: 2, enabled: true }) })), false);
});

test("explicit consent can be enabled and disabled", () => {
  const storage = memoryStorage();
  assert.equal(writeQualitySignalConsent(true, storage, 123), true);
  assert.equal(readQualitySignalConsent(storage), true);
  assert.equal(writeQualitySignalConsent(false, storage, 456), true);
  assert.equal(readQualitySignalConsent(storage), false);
});

test("blocked browser storage cannot accidentally enable sharing", () => {
  const storage = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
  };
  assert.equal(writeQualitySignalConsent(true, storage), false);
  assert.equal(readQualitySignalConsent(storage), false);
});

test("disabled sharing performs no request", async () => {
  let requests = 0;
  const result = await emitQualitySignal(buildQualitySignal("export_completed", { route: "app" }), {
    storage: memoryStorage(),
    fetchImpl: async () => { requests += 1; return { ok: true }; },
  });
  assert.equal(result.status, "disabled");
  assert.equal(requests, 0);
});

test("enabled sharing omits credentials and sends only the exact contract", async () => {
  const storage = memoryStorage();
  writeQualitySignalConsent(true, storage);
  let request;
  const signal = buildQualitySignal("export_completed", { route: "app", exportFormat: "docx", outcome: "completed" });
  const result = await emitQualitySignal(signal, {
    storage,
    fetchImpl: async (url, options) => { request = { url, options }; return { ok: true }; },
  });
  assert.equal(result.status, "accepted");
  assert.equal(request.url, "/api/quality-signal");
  assert.equal(request.options.credentials, "omit");
  assert.deepEqual(JSON.parse(request.options.body), signal);
});

test("strict validation rejects extra fields, nesting, arbitrary PII, and Unicode lookalikes", () => {
  const base = buildQualitySignal("tailoring_completed", { route: "custom_job" });
  for (const candidate of [
    { ...base, email: "candidate@example.com" },
    { ...base, route: { value: "app" } },
    { ...base, route: "candidate@example.com" },
    { ...base, feedbackReason: "Luís Ochoa" },
    { ...base, feedbackReason: "luis＠example.com" },
  ]) {
    assert.equal(validateQualitySignal(candidate).ok, false);
  }
  assert.throws(() => buildQualitySignal("tailoring_completed", { route: "candidate@example.com" }), /route/);
  assert.throws(() => buildQualitySignal("typo_event", { route: "app" }), /eventName/);
});

test("disabling consent immediately aborts an in-flight best-effort request", async () => {
  const storage = memoryStorage();
  writeQualitySignalConsent(true, storage);
  const pending = emitQualitySignal(buildQualitySignal("export_attempted", { route: "app" }), {
    storage,
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    }),
  });
  writeQualitySignalConsent(false, storage);
  assert.equal((await pending).status, "aborted");
});

test("resume-derived transport strips all private source strings", async () => {
  const storage = memoryStorage();
  writeQualitySignalConsent(true, storage);
  let body = "";
  await emitResumeQualitySignal("tailoring_completed", {
    resumeData: { name: "Private Candidate", email: "secret@example.com", summary: "Confidential résumé sentence" },
    item: { title: "Secret Role", company: "Private Employer", url: "https://example.com/job/123" },
    atsReview: { integrity: { status: "pass" }, coverage: { direct: 1, adjacent: 0, transferable: 0, missing: 1 } },
    route: "custom_job",
    postingSource: "pasted_text",
    outcome: "completed",
  }, {
    storage,
    fetchImpl: async (_url, options) => { body = options.body; return { ok: true }; },
  });
  for (const privateValue of ["Private Candidate", "secret@example.com", "Confidential", "Secret Role", "Private Employer", "example.com"]) {
    assert.equal(body.includes(privateValue), false);
  }
  assert.equal(validateQualitySignal(JSON.parse(body)).ok, true);
});
