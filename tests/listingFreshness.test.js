import assert from "node:assert/strict";
import test from "node:test";

import {
  classifyAvailabilityFetch,
  isAvailabilityCheckFresh,
  LISTING_SOURCE_RUN_MODE,
  normalizeObservedListingRows,
  saveListingSourceRun,
} from "../api/_lib/listingFreshness.js";

const RUN_ID = "16e3fc20-7481-4cea-a4bc-ce5fc2f3ba7a";
const NOW = new Date("2026-08-30T12:00:00.000Z");

function feedRow(overrides = {}) {
  return {
    source: "jobicy",
    external_id: "job-1",
    title: "Remote Assistant",
    company: "Example",
    url: "https://jobicy.com/jobs/job-1",
    ...overrides,
  };
}

test("observed rows reactivate deterministically without replacing richer descriptions", () => {
  const existing = new Map([["job-1", {
    id: "existing-id",
    external_id: "job-1",
    availability_status: "closed",
    first_seen_at: "2026-08-01T00:00:00.000Z",
    description: Array.from({ length: 150 }, (_, index) => `verified-${index}`).join(" "),
    description_source: "employer_jsonld",
    description_status: "complete",
  }]]);
  const [row] = normalizeObservedListingRows({
    source: "jobicy",
    sourceScope: "jobicy",
    rows: [feedRow({ description: "Short provider summary." })],
    existing,
    runId: RUN_ID,
    observedAt: NOW.toISOString(),
  });

  assert.equal(row.id, "existing-id");
  assert.equal(row.availability_status, "active");
  assert.equal(row.availability_reason, "seen_in_source");
  assert.equal(row.first_seen_at, "2026-08-01T00:00:00.000Z");
  assert.equal(row.closed_at, null);
  assert.equal(row.consecutive_misses, 0);
  assert.match(row.description, /verified-149/);
});

test("partial source runs save observations but never finalize misses", async () => {
  let rpcCalls = 0;
  const saved = [];
  const supabase = {
    from: () => ({
      select: () => ({ eq: () => ({ in: async () => ({ data: [], error: null }) }) }),
      upsert: async (rows) => { saved.push(...rows); return { error: null }; },
    }),
    rpc: async () => { rpcCalls += 1; return { data: [], error: null }; },
  };

  const summary = await saveListingSourceRun({
    supabase,
    source: "jobicy",
    rows: [feedRow()],
    runMode: LISTING_SOURCE_RUN_MODE.PARTIAL,
    runId: RUN_ID,
    now: NOW,
  });

  assert.equal(saved.length, 1);
  assert.equal(summary.runMode, "partial");
  assert.equal(rpcCalls, 0);
});

test("authoritative source snapshots use one idempotent finalization RPC", async () => {
  let rpcPayload;
  const supabase = {
    from: () => ({
      select: () => ({ eq: () => ({ in: async () => ({ data: [], error: null }) }) }),
      upsert: async () => ({ error: null }),
    }),
    rpc: async (name, payload) => {
      assert.equal(name, "finalize_listing_source_run");
      rpcPayload = payload;
      return { data: [{ uncertain_count: 4, closed_count: 2 }], error: null };
    },
  };

  const summary = await saveListingSourceRun({
    supabase,
    source: "jobicy",
    rows: [feedRow()],
    runMode: LISTING_SOURCE_RUN_MODE.AUTHORITATIVE_SNAPSHOT,
    runId: RUN_ID,
    now: NOW,
  });

  assert.equal(rpcPayload.p_run_id, RUN_ID);
  assert.equal(rpcPayload.p_scope, "jobicy");
  assert.equal(summary.uncertain, 4);
  assert.equal(summary.closed, 2);
});

test("observation-only is the fail-safe default and never finalizes misses", async () => {
  let rpcCalls = 0;
  const supabase = {
    from: () => ({
      select: () => ({ eq: () => ({ in: async () => ({ data: [], error: null }) }) }),
      upsert: async () => ({ error: null }),
    }),
    rpc: async () => { rpcCalls += 1; return { data: [], error: null }; },
  };

  const summary = await saveListingSourceRun({
    supabase,
    source: "jobicy",
    rows: [feedRow()],
    runId: RUN_ID,
    now: NOW,
  });

  assert.equal(summary.runMode, "observation_only");
  assert.equal(rpcCalls, 0);
});

test("availability classification closes only on strong evidence", () => {
  assert.deepEqual(classifyAvailabilityFetch({ httpStatus: 404 }), { status: "closed", reason: "http_closed" });
  assert.deepEqual(classifyAvailabilityFetch({ httpStatus: 403, errorCode: "blocked" }), { status: "uncertain", reason: "publisher_blocked" });
  assert.deepEqual(classifyAvailabilityFetch({ httpStatus: 429 }), { status: "uncertain", reason: "rate_limited" });
  assert.deepEqual(classifyAvailabilityFetch({ httpStatus: 200, hasMatchingPosting: true }), { status: "active", reason: "manual_refresh" });
  assert.deepEqual(classifyAvailabilityFetch({
    httpStatus: 200,
    hasMatchingPosting: true,
    validThrough: "2026-08-01T00:00:00Z",
    now: NOW,
  }), { status: "closed", reason: "expired_structured_data" });
});

test("availability cooldown is deterministic", () => {
  assert.equal(isAvailabilityCheckFresh("2026-08-30T11:50:00Z", { now: NOW.getTime() }), true);
  assert.equal(isAvailabilityCheckFresh("2026-08-30T11:40:00Z", { now: NOW.getTime() }), false);
  assert.equal(isAvailabilityCheckFresh(null, { now: NOW.getTime() }), false);
});
