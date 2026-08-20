import test from "node:test";
import assert from "node:assert/strict";

import {
  JOOBLE_REQUEST_BUDGET,
  buildJoobleSearchPlan,
  deterministicJoobleListingId,
  fetchJoobleListings,
  mapJoobleResult,
  runJoobleIngestion,
} from "../api/_lib/jooble.js";
import { createJoobleCronHandler, getJoobleCronConfig } from "../api/cron/jooble.js";

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}

const config = {
  joobleApiKey: "jooble-key",
  cronSecret: "cron-secret",
  supabaseUrl: "https://example.supabase.co",
  supabaseSecretKey: "sb_secret_test",
};

test("Jooble search plan covers the jobs-and-gigs catalogue within a conservative budget", () => {
  const plan = buildJoobleSearchPlan();

  assert.ok(plan.some(({ category }) => category === "trades"));
  assert.ok(plan.some(({ category }) => category === "home_services"));
  assert.ok(plan.some(({ category }) => category === "admin"));
  assert.ok(plan.some(({ category }) => category === "tech"));
  assert.ok(plan.length < JOOBLE_REQUEST_BUDGET);
});

test("Jooble sends bounded Canada-only POST searches and deduplicates fresh results", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init, body: JSON.parse(init.body) });
    return jsonResponse({ jobs: [
      { id: "job-1", updated: "2026-08-19T12:00:00Z" },
      { id: "job-1", updated: "2026-08-19T12:00:00Z" },
      { id: "old", updated: "2026-06-01T12:00:00Z" },
    ] });
  };

  const feed = await fetchJoobleListings({
    apiKey: "api key",
    fetchImpl,
    now: new Date("2026-08-20T12:00:00Z"),
  });

  assert.equal(feed.items.length, 1);
  assert.equal(feed.stats.requests, buildJoobleSearchPlan().length);
  assert.equal(calls[0].url, "https://jooble.org/api/api%20key");
  assert.equal(calls[0].init.method, "POST");
  assert.equal(calls[0].body.location, "Canada");
  assert.equal(calls[0].body.page, "1");
  assert.equal(calls[0].body.ResultOnPage, "50");
  assert.equal(calls[0].body.SearchMode, "0");
});

test("Jooble mapping produces a structured Canadian trades listing", () => {
  const row = mapJoobleResult({
    id: "12345",
    title: "Licensed Plumber - Full Time",
    company: "Maple Mechanical",
    location: "Toronto, Ontario",
    type: "Full-time",
    updated: "2026-08-19T10:00:00Z",
    link: "https://ca.jooble.org/desc/12345",
    snippet: "<b>Install</b> &amp; repair plumbing systems.",
  }, "trades", { now: new Date("2026-08-20T12:00:00Z") });

  assert.equal(row.category, "trades");
  assert.equal(row.job_type, "full-time");
  assert.equal(row.location_type, "onsite");
  assert.equal(row.city, "Toronto");
  assert.equal(row.region, "ontario");
  assert.equal(row.country_code, "CA");
  assert.equal(row.description, "Install & repair plumbing systems.");
  assert.equal(row.tier, "HIGH");
});

test("Jooble listing IDs are stable UUIDs", () => {
  const first = deterministicJoobleListingId("123");
  assert.equal(first, deterministicJoobleListingId("123"));
  assert.notEqual(first, deterministicJoobleListingId("124"));
  assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("Jooble ingestion preserves existing IDs and prunes only after saving", async () => {
  const upserted = [];
  let pruneCalls = 0;
  const supabase = {
    from(table) {
      assert.equal(table, "listings");
      return {
        select() {
          return {
            eq() {
              return {
                in: async () => ({
                  data: [{ id: "existing-uuid", external_id: "existing" }],
                  error: null,
                }),
              };
            },
          };
        },
        upsert: async (rows) => {
          upserted.push(...rows);
          return { error: null };
        },
        delete() {
          return {
            eq() {
              return {
                lt: async () => {
                  pruneCalls += 1;
                  return { count: 2, error: null };
                },
                is() {
                  return {
                    lt: async () => {
                      pruneCalls += 1;
                      return { count: 1, error: null };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };
  const fetchImpl = async () => jsonResponse({ jobs: [
    {
      id: "existing",
      title: "Administrative Assistant",
      company: "First Co",
      location: "Ottawa, Ontario",
      updated: "2026-08-19T10:00:00Z",
      link: "https://ca.jooble.org/desc/existing",
    },
    {
      id: "new",
      title: "Virtual Administrative Assistant - Remote",
      company: "Second Co",
      location: "Canada",
      updated: "2026-08-19T11:00:00Z",
      link: "https://ca.jooble.org/desc/new",
    },
  ] });

  const summary = await runJoobleIngestion({
    supabase,
    apiKey: "key",
    fetchImpl,
    now: new Date("2026-08-20T12:00:00Z"),
  });

  assert.equal(summary.inserted, 1);
  assert.equal(summary.updated, 1);
  assert.equal(summary.pruned, 3);
  assert.equal(pruneCalls, 2);
  assert.equal(upserted.find(({ external_id: id }) => id === "existing").id, "existing-uuid");
  assert.equal(
    upserted.find(({ external_id: id }) => id === "new").id,
    deterministicJoobleListingId("new"),
  );
});

test("Jooble ingestion leaves existing rows untouched when no fresh batch is available", async () => {
  let databaseCalls = 0;
  const supabase = {
    from() {
      databaseCalls += 1;
      throw new Error("Database should not be touched");
    },
  };
  const fetchImpl = async () => jsonResponse({ jobs: [
    { id: "old", updated: "2026-06-01T12:00:00Z" },
  ] });

  await assert.rejects(() => runJoobleIngestion({
    supabase,
    apiKey: "key",
    fetchImpl,
    now: new Date("2026-08-20T12:00:00Z"),
  }), /existing data was left unchanged/);

  assert.equal(databaseCalls, 0);
});

test("Jooble cron rejects an invalid secret before creating clients or importing", async () => {
  let createdClient = false;
  let imported = false;
  const handler = createJoobleCronHandler({
    getConfig: () => config,
    createClientImpl: () => {
      createdClient = true;
      return {};
    },
    ingest: async () => {
      imported = true;
      return {};
    },
  });
  const res = responseRecorder();

  await handler({ method: "GET", headers: { authorization: "Bearer wrong" } }, res);

  assert.equal(res.statusCode, 401);
  assert.equal(createdClient, false);
  assert.equal(imported, false);
});

test("Jooble cron returns an operational summary after a successful import", async () => {
  const handler = createJoobleCronHandler({
    getConfig: () => config,
    createClientImpl: () => ({ from: () => ({}) }),
    ingest: async ({ apiKey }) => {
      assert.equal(apiKey, "jooble-key");
      return { requests: 12, saved: 300, inserted: 250, updated: 50, pruned: 40 };
    },
    jobicyIngest: async () => ({ requests: 1, saved: 80, inserted: 70, updated: 10, pruned: 5 }),
  });
  const res = responseRecorder();

  await handler({ method: "GET", headers: { authorization: "Bearer cron-secret" } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.country, "CA");
  assert.equal(res.body.partial, false);
  assert.equal(res.body.sources.jooble.saved, 300);
  assert.equal(res.body.sources.jobicy.saved, 80);
});

test("Jooble cron isolates a Jobicy outage and reports a partial success", async () => {
  const handler = createJoobleCronHandler({
    getConfig: () => config,
    createClientImpl: () => ({ from: () => ({}) }),
    ingest: async () => ({ requests: 12, saved: 300 }),
    jobicyIngest: async () => { throw new Error("Jobicy unavailable"); },
  });
  const res = responseRecorder();

  await handler({ method: "GET", headers: { authorization: "Bearer cron-secret" } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.partial, true);
  assert.equal(res.body.sources.jooble.ok, true);
  assert.equal(res.body.sources.jobicy.ok, false);
});

test("Jooble cron fails only when both scheduled imports fail", async () => {
  const handler = createJoobleCronHandler({
    getConfig: () => config,
    createClientImpl: () => ({ from: () => ({}) }),
    ingest: async () => { throw new Error("Jooble unavailable"); },
    jobicyIngest: async () => { throw new Error("Jobicy unavailable"); },
  });
  const res = responseRecorder();

  await handler({ method: "GET", headers: { authorization: "Bearer cron-secret" } }, res);

  assert.equal(res.statusCode, 502);
  assert.equal(res.body.ok, false);
  assert.equal(res.body.sources.jooble.ok, false);
  assert.equal(res.body.sources.jobicy.ok, false);
});

test("Jooble server configuration never accepts browser-exposed secrets", () => {
  assert.throws(() => getJoobleCronConfig({
    VITE_SUPABASE_URL: "https://example.supabase.co",
    VITE_SUPABASE_SECRET_KEY: "should-not-be-used",
    VITE_JOOBLE_API_KEY: "should-not-be-used",
    CRON_SECRET: "secret",
  }), /Missing server configuration/);
});
