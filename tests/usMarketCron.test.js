import test from "node:test";
import assert from "node:assert/strict";

import { createAdzunaCronHandler, getAdzunaCronConfig } from "../api/cron/adzuna.js";
import { createJoobleCronHandler, getJoobleCronConfig } from "../api/cron/jooble.js";

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

const shared = {
  cronSecret: "cron-secret",
  supabaseUrl: "https://example.supabase.co",
  supabaseSecretKey: "sb_secret_test",
  disabledSources: new Set(),
};

test("Adzuna cron isolates a US failure and keeps the Canadian result successful", async () => {
  const calls = [];
  const handler = createAdzunaCronHandler({
    getConfig: () => ({
      ...shared,
      adzunaAppId: "id",
      adzunaAppKey: "key",
      jobMarkets: ["CA", "US"],
      atsBoards: [],
    }),
    createClientImpl: () => ({}),
    ingest: async ({ marketCode }) => {
      calls.push(marketCode);
      if (marketCode === "US") throw new Error("US upstream unavailable");
      return { requests: 2, saved: 10 };
    },
  });
  const res = responseRecorder();
  await handler({ method: "GET", headers: { authorization: "Bearer cron-secret" } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.partial, true);
  assert.deepEqual(res.body.markets, ["CA", "US"]);
  assert.equal(res.body.sources.adzuna.ok, true);
  assert.equal(res.body.sources.adzunaUS.ok, false);
  assert.deepEqual(calls, ["CA", "US"]);
});

test("Jooble cron sends distinct regional keys and reports public feeds per market", async () => {
  const joobleCalls = [];
  const publicCalls = [];
  const handler = createJoobleCronHandler({
    getConfig: () => ({
      ...shared,
      joobleApiKey: "canada-key",
      joobleUsApiKey: "us-key",
      jobMarkets: ["CA", "US"],
    }),
    createClientImpl: () => ({}),
    ingest: async ({ marketCode, apiKey }) => {
      joobleCalls.push({ marketCode, apiKey });
      return { requests: 1, saved: 3 };
    },
    jobicyIngest: async ({ marketCode }) => {
      publicCalls.push(`jobicy:${marketCode}`);
      return { requests: 1, saved: 2 };
    },
    himalayasIngest: async ({ marketCode }) => {
      publicCalls.push(`himalayas:${marketCode}`);
      return { requests: 1, saved: 2 };
    },
  });
  const res = responseRecorder();
  await handler({ method: "GET", headers: { authorization: "Bearer cron-secret" } }, res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(joobleCalls, [
    { marketCode: "CA", apiKey: "canada-key" },
    { marketCode: "US", apiKey: "us-key" },
  ]);
  assert.deepEqual(publicCalls, ["jobicy:CA", "himalayas:CA", "jobicy:US", "himalayas:US"]);
  assert.equal(res.body.sources.joobleUS.ok, true);
  assert.equal(res.body.sources.jobicyUS.ok, true);
  assert.equal(res.body.sources.himalayasUS.ok, true);
});

test("cron configuration is Canada-first and keeps the US Jooble key server-only", () => {
  const env = {
    CRON_SECRET: "secret",
    SUPABASE_URL: "https://example.supabase.co",
    SUPABASE_SECRET_KEY: "sb_secret_test",
    JOB_MARKETS: "US",
    JOOBLE_API_KEY: "ca-key",
    JOOBLE_US_API_KEY: "us-key",
  };
  const jooble = getJoobleCronConfig(env);
  const adzuna = getAdzunaCronConfig(env);
  assert.deepEqual(jooble.jobMarkets, ["CA", "US"]);
  assert.equal(jooble.joobleUsApiKey, "us-key");
  assert.deepEqual(adzuna.jobMarkets, ["CA", "US"]);
});
