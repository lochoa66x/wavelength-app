import test from "node:test";
import assert from "node:assert/strict";

import { fetchAdzunaListings, mapAdzunaResult } from "../api/_lib/adzuna.js";
import { mapAtsResult, parseAtsBoardConfig } from "../api/_lib/atsBoards.js";
import { buildHimalayasFeedUrl, mapHimalayasResult } from "../api/_lib/himalayas.js";
import { buildJobicyFeedUrl, mapJobicyResult } from "../api/_lib/jobicy.js";
import { fetchJoobleListings, mapJoobleResult } from "../api/_lib/jooble.js";
import { parseEnabledJobMarkets } from "../api/_lib/sourceMarkets.js";
import { parseDisabledJobSources, sourceImportDecision } from "../api/_lib/sourcePolicy.js";
import {
  marketScopedExternalId,
  marketSourceScope,
  normalizeMarketCode,
} from "../src/markets.js";

function jsonResponse(payload) {
  return { ok: true, status: 200, json: async () => payload };
}

const now = new Date("2026-08-30T12:00:00Z");

test("the market registry is allowlisted, Canada-first, and identity-safe", () => {
  assert.equal(normalizeMarketCode("United States"), "US");
  assert.equal(normalizeMarketCode("GB"), "");
  assert.deepEqual(parseEnabledJobMarkets("US"), ["CA", "US"]);
  assert.throws(() => parseEnabledJobMarkets("CA,GB"), /unsupported market/);
  assert.equal(marketSourceScope("adzuna", "CA"), "adzuna");
  assert.equal(marketSourceScope("adzuna", "US"), "adzuna:us");
  assert.equal(marketScopedExternalId("123", "CA"), "123");
  assert.equal(marketScopedExternalId("123", "US"), "US:123");
});

test("a source can be stopped in the US without stopping Canada", () => {
  const disabled = parseDisabledJobSources("Jooble:US,himalayas");
  assert.equal(sourceImportDecision({ source: "jooble", marketCode: "CA", disabledSources: disabled }).enabled, true);
  assert.equal(sourceImportDecision({ source: "jooble", marketCode: "US", disabledSources: disabled }).enabled, false);
  assert.equal(sourceImportDecision({ source: "himalayas", marketCode: "CA", disabledSources: disabled }).enabled, false);
  assert.throws(() => parseDisabledJobSources("jooble:gb"), /unsupported source/);
});

test("Adzuna routes US searches and maps isolated US records", async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(new URL(url));
    if (url.pathname.endsWith("/categories")) return jsonResponse({ results: [] });
    return jsonResponse({ results: [] });
  };
  await fetchAdzunaListings({
    credentials: { appId: "id", appKey: "key" },
    marketCode: "US",
    fetchImpl,
    now,
    requestLimit: 2,
  });
  assert.match(urls[0].pathname, /\/jobs\/us\/categories$/);

  const row = mapAdzunaResult({
    id: "123",
    title: "Facilities Electrician",
    location: { display_name: "Austin, TX" },
    created: now.toISOString(),
    redirect_url: "https://www.adzuna.com/details/123",
  }, "trades", { now, marketCode: "US" });
  assert.equal(row.external_id, "US:123");
  assert.equal(row.region, "texas");
  assert.equal(row.country_code, "US");
});

test("Jooble uses the US domain and never reuses the Canadian location body", async () => {
  const calls = [];
  await fetchJoobleListings({
    apiKey: "us key",
    marketCode: "US",
    fetchImpl: async (url, init) => {
      calls.push({ url, body: JSON.parse(init.body) });
      return jsonResponse({ jobs: [] });
    },
    now,
    requestLimit: 1,
  });
  assert.equal(calls[0].url, "https://jooble.org/api/us%20key");
  assert.equal(calls[0].body.location, "United States");

  const row = mapJoobleResult({
    id: "456",
    title: "Registered Nurse",
    location: "Seattle, WA",
    updated: now.toISOString(),
    link: "https://jooble.org/desc/456",
  }, "care", { now, marketCode: "US" });
  assert.equal(row.external_id, "US:456");
  assert.equal(row.region, "washington");
  assert.equal(row.country_code, "US");
});

test("public remote feeds use their documented US filters", () => {
  assert.equal(buildJobicyFeedUrl("US").searchParams.get("geo"), "usa");
  assert.equal(buildHimalayasFeedUrl(1, "US").searchParams.get("country"), "US");

  const jobicy = mapJobicyResult({
    id: "j-1",
    jobTitle: "Remote Support Specialist",
    url: "https://jobicy.com/jobs/j-1",
    jobGeo: "USA",
    pubDate: now.toISOString(),
  }, { now, marketCode: "US" });
  assert.equal(jobicy.external_id, "US:j-1");
  assert.equal(jobicy.country_code, "US");

  const himalayas = mapHimalayasResult({
    guid: "h-1",
    title: "Remote Product Designer",
    applicationLink: "https://himalayas.app/jobs/h-1",
    locationRestrictions: [{ alpha2: "US" }],
    pubDate: now.toISOString(),
  }, { now, marketCode: "US" });
  assert.equal(himalayas.external_id, "US:h-1");
  assert.equal(himalayas.country_code, "US");
});

test("employer boards require an explicit US market and reject the other country", () => {
  const [config] = parseAtsBoardConfig(JSON.stringify([
    { provider: "lever", board: "acme", company: "Acme", market: "US" },
  ]));
  assert.equal(config.marketCode, "US");
  const usJob = mapAtsResult(config, {
    id: "us-1",
    text: "Project Manager",
    categories: { location: "New York, NY" },
    hostedUrl: "https://jobs.lever.co/acme/us-1",
  }, { now });
  assert.equal(usJob.country_code, "US");
  assert.equal(usJob.external_id, "US:acme:us-1");

  const canadaJob = mapAtsResult(config, {
    id: "ca-1",
    text: "Project Manager",
    categories: { location: "Toronto, ON, Canada" },
    hostedUrl: "https://jobs.lever.co/acme/ca-1",
  }, { now });
  assert.equal(canadaJob, null);
});
