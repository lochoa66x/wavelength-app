import test from "node:test";
import assert from "node:assert/strict";

import {
  applyStructuredLocationFilters,
  applyKeywordSearchFilters,
  canUseLegacyLocationFallback,
  createListingsQuery,
  escapeLikePattern,
  hasNextListingPage,
  isMissingPublicListingView,
  listingServerSearchTerms,
  listingQueryFingerprint,
  mergeListingPages,
  PUBLIC_LISTING_RELATION,
  PUBLIC_LISTING_SELECT,
  shouldAutoContinueListingSearch,
} from "./listingQuery.js";

function createQueryRecorder() {
  const calls = [];
  const query = {};
  for (const method of ["select", "order", "neq", "eq", "ilike", "or", "range"]) {
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
    ["from", PUBLIC_LISTING_RELATION],
    ["select", PUBLIC_LISTING_SELECT, { count: "exact" }],
    ["order", "posted_at", { ascending: false, nullsFirst: false }],
    ["order", "id", { ascending: false }],
    ["neq", "source", "craigslist"],
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

test("recognized technology terms filter at the database before pagination", () => {
  const { calls, client } = createQueryRecorder();

  createListingsQuery(client, {
    keyword: "SAP analyst",
    location: "either",
    countryCode: "CA",
  }, { page: 0, pageSize: 100 });

  const orIndex = calls.findIndex(([method]) => method === "or");
  const rangeIndex = calls.findIndex(([method]) => method === "range");
  assert.ok(orIndex > -1);
  assert.ok(orIndex < rangeIndex);
  assert.match(calls[orIndex][1], /title\.ilike\.%sap%/);
  assert.match(calls[orIndex][1], /description_snippet\.ilike\.%abap%/);
  assert.doesNotMatch(calls[orIndex][1], /%analyst%/);
  assert.deepEqual(calls[rangeIndex], ["range", 0, 99]);
});

test("SAP search expands into common module and utilities vocabulary", () => {
  const terms = listingServerSearchTerms({ keyword: "SAP" });
  assert.ok(terms.includes("sap fi-ca"));
  assert.ok(terms.includes("sap is-u"));
  assert.ok(terms.includes("sap s/4hana for utilities"));
  assert.ok(terms.length <= 16);
});

test("server search expands broad IT and sanitizes unsafe PostgREST punctuation", () => {
  assert.ok(listingServerSearchTerms({ keyword: "IT" }).includes("software"));
  assert.deepEqual(listingServerSearchTerms({ keyword: "unknown,(term)" }), []);

  const { calls, query } = createQueryRecorder();
  applyKeywordSearchFilters(query, { keyword: "C++ developer" });
  const expression = calls.find(([method]) => method === "or")?.[1] || "";
  assert.match(expression, /title\.ilike\.%c\+\+%/);
  assert.doesNotMatch(expression, /[()'"]/);
});

test("pagination merges rows by stable identity and detects the next page", () => {
  const merged = mergeListingPages(
    [{ id: "a", title: "Old" }, { id: "b", title: "Second" }],
    [{ id: "a", title: "New" }, { id: "c", title: "Third" }],
  );
  assert.deepEqual(merged.map(({ id, title }) => ({ id, title })), [
    { id: "a", title: "New" },
    { id: "b", title: "Second" },
    { id: "c", title: "Third" },
  ]);
  assert.deepEqual(merged[0].duplicateIds, ["a"]);
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

test("public-view fallback is restricted to a missing relation", () => {
  assert.equal(isMissingPublicListingView({ code: "PGRST205", message: "Could not find public.public_listings" }), true);
  assert.equal(isMissingPublicListingView({ code: "42501", message: "permission denied" }), false);
});

test("query fingerprints reset pagination for search and geographic changes", () => {
  const base = listingQueryFingerprint({ location: "remote", countryCode: "CA" }, "plumber");
  assert.notEqual(base, listingQueryFingerprint({ location: "remote", countryCode: "US" }, "plumber"));
  assert.notEqual(base, listingQueryFingerprint({ location: "remote", countryCode: "CA" }, "electrician"));
});

test("initial search can auto-continue but remains bounded", () => {
  const base = {
    replace: true,
    startingPage: 0,
    hasMore: true,
    hasRelevantListings: false,
  };
  assert.equal(shouldAutoContinueListingSearch({ ...base, attempts: 1 }), true);
  assert.equal(shouldAutoContinueListingSearch({ ...base, attempts: 3 }), false);
  assert.equal(shouldAutoContinueListingSearch({ ...base, attempts: 1, hasRelevantListings: true }), false);
  assert.equal(shouldAutoContinueListingSearch({
    ...base,
    attempts: 1,
    hasRelevantListings: true,
    collectCandidateWindow: true,
  }), true);
  assert.equal(shouldAutoContinueListingSearch({
    ...base,
    attempts: 3,
    collectCandidateWindow: true,
  }), false);
  assert.equal(shouldAutoContinueListingSearch({ ...base, attempts: 1, replace: false }), false);
});
