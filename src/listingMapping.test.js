import assert from "node:assert/strict";
import test from "node:test";

import { inferKeywordIntent, scoreListingRelevance } from "./listingCategories.js";
import { mapListingRow } from "./listingMapping.js";

test("public rows map snippets, source attribution, and valid freshness into discovery fields", () => {
  const mapped = mapListingRow({
    id: "listing-1",
    category: "tech",
    title: "Enterprise Applications Consultant",
    company: "Acme",
    location: "Toronto, Ontario, Canada",
    source: "adzuna",
    description_snippet: "Configure SAP FICO and support a verified S/4HANA implementation program.",
    posted_at: "2026-08-24T12:00:00Z",
    availability_status: "uncertain",
    availability_reason: "publisher_blocked",
    last_checked_at: "2026-08-30T12:00:00Z",
    url: "https://www.adzuna.ca/details/1?utm_source=gigscapes",
  });
  const intent = inferKeywordIntent("SAP consultant");

  assert.equal(mapped.description, null);
  assert.match(mapped.searchDescription, /SAP FICO/);
  assert.equal(mapped.postedAt, "2026-08-24T12:00:00.000Z");
  assert.equal(mapped.sourceId, "adzuna");
  assert.equal(mapped.availabilityStatus, "uncertain");
  assert.equal(mapped.availabilityReason, "publisher_blocked");
  assert.equal(mapped.lastCheckedAt, "2026-08-30T12:00:00Z");
  assert.deepEqual(mapped.sourceAttributions.map(({ label }) => label), ["Jobs by Adzuna"]);
  assert.ok(scoreListingRelevance(mapped, "SAP consultant", intent.categories, intent) > 0);
});

test("invalid posting dates remain explicitly unknown", () => {
  const mapped = mapListingRow({
    id: "listing-2",
    category: "admin",
    title: "Administrative Assistant",
    company: "Acme",
    location: "Ottawa, Ontario",
    source: "jooble",
    posted_at: "not-a-date",
    url: "https://ca.jooble.org/job/2",
  });

  assert.equal(mapped.postedAt, null);

  const missing = mapListingRow({
    id: "listing-3",
    category: "admin",
    title: "Office Assistant",
    company: "Acme",
    location: "Ottawa, Ontario",
    source: "jooble",
    posted_at: null,
    url: "https://ca.jooble.org/job/3",
  });
  assert.equal(missing.postedAt, null);
});
