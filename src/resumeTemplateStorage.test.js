import assert from "node:assert/strict";
import test from "node:test";

import { TEMPLATE_IDS } from "./resumeModel.js";
import {
  loadResumeTemplateSelection,
  resumeTemplateStorageKey,
  resumeTemplateTargetKey,
  saveResumeTemplateSelection,
} from "./resumeTemplateStorage.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

test("template selection is isolated by account and target", () => {
  const storage = memoryStorage();
  const targetA = resumeTemplateTargetKey({ id: "listing-a" });
  const targetB = resumeTemplateTargetKey({ id: "listing-b" });
  assert.equal(saveResumeTemplateSelection("user-a", targetA, TEMPLATE_IDS.SAP_FUNCTIONAL, storage), true);
  assert.equal(loadResumeTemplateSelection("user-a", targetA, storage), TEMPLATE_IDS.SAP_FUNCTIONAL);
  assert.equal(loadResumeTemplateSelection("user-b", targetA, storage), null);
  assert.equal(loadResumeTemplateSelection("user-a", targetB, storage), null);
  assert.notEqual(resumeTemplateStorageKey("user-a", targetA), resumeTemplateStorageKey("user-b", targetA));
});

test("unknown or malformed stored template IDs fail safely", () => {
  const storage = memoryStorage();
  const target = resumeTemplateTargetKey({ title: "Private custom target", company: "Example" });
  const key = resumeTemplateStorageKey("user-a", target);
  storage.setItem(key, JSON.stringify({ version: 1, templateId: "removed-template" }));
  assert.equal(loadResumeTemplateSelection("user-a", target, storage), null);
  storage.setItem(key, "not-json");
  assert.equal(loadResumeTemplateSelection("user-a", target, storage), null);
  assert.equal(saveResumeTemplateSelection("user-a", target, "removed-template", storage), false);
});

test("template persistence requires an account-scoped identity", () => {
  const storage = memoryStorage();
  const target = resumeTemplateTargetKey({ id: "listing-a" });
  assert.equal(saveResumeTemplateSelection("", target, TEMPLATE_IDS.ATS_CORE, storage), false);
  assert.equal(loadResumeTemplateSelection("", target, storage), null);
});

test("Phase B1 template IDs persist without crossing account or target scope", () => {
  const storage = memoryStorage();
  const technicalTarget = resumeTemplateTargetKey({ id: "technical-listing" });
  const adminTarget = resumeTemplateTargetKey({ id: "admin-listing" });
  assert.equal(saveResumeTemplateSelection("user-a", technicalTarget, TEMPLATE_IDS.TECHNICAL_SOFTWARE, storage), true);
  assert.equal(saveResumeTemplateSelection("user-a", adminTarget, TEMPLATE_IDS.ADMIN_CUSTOMER_OPERATIONS, storage), true);
  assert.equal(loadResumeTemplateSelection("user-a", technicalTarget, storage), TEMPLATE_IDS.TECHNICAL_SOFTWARE);
  assert.equal(loadResumeTemplateSelection("user-a", adminTarget, storage), TEMPLATE_IDS.ADMIN_CUSTOMER_OPERATIONS);
  assert.equal(loadResumeTemplateSelection("user-b", technicalTarget, storage), null);
});
