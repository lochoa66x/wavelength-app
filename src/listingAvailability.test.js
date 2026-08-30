import assert from "node:assert/strict";
import test from "node:test";

import {
  availabilityPatch,
  getAvailabilityPresentation,
  shouldCheckBeforeTailoring,
} from "./listingAvailability.js";

const NOW = new Date("2026-08-30T12:00:00Z").getTime();

test("availability presentation distinguishes active, stale, uncertain, and closed", () => {
  assert.equal(getAvailabilityPresentation({ availabilityStatus: "active", lastCheckedAt: "2026-08-30T11:00:00Z" }, { now: NOW }).tone, "positive");
  assert.equal(getAvailabilityPresentation({ availabilityStatus: "active", lastCheckedAt: "2026-08-20T11:00:00Z" }, { now: NOW }).status, "stale");
  assert.equal(getAvailabilityPresentation({ availabilityStatus: "uncertain" }, { now: NOW }).tone, "warning");
  assert.equal(getAvailabilityPresentation({ availabilityStatus: "closed" }, { now: NOW }).tone, "danger");
});

test("pre-tailoring checks run only for stale or uncertain listings", () => {
  assert.equal(shouldCheckBeforeTailoring({ availabilityStatus: "active", lastCheckedAt: "2026-08-30T11:00:00Z" }, { now: NOW }), false);
  assert.equal(shouldCheckBeforeTailoring({ availabilityStatus: "active", lastCheckedAt: "2026-08-20T11:00:00Z" }, { now: NOW }), true);
  assert.equal(shouldCheckBeforeTailoring({ availabilityStatus: "uncertain", lastCheckedAt: "2026-08-30T11:00:00Z" }, { now: NOW }), true);
});

test("API availability data maps without exposing or replacing listing content", () => {
  assert.deepEqual(availabilityPatch({ availability: {
    status: "closed",
    reason: "http_closed",
    lastCheckedAt: "2026-08-30T12:00:00Z",
  } }), {
    availabilityStatus: "closed",
    availabilityReason: "http_closed",
    lastCheckedAt: "2026-08-30T12:00:00Z",
    lastSeenAt: null,
    closedAt: null,
    validThrough: null,
  });
});
