import assert from "node:assert/strict";
import test from "node:test";

import { auditPublicListingQuality } from "./listingQualityAudit.js";

test("public listing audit reports bounded aggregates without echoing listing content", () => {
  const report = auditPublicListingQuality([
    {
      source: "jobicy",
      title: "PRIVATE TITLE TOKEN",
      company: "PRIVATE COMPANY TOKEN",
      url: "https://jobicy.com/jobs/one?utm_source=private-url-token",
      posted_at: "2026-08-24T00:00:00.000Z",
      description_snippet: "PRIVATE DESCRIPTION TOKEN",
    },
    {
      source: "jobicy",
      url: "https://jobicy.com/jobs/one",
      posted_at: "2026-05-01T00:00:00.000Z",
      description_snippet: "",
    },
    {
      source: "unreviewed-source-name",
      url: "http://unsafe.example/job",
      posted_at: "not-a-date",
    },
    {
      source: "himalayas",
      url: "https://himalayas.app/jobs/two",
      posted_at: "2026-08-27T00:00:00.000Z",
    },
  ], { now: new Date("2026-08-25T12:00:00.000Z") });

  assert.deepEqual(report.sources, [
    { source: "himalayas", count: 1, invalidUrls: 0, undated: 0, stale: 0, futureDated: 1, snippetsAbsent: 1 },
    { source: "jobicy", count: 2, invalidUrls: 0, undated: 0, stale: 1, futureDated: 0, snippetsAbsent: 1 },
    { source: "other", count: 1, invalidUrls: 1, undated: 1, stale: 0, futureDated: 0, snippetsAbsent: 1 },
  ]);
  assert.deepEqual(report.urls, { validHttps: 3, invalid: 1, canonicalDuplicates: 1 });
  assert.deepEqual(report.freshness, {
    dated: 3,
    undated: 1,
    stale: 1,
    futureDated: 1,
    staleAfterDays: 60,
  });
  assert.deepEqual(report.snippets, { present: 1, absent: 3 });

  const serialized = JSON.stringify(report);
  assert.doesNotMatch(serialized, /PRIVATE|unsafe\.example|unreviewed-source-name/);
});

test("public listing audit handles an empty inventory deterministically", () => {
  assert.deepEqual(auditPublicListingQuality([]), {
    schemaVersion: 1,
    redacted: true,
    totalRows: 0,
    sources: [],
    urls: { validHttps: 0, invalid: 0, canonicalDuplicates: 0 },
    freshness: { dated: 0, undated: 0, stale: 0, futureDated: 0, staleAfterDays: 60 },
    snippets: { present: 0, absent: 0 },
  });
});
