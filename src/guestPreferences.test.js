import test from "node:test";
import assert from "node:assert/strict";

import {
  GUEST_PREFERENCES_STORAGE_KEY,
  loadGuestPreferences,
  normalizeGuestPreferences,
  saveGuestPreferences,
} from "./guestPreferences.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

test("guest search preferences round trip locally", () => {
  const storage = memoryStorage();
  assert.equal(saveGuestPreferences({ keyword: "SAP analyst", field: "Technology" }, storage), true);
  assert.equal(loadGuestPreferences(storage).keyword, "SAP analyst");
});

test("guest location filters round trip locally", () => {
  const storage = memoryStorage();
  saveGuestPreferences({ countryCode: "us", region: "New York", city: "Buffalo" }, storage);
  assert.deepEqual(
    (({ countryCode, region, city }) => ({ countryCode, region, city }))(loadGuestPreferences(storage)),
    { countryCode: "US", region: "new york", city: "Buffalo" },
  );
});

test("guest workplace and work-type filters are allowlisted", () => {
  const normalized = normalizeGuestPreferences({
    location: "remote",
    workTypes: ["contract", "gig", "administrator", "contract"],
    strictness: "strict",
  });
  assert.equal(normalized.location, "remote");
  assert.deepEqual(normalized.workTypes, ["contract", "gig"]);
  assert.equal(normalized.strictness, "strict");
});

test("guest preferences exclude private and unknown content", () => {
  const storage = memoryStorage();
  saveGuestPreferences({ keyword: "plumber", resume: "private", accessToken: "secret", evidence: [{ answer: "private" }] }, storage);
  const raw = storage.getItem(GUEST_PREFERENCES_STORAGE_KEY);
  assert.doesNotMatch(raw, /private|secret|accessToken|resume|evidence/);
});

test("malformed guest storage falls back to safe defaults", () => {
  const storage = memoryStorage();
  storage.setItem(GUEST_PREFERENCES_STORAGE_KEY, "not-json");
  assert.deepEqual(loadGuestPreferences(storage), normalizeGuestPreferences());
});

test("blocked guest storage does not prevent public discovery", () => {
  const blockedStorage = {
    getItem() { throw new Error("blocked"); },
    setItem() { throw new Error("blocked"); },
  };
  assert.deepEqual(loadGuestPreferences(blockedStorage), normalizeGuestPreferences());
  assert.equal(saveGuestPreferences({ keyword: "plumber" }, blockedStorage), false);
});
