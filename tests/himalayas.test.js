import test from "node:test";
import assert from "node:assert/strict";

import {
  buildHimalayasFeedUrl,
  fetchHimalayasListings,
  HIMALAYAS_PAGE_BUDGET,
  mapHimalayasResult,
  runHimalayasIngestion,
} from "../api/_lib/himalayas.js";

function jsonResponse(payload, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

function completeJob(id) {
  return {
    guid: `h-${id}`,
    title: `Remote SAP Analyst ${id}`,
    companyName: "Northstar Systems",
    employmentType: "Full Time",
    locationRestrictions: [{ name: "Canada", alpha2: "CA" }],
    categories: ["SAP"],
    description: "Configure and test SAP systems.",
    pubDate: "2026-08-19T10:00:00Z",
    applicationLink: `https://himalayas.app/jobs/remote-sap-analyst-${id}`,
  };
}

function databaseRecorder() {
  let rpcCalls = 0;
  let databaseCalls = 0;
  return {
    get rpcCalls() { return rpcCalls; },
    get databaseCalls() { return databaseCalls; },
    client: {
      from: () => {
        databaseCalls += 1;
        return {
          select: () => ({ eq: () => ({ in: async () => ({ data: [], error: null }) }) }),
          upsert: async () => ({ error: null }),
        };
      },
      rpc: async () => {
        rpcCalls += 1;
        return { data: [{ uncertain_count: 0, closed_count: 0 }], error: null };
      },
    },
  };
}

test("Himalayas requests recent Canada-eligible pages without credentials", () => {
  const url = buildHimalayasFeedUrl(3);
  assert.equal(url.origin, "https://himalayas.app");
  assert.equal(url.searchParams.get("country"), "CA");
  assert.equal(url.searchParams.get("sort"), "recent");
  assert.equal(url.searchParams.get("page"), "3");
});

test("Himalayas pagination deduplicates fresh listings and stops on an empty page", async () => {
  const calls = [];
  const fresh = {
    guid: "h-1",
    applicationLink: "https://himalayas.app/jobs/remote-sap-analyst-1",
    pubDate: "2026-08-19T10:00:00Z",
  };
  const fetchImpl = async (url) => {
    calls.push(new URL(url));
    return calls.length === 1
      ? jsonResponse({ jobs: [fresh, fresh, { guid: "old", pubDate: "2026-05-01T00:00:00Z" }] })
      : jsonResponse({ jobs: [] });
  };

  const feed = await fetchHimalayasListings({
    fetchImpl,
    now: new Date("2026-08-20T12:00:00Z"),
  });

  assert.equal(calls.length, 2);
  assert.equal(feed.items.length, 1);
  assert.equal(feed.stats.received, 3);
  assert.equal(feed.stats.unique, 1);
  assert.equal(feed.stats.reachedTerminalPage, true);
  assert.equal(feed.stats.pageBudgetExhausted, false);
});

test("Himalayas finalizes only after reaching a terminal page", async () => {
  const database = databaseRecorder();
  let calls = 0;
  const summary = await runHimalayasIngestion({
    supabase: database.client,
    fetchImpl: async () => {
      calls += 1;
      return jsonResponse({ jobs: calls === 1 ? [completeJob(1)] : [] });
    },
    now: new Date("2026-08-20T12:00:00Z"),
  });

  assert.equal(summary.runMode, "authoritative_snapshot");
  assert.equal(summary.reachedTerminalPage, true);
  assert.equal(database.rpcCalls, 1);
});

test("Himalayas budget exhaustion remains observation-only", async () => {
  const database = databaseRecorder();
  let calls = 0;
  const summary = await runHimalayasIngestion({
    supabase: database.client,
    fetchImpl: async () => {
      calls += 1;
      return jsonResponse({ jobs: [completeJob(calls)] });
    },
    now: new Date("2026-08-20T12:00:00Z"),
  });

  assert.equal(calls, HIMALAYAS_PAGE_BUDGET);
  assert.equal(summary.runMode, "observation_only");
  assert.equal(summary.pageBudgetExhausted, true);
  assert.equal(database.rpcCalls, 0);
});

test("a failed Himalayas page never reaches miss finalization", async () => {
  const database = databaseRecorder();
  let calls = 0;

  await assert.rejects(() => runHimalayasIngestion({
    supabase: database.client,
    fetchImpl: async () => {
      calls += 1;
      if (calls === 1) return jsonResponse({ jobs: [completeJob(1)] });
      throw new Error("network unavailable");
    },
    now: new Date("2026-08-20T12:00:00Z"),
  }), /Himalayas request failed/);

  assert.equal(database.rpcCalls, 0);
  assert.equal(database.databaseCalls, 0);
});

test("Himalayas mapping preserves attribution and Canadian remote eligibility", () => {
  const row = mapHimalayasResult({
    guid: "h-1",
    title: "Remote SAP Analyst - Full Time",
    companyName: "Northstar Systems",
    employmentType: "Full Time",
    locationRestrictions: [{ name: "Canada", alpha2: "CA" }],
    categories: ["SAP"],
    parentCategories: ["Engineering"],
    description: "<p>Configure &amp; test SAP systems.</p>",
    pubDate: "2026-08-19T10:00:00Z",
    applicationLink: "https://himalayas.app/jobs/remote-sap-analyst-1",
  }, { now: new Date("2026-08-20T12:00:00Z") });

  assert.equal(row.source, "himalayas");
  assert.equal(row.category, "tech");
  assert.equal(row.location_type, "remote");
  assert.equal(row.country_code, "CA");
  assert.equal(row.job_type, "full-time");
  assert.equal(row.description, "Configure & test SAP systems.");
  assert.equal(row.description_snippet, "Configure & test SAP systems.");
  assert.equal(row.url, "https://himalayas.app/jobs/remote-sap-analyst-1");
});

test("Himalayas mapping rejects links that cannot provide required attribution", () => {
  assert.equal(mapHimalayasResult({
    guid: "h-1",
    title: "SAP Analyst",
    pubDate: "2026-08-19T10:00:00Z",
    applicationLink: "https://example.com/jobs/1",
  }), null);
});
