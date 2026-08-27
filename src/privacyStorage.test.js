import test from "node:test";
import assert from "node:assert/strict";

import { PRIVATE_PROCESSING_ACK_KEY } from "./privateProcessing.js";
import { clearPrivateBrowserData, privateBrowserDataKeys } from "./privacyStorage.js";

function storageFrom(entries) {
  const values = new Map(entries);
  return {
    get length() { return values.size; },
    key(index) { return [...values.keys()][index] ?? null; },
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    entries() { return [...values.entries()]; },
  };
}

test("local deletion is allowlisted to the current account's private resume records", () => {
  const storage = storageFrom([
    ["gigscapes:resume:v1:user-1", "private resume"],
    ["gigscapes:candidate-evidence:v1:user-1:listing%3A1", "[]"],
    ["gigscapes:reusable-candidate-evidence:v1:user-1", "[]"],
    ["gigscapes:resume-template:v1:user-1:listing%3A1", "{}"],
    ["gigscapes:cover-letter:v1:user-1:listing%3A1", "{}"],
    ["gigscapes:resume-sync:v1:user-1", "{}"],
    [PRIVATE_PROCESSING_ACK_KEY, "{}"],
    ["gigscapes:resume:v1:user-2", "other account"],
    ["gigscapes:guest-preferences:v1", "search prefs"],
    ["gigscapes:quality-signal-consent:v1", "quality choice"],
    ["sb-project-auth-token", "auth session"],
  ]);

  assert.equal(privateBrowserDataKeys("user-1", storage).length, 7);
  assert.deepEqual(clearPrivateBrowserData("user-1", storage), { ok: true, removed: 7 });
  assert.deepEqual(storage.entries(), [
    ["gigscapes:resume:v1:user-2", "other account"],
    ["gigscapes:guest-preferences:v1", "search prefs"],
    ["gigscapes:quality-signal-consent:v1", "quality choice"],
    ["sb-project-auth-token", "auth session"],
  ]);
});
