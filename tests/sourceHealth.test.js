import assert from "node:assert/strict";
import test from "node:test";

import {
  categorizeSourceError,
  logCronHealth,
  runSourceImport,
  summarizeCronHealth,
  summarizeSourceOutcome,
} from "../api/_lib/sourceHealth.js";

test("source summaries expose only bounded metrics and never raw failure text", async () => {
  let clock = 100;
  const outcome = await runSourceImport(async () => ({
    requests: 2,
    received: 50,
    fresh: 40,
    unique: 35,
    saved: 35,
    secret: "must-not-leak",
    responseBody: "untrusted upstream content",
  }), { now: () => (clock += 5) });
  const summary = summarizeSourceOutcome(outcome, "Import failed");

  assert.equal(summary.state, "success");
  assert.equal(summary.durationMs, 5);
  assert.equal(summary.saved, 35);
  assert.equal("secret" in summary, false);
  assert.equal("responseBody" in summary, false);

  const failure = summarizeSourceOutcome({
    status: "rejected",
    reason: new Error("upstream unavailable with token=private"),
    durationMs: 12,
  }, "Provider import failed");
  assert.deepEqual(failure, {
    ok: false,
    state: "failed",
    error: "Provider import failed",
    errorCategory: "upstream",
    durationMs: 12,
  });
  assert.doesNotMatch(JSON.stringify(failure), /token=private/);
});

test("cron health distinguishes success, partial failure, complete failure, and skipped runs", () => {
  assert.equal(summarizeCronHealth({ primary: { ok: true }, companion: { ok: true } }).state, "success");
  assert.equal(summarizeCronHealth({ primary: { ok: true }, companion: { ok: false } }).state, "partial");
  assert.equal(summarizeCronHealth({ primary: { ok: false }, companion: { ok: false } }).state, "failed");
  assert.equal(summarizeCronHealth({ primary: { ok: true, skipped: true } }).state, "skipped");
  assert.equal(categorizeSourceError(new Error("Could not save listings to database")), "database");
  assert.equal(categorizeSourceError(new Error("No valid fresh listings")), "invalid_batch");
});

test("skipped source summaries reduce arbitrary reasons to a safe category", async () => {
  const outcome = await runSourceImport(async () => ({
    skipped: true,
    skipCategory: "disabled_by_policy",
    reason: "secret board and environment detail",
    saved: 0,
  }));
  const summary = summarizeSourceOutcome(outcome, "Import failed");

  assert.equal(summary.skipCategory, "disabled_by_policy");
  assert.equal("reason" in summary, false);
  assert.doesNotMatch(JSON.stringify(summary), /secret board/);
});

test("structured health logging emits one sanitized JSON record", () => {
  const entries = [];
  const sources = { source: { ok: false, state: "failed", error: "Import failed", errorCategory: "upstream" } };
  const health = summarizeCronHealth(sources);
  logCronHealth((entry) => entries.push(entry), "scheduled_feed_refresh", health, sources);

  assert.equal(entries.length, 1);
  assert.deepEqual(JSON.parse(entries[0]), { event: "scheduled_feed_refresh", health, sources });
});
