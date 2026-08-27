import test from "node:test";
import assert from "node:assert/strict";

import { sanitizeVercelAnalyticsEvent } from "./analytics.js";

test("analytics removes query strings and fragments", () => {
  const result = sanitizeVercelAnalyticsEvent(
    { type: "pageview", url: "https://gigscapes.com/app?next=%2Fresume&email=person%40example.com#private" },
    "https://gigscapes.com",
  );
  assert.equal(result.url, "https://gigscapes.com/app");
  assert.equal(result.type, "pageview");
});

test("analytics suppresses auth callbacks and malformed events", () => {
  assert.equal(sanitizeVercelAnalyticsEvent({ url: "/auth/callback?token=secret" }, "https://gigscapes.com"), null);
  assert.equal(sanitizeVercelAnalyticsEvent({ url: "http://[invalid" }, "https://gigscapes.com"), null);
  assert.equal(sanitizeVercelAnalyticsEvent(null), null);
});
