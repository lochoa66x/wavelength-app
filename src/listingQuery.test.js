import test from "node:test";
import assert from "node:assert/strict";

import {
  applyStructuredLocationFilters,
  canUseLegacyLocationFallback,
  createListingsQuery,
  escapeLikePattern,
  hasNextListingPage,
  listingQueryFingerprint,
  mergeListingPages,
} from "./listingQuery.js";

function createQueryRecorder() {
  const calls = [];
  const query = {};
  for (const method of ["select", "order", "eq", "ilike", "range"]) {
    query[method] = (...args) => {
      calls.push([method, ...args]);
      return query;
    };
  }
  const client = {
    from: (table) => {
      calls.push(["from", table]);
      return query;
    },
  };
  return { calls, client, query };
}

test("structured filters are applied before an inclusive database page range", () => {
  const { calls, client } = createQueryRecorder();

  createListingsQuery(client, {
    location: "remote",
    countryCode: "CA",
    region: "Ontario",
    city: "Toronto",
  }, { page: 2, pageSize: 25 });

  assert.deepEqual(calls, [
    ["from", "listings"],
    ["select", "*", { count: "exact" }],
    ["order", "fetched_at", { ascending: false }],
    ["order", "id", { ascending: false }],
    ["eq", "location_type", "remote"],
    ["eq", "country_code", "CA"],
    ["eq", "region", "ontario"],
    ["ilike", "city", "%Toronto%"],
    ["range", 50, 74],
  ]);
});

test("anywhere without geography adds no structured database filters", () => {
  const { calls, query } = createQueryRecorder();
  applyStructuredLocationFilters(query, { location: "either" });
  assert.deepEqual(calls, []);
});

test("city wildcard characters are escaped before ilike filtering", () => {
  assert.equal(escapeLikePattern("100%_Remote\\Desk"), "100\\%\\_Remote\\\\Desk");
});

test("pagination merges rows by stable identity and detects the next page", () => {
  assert.deepEqual(mergeListingPages(
    [{ id: "a", title: "Old" }, { id: "b", title: "Second" }],
    [{ id: "a", title: "New" }, { id: "c", title: "Third" }],
  ), [
    { id: "a", title: "New" },
    { id: "b", title: "Second" },
    { id: "c", title: "Third" },
  ]);
  assert.equal(hasNextListingPage({ count: 51, page: 0, pageSize: 50, received: 50 }), true);
  assert.equal(hasNextListingPage({ count: 51, page: 1, pageSize: 50, received: 1 }), false);
  assert.equal(hasNextListingPage({ count: null, page: 0, pageSize: 50, received: 50 }), true);
});

test("legacy fallback is restricted to missing location columns", () => {
  const filters = { location: "remote", countryCode: "CA" };
  assert.equal(canUseLegacyLocationFallback({
    code: "PGRST204",
    message: "Could not find the 'country_code' column",
  }, filters), true);
  assert.equal(canUseLegacyLocationFallback({ code: "42501", message: "permission denied" }, filters), false);
  assert.equal(canUseLegacyLocationFallback({
    code: "PGRST204",
    message: "Could not find the 'country_code' column",
  }, { location: "either" }), false);
});

test("query fingerprints reset pagination for search and geographic changes", () => {
  const base = listingQueryFingerprint({ location: "remote", countryCode: "CA" }, "plumber");
  assert.notEqual(base, listingQueryFingerprint({ location: "remote", countryCode: "US" }, "plumber"));
  assert.notEqual(base, listingQueryFingerprint({ location: "remote", countryCode: "CA" }, "electrician"));
});
