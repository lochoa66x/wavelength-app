import test from "node:test";
import assert from "node:assert/strict";

import { loadLocalResume, resumeStorageKey, saveLocalResume } from "./resumeStorage.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test("resume keys are isolated by account", () => {
  assert.notEqual(resumeStorageKey("user-a"), resumeStorageKey("user-b"));
});

test("a resume is saved and loaded only for its account", () => {
  const storage = memoryStorage();

  assert.equal(saveLocalResume("user-a", "  My résumé  ", storage), true);
  assert.equal(loadLocalResume("user-a", storage), "My résumé");
  assert.equal(loadLocalResume("user-b", storage), "");
});

test("an empty resume removes the local copy", () => {
  const storage = memoryStorage();

  saveLocalResume("user-a", "My résumé", storage);
  assert.equal(saveLocalResume("user-a", "   ", storage), true);
  assert.equal(loadLocalResume("user-a", storage), "");
});
