import test from "node:test";
import assert from "node:assert/strict";

import { migrateCloudResume } from "./resumeMigration.js";

function localResumeStore() {
  const values = new Map();
  return {
    loadResume: (userId) => values.get(userId) || "",
    saveResume: (userId, resume) => {
      values.set(userId, resume);
      return true;
    },
    value: (userId) => values.get(userId) || "",
  };
}

test("migration saves locally before clearing the cloud resume", async () => {
  const store = localResumeStore();
  const events = [];

  const result = await migrateCloudResume({
    userId: "user-1",
    cloudResume: "Cloud resume",
    loadResume: store.loadResume,
    saveResume: (userId, resume) => {
      events.push("saved-local");
      return store.saveResume(userId, resume);
    },
    clearCloudResume: async () => events.push("cleared-cloud"),
  });

  assert.equal(result.status, "migrated");
  assert.equal(store.value("user-1"), "Cloud resume");
  assert.deepEqual(events, ["saved-local", "cleared-cloud"]);
});

test("failed cloud deletion keeps the local copy and returns a warning status", async () => {
  const store = localResumeStore();

  const result = await migrateCloudResume({
    userId: "user-1",
    cloudResume: "Cloud resume",
    loadResume: store.loadResume,
    saveResume: store.saveResume,
    clearCloudResume: async () => { throw new Error("RLS denied update"); },
  });

  assert.equal(result.status, "cloud_cleanup_failed");
  assert.equal(result.resume, "Cloud resume");
  assert.equal(store.value("user-1"), "Cloud resume");
});

test("different local and cloud resumes are not overwritten or deleted", async () => {
  const store = localResumeStore();
  store.saveResume("user-1", "Local resume");
  let cleared = false;

  const result = await migrateCloudResume({
    userId: "user-1",
    cloudResume: "Different cloud resume",
    loadResume: store.loadResume,
    saveResume: store.saveResume,
    clearCloudResume: async () => { cleared = true; },
  });

  assert.equal(result.status, "conflict");
  assert.equal(result.resume, "Local resume");
  assert.equal(cleared, false);
});
