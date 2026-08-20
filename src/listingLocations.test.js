import test from "node:test";
import assert from "node:assert/strict";

import {
  formatListingLocation,
  formatLocationPreference,
  inferLocationType,
  isMissingStructuredLocationColumn,
  locationMatches,
  normalizeListingLocation,
  normalizeLocationPreference,
  parseLocationText,
  structuredLocationModeFilter,
  summarizeLocationCoverage,
  toStructuredLocationPatch,
} from "./listingLocations.js";

test("legacy location preferences stay compatible", () => {
  assert.equal(normalizeLocationPreference("local"), "onsite");
  assert.equal(normalizeLocationPreference("any"), "either");
  assert.equal(normalizeLocationPreference("remote"), "remote");
});

test("only specific location modes become structured database filters", () => {
  assert.equal(structuredLocationModeFilter("remote"), "remote");
  assert.equal(structuredLocationModeFilter("hybrid"), "hybrid");
  assert.equal(structuredLocationModeFilter("local"), "onsite");
  assert.equal(structuredLocationModeFilter("either"), null);
  assert.equal(structuredLocationModeFilter(null), null);
});

test("legacy query fallback is limited to missing structured columns", () => {
  assert.equal(isMissingStructuredLocationColumn({
    code: "42703",
    message: "column listings.location_type does not exist",
  }), true);
  assert.equal(isMissingStructuredLocationColumn({
    code: "PGRST204",
    message: "Could not find the 'location_type' column",
  }), true);
  assert.equal(isMissingStructuredLocationColumn({ code: "42501", message: "permission denied" }), false);
  assert.equal(isMissingStructuredLocationColumn({ code: "42703", message: "column category does not exist" }), false);
});

test("location type is inferred from structured values, titles, and locations", () => {
  assert.equal(inferLocationType({ locationType: "hybrid" }), "hybrid");
  assert.equal(inferLocationType({ title: "Virtual Assistant - Remote", location: "Canada" }), "remote");
  assert.equal(inferLocationType({ title: "Coordinator", location: "Hybrid - Toronto, Ontario" }), "hybrid");
  assert.equal(inferLocationType({ title: "Electrician", location: "Vancouver, BC" }), "onsite");
});

test("Canadian province abbreviations and accents are normalized for matching", () => {
  const toronto = normalizeListingLocation({
    title: "Electrician",
    location: "Toronto, ON",
  });
  const montreal = normalizeListingLocation({
    title: "Administrative Assistant",
    location: "Montréal, QC",
  });

  assert.equal(locationMatches(toronto, { mode: "onsite", query: "Toronto, Ontario" }), true);
  assert.equal(locationMatches(toronto, { mode: "onsite", query: "Vancouver" }), false);
  assert.equal(locationMatches(montreal, { mode: "onsite", query: "Montreal, Quebec" }), true);
});

test("location mode filters remote, hybrid, and on-site listings", () => {
  const remote = normalizeListingLocation({ title: "Remote Data Entry Assistant", location: "Canada" });
  const hybrid = normalizeListingLocation({ title: "Project Manager", location: "Hybrid - Toronto, ON" });
  const onsite = normalizeListingLocation({ title: "Plumber", location: "Calgary, AB" });

  assert.equal(locationMatches(remote, { mode: "remote" }), true);
  assert.equal(locationMatches(onsite, { mode: "remote" }), false);
  assert.equal(locationMatches(hybrid, { mode: "hybrid", query: "Toronto" }), true);
  assert.equal(locationMatches(onsite, { mode: "onsite", query: "Calgary, Alberta" }), true);
  assert.equal(locationMatches(remote, { mode: "either" }), true);
  assert.equal(locationMatches(onsite, { mode: "either" }), true);
});

test("location preference summaries are human-readable", () => {
  assert.equal(formatLocationPreference("either"), "Anywhere");
  assert.equal(formatLocationPreference("remote", "Toronto"), "Remote");
  assert.equal(formatLocationPreference("local", "Toronto"), "On-site near Toronto");
});

test("raw source locations are parsed into structured Canadian and US fields", () => {
  assert.deepEqual(parseLocationText("Hybrid - Toronto, ON, Canada"), {
    city: "Toronto",
    region: "ontario",
    countryCode: "CA",
  });
  assert.deepEqual(parseLocationText("Los Angeles, CA"), {
    city: "Los Angeles",
    region: "california",
    countryCode: "US",
  });
  assert.deepEqual(parseLocationText("Remote - Canada"), {
    city: "",
    region: "",
    countryCode: "CA",
  });
});

test("structured listing fields take precedence and produce a stable display label", () => {
  const normalized = normalizeListingLocation({
    title: "Project Coordinator",
    location: "Old source value",
    location_type: "hybrid",
    city: "Toronto",
    region: "ON",
    country_code: "CA",
  });

  assert.equal(normalized.type, "hybrid");
  assert.equal(normalized.city, "Toronto");
  assert.equal(normalized.region, "ontario");
  assert.equal(normalized.countryCode, "CA");
  assert.equal(normalized.source, "structured");
  assert.equal(formatListingLocation(normalized, "Old source value"), "Hybrid · Toronto, Ontario");
});

test("source-aware inference recognizes We Work Remotely rows", () => {
  const normalized = normalizeListingLocation({
    title: "Product Designer",
    source: "wwr",
    location: "Canada",
  });

  assert.equal(normalized.type, "remote");
  assert.equal(formatListingLocation(normalized), "Remote · Canada");
});

test("normalization produces a database-ready patch without discarding source text", () => {
  assert.deepEqual(toStructuredLocationPatch({
    title: "Electrician",
    location: "Calgary, AB",
  }), {
    location_type: "onsite",
    city: "Calgary",
    region: "alberta",
    country_code: "CA",
  });
});

test("location coverage diagnostics separate structured, parsed, inferred, and unresolved rows", () => {
  assert.deepEqual(summarizeLocationCoverage([
    { title: "Plumber", city: "Toronto", region: "ON" },
    { title: "Assistant", location: "Montréal, QC" },
    { title: "Remote Writer" },
    {},
  ]), {
    total: 4,
    structured: 1,
    parsed: 1,
    inferred: 1,
    unresolved: 1,
  });
});
