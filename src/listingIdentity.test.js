import test from "node:test";
import assert from "node:assert/strict";

import {
  canonicalListingUrlForIdentity,
  clusterDuplicateListings,
  listingStateKey,
} from "./listingIdentity.js";

test("tailored results stay attached to listing ids after filtering or reordering", () => {
  const first = { id: 10, title: "First" };
  const second = { id: 20, title: "Second" };
  const tailored = {
    [listingStateKey(first)]: { profile: "For first" },
    [listingStateKey(second)]: { profile: "For second" },
  };

  const afterFiltering = [second];
  assert.equal(tailored[listingStateKey(afterFiltering[0])].profile, "For second");
});

test("a listing without a database id is rejected", () => {
  assert.throws(() => listingStateKey({ title: "No id" }), /database id/);
});

test("canonical identity ignores allowlisted analytics parameters without changing outbound URLs", () => {
  const outbound = "https://EXAMPLE.com/jobs/123/?department=field&utm_source=feed&utm_id=launch&mc_campaign=digest#apply";
  assert.equal(
    canonicalListingUrlForIdentity(outbound),
    "https://example.com/jobs/123?department=field",
  );
  assert.match(outbound, /utm_source=feed/);
  assert.equal(canonicalListingUrlForIdentity("javascript:alert(1)"), "");
});

test("cross-source duplicates choose a deterministic direct representative and preserve attribution", () => {
  const url = "https://boards.example.com/jobs/123";
  const clustered = clusterDuplicateListings([
    {
      id: "aggregator",
      sourceId: "adzuna",
      source: "Jobs by Adzuna",
      title: "Field Service Coordinator",
      company: "Acme",
      location: "Toronto, Ontario",
      descriptionSnippet: "A sufficiently detailed public description for the same role and opportunity.",
      postedAt: "2026-08-24T10:00:00Z",
      url: `${url}?utm_source=adzuna`,
    },
    {
      id: "direct",
      sourceId: "greenhouse",
      source: "Greenhouse",
      title: "Field Service Coordinator",
      company: "Acme",
      location: "Toronto, Ontario",
      descriptionSnippet: "The direct employer description.",
      postedAt: "2026-08-24T10:00:00Z",
      url,
    },
  ]);

  assert.equal(clustered.length, 1);
  assert.equal(clustered[0].id, "direct");
  assert.deepEqual(clustered[0].duplicateIds.sort(), ["aggregator", "direct"]);
  assert.deepEqual(clustered[0].sourceAttributions.map(({ label }) => label).sort(), ["Greenhouse", "Jobs by Adzuna"]);
});

test("later pages preserve an existing representative and distinct jobs remain distinct", () => {
  const existing = {
    id: "existing",
    sourceId: "adzuna",
    source: "Jobs by Adzuna",
    company: "Acme",
    title: "Technician",
    location: "Toronto, Ontario",
    url: "https://example.com/jobs/technician",
  };
  const directDuplicate = {
    ...existing,
    id: "direct",
    sourceId: "greenhouse",
    source: "Greenhouse",
    url: "https://example.com/jobs/technician?utm_medium=feed",
  };
  const distinct = {
    ...existing,
    id: "ottawa",
    location: "Ottawa, Ontario",
    url: "https://example.com/jobs/technician-ottawa",
  };

  const clustered = clusterDuplicateListings([existing, directDuplicate, distinct], { preserveIds: [existing.id] });
  assert.equal(clustered.length, 2);
  assert.equal(clustered.find(({ duplicateIds }) => duplicateIds.includes("direct")).id, "existing");
  assert.ok(clustered.some(({ id }) => id === "ottawa"));
});
