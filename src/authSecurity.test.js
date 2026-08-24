import test from "node:test";
import assert from "node:assert/strict";

import {
  magicLinkCooldownRemaining,
  MAGIC_LINK_COOLDOWN_MS,
  publicAuthErrorMessage,
  recordMagicLinkSubmission,
} from "./authSecurity.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

test("magic-link UI submissions have a local cooldown", () => {
  const storage = memoryStorage();
  recordMagicLinkSubmission(storage, 1000);
  assert.equal(magicLinkCooldownRemaining(storage, 1001), MAGIC_LINK_COOLDOWN_MS - 1);
  assert.equal(magicLinkCooldownRemaining(storage, 1000 + MAGIC_LINK_COOLDOWN_MS), 0);
});

test("magic-link success and errors do not disclose account existence or internals", () => {
  assert.equal(publicAuthErrorMessage(new Error("database internal stack")), "We could not send the sign-in link. Please try again in a moment.");
  assert.doesNotMatch(publicAuthErrorMessage(new Error("database internal stack")), /database|stack/i);
});
