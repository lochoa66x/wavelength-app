import test from "node:test";
import assert from "node:assert/strict";

import {
  cleanFeedHtml,
  deterministicFeedListingId,
  feedIsoDate,
  savePublicFeedListings,
} from "../api/_lib/publicFeedStore.js";

test("public-feed IDs are stable UUIDs and remain source-scoped", () => {
  const first = deterministicFeedListingId("himalayas", "job-123");
  assert.equal(first, deterministicFeedListingId("himalayas", "job-123"));
  assert.notEqual(first, deterministicFeedListingId("remotive", "job-123"));
  assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("public-feed HTML cleanup removes markup and unsafe embedded content", () => {
  assert.equal(
    cleanFeedHtml('<style>.bad{}</style><p>Build &amp; test</p><script>alert("x")</script>'),
    "Build & test",
  );
  assert.equal(cleanFeedHtml("Safe &#999999999; text"), "Safe text");
});

test("public-feed dates normalize Unix seconds and milliseconds", () => {
  const expected = "2026-08-29T09:10:11.000Z";
  const unixSeconds = Date.parse(expected) / 1_000;
  assert.equal(feedIsoDate(unixSeconds), expected);
  assert.equal(feedIsoDate(unixSeconds * 1_000), expected);
});

test("an empty public-feed batch never touches or prunes existing inventory", async () => {
  let databaseCalls = 0;
  const supabase = {
    from() {
      databaseCalls += 1;
      throw new Error("Database should not be touched");
    },
  };

  await assert.rejects(() => savePublicFeedListings({
    supabase,
    source: "remotive",
    rows: [],
  }), /existing data was left unchanged/);
  assert.equal(databaseCalls, 0);
});
