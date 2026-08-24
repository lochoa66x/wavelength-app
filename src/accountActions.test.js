import test from "node:test";
import assert from "node:assert/strict";

import {
  ACCOUNT_ACTIONS,
  accountActionGateDecision,
  accountActionMessage,
  buildPendingActionAuthRedirectUrl,
  consumePendingAccountAction,
  createPendingAccountAction,
  PENDING_ACCOUNT_ACTION_STORAGE_KEY,
  PENDING_ACCOUNT_ACTION_TTL_MS,
  pendingActionDestination,
  pendingActionFromAuthCallback,
  persistPendingAccountAction,
  readPendingAccountAction,
  validatePendingAccountAction,
} from "./accountActions.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

const NOW = 1_800_000_000_000;

test("save job produces action-specific sign-in context", () => {
  const decision = accountActionGateDecision({ action: "save_job", listingId: "listing-1", returnPath: "/app", now: NOW });
  assert.equal(decision.outcome, "sign_in");
  assert.equal(accountActionMessage(decision.pending.action), "Sign in to save this job.");
});

test("tailor resume produces action-specific sign-in context", () => {
  assert.match(accountActionMessage("tailor_resume"), /tailor your résumé/i);
});

test("resume editing is an allowlisted private action", () => {
  assert.ok(ACCOUNT_ACTIONS.includes("edit_resume"));
  assert.deepEqual(pendingActionDestination({ action: "edit_resume" }), { step: "resume" });
});

test("URL posting import is an allowlisted private action", () => {
  assert.deepEqual(pendingActionDestination({ action: "import_posting" }), { step: "custom_job", mode: "url" });
});

test("screenshot posting upload is an allowlisted private action", () => {
  assert.deepEqual(pendingActionDestination({ action: "upload_posting_screenshots" }), { step: "custom_job", mode: "screenshots" });
});

test("pasted posting intake is an allowlisted private action", () => {
  assert.deepEqual(pendingActionDestination({ action: "paste_posting" }), { step: "custom_job", mode: "paste" });
});

test("DOCX export uses a download-specific sign-in message", () => {
  assert.match(accountActionMessage("download_docx"), /download this tailored résumé/i);
});

test("PDF export uses a download-specific sign-in message", () => {
  assert.match(accountActionMessage("download_pdf"), /download this tailored résumé/i);
});

test("copying tailored text is gated", () => {
  assert.match(accountActionMessage("copy_tailored_text"), /copy this tailored résumé/i);
});

test("authenticated users continue immediately without a pending record", () => {
  const decision = accountActionGateDecision({
    session: { user: { id: "user-1" } },
    action: "save_job",
    listingId: "listing-1",
    now: NOW,
  });
  assert.deepEqual(decision, { outcome: "continue", pending: null });
});

test("pending actions are consumed once", () => {
  const storage = memoryStorage();
  const pending = createPendingAccountAction({ action: "save_job", listingId: "listing-1", createdAt: NOW });
  assert.equal(persistPendingAccountAction(pending, storage), true);
  assert.deepEqual(consumePendingAccountAction(storage, NOW), pending);
  assert.equal(consumePendingAccountAction(storage, NOW), null);
});

test("expired pending actions are rejected and removed", () => {
  const storage = memoryStorage();
  const pending = createPendingAccountAction({ action: "edit_resume", createdAt: NOW });
  storage.setItem(PENDING_ACCOUNT_ACTION_STORAGE_KEY, JSON.stringify(pending));
  assert.equal(readPendingAccountAction(storage, NOW + PENDING_ACCOUNT_ACTION_TTL_MS + 1), null);
  assert.equal(storage.getItem(PENDING_ACCOUNT_ACTION_STORAGE_KEY), null);
});

test("unknown pending actions are rejected", () => {
  assert.equal(createPendingAccountAction({ action: "delete_everything", createdAt: NOW }), null);
  assert.equal(validatePendingAccountAction({ version: 1, action: "delete_everything", returnPath: "/app", createdAt: NOW }, NOW), null);
});

test("unsafe and out-of-scope return paths are rejected", () => {
  for (const returnPath of ["https://evil.example/app", "//evil.example/app", "/admin", "/sign-in", "/auth/callback"]) {
    assert.equal(createPendingAccountAction({ action: "edit_resume", returnPath, createdAt: NOW }), null);
  }
});

test("invalid listing identifiers are rejected", () => {
  assert.equal(createPendingAccountAction({ action: "save_job", listingId: "https://evil.example", createdAt: NOW }), null);
  assert.equal(createPendingAccountAction({ action: "save_job", listingId: "", createdAt: NOW }), null);
});

test("sensitive or unknown fields are never persisted", () => {
  const storage = memoryStorage();
  const unsafe = {
    version: 1,
    action: "edit_resume",
    returnPath: "/app",
    createdAt: NOW,
    resume: "private résumé",
    accessToken: "secret-token",
    email: "person@example.com",
  };
  assert.equal(persistPendingAccountAction(unsafe, storage), false);
  assert.equal(storage.getItem(PENDING_ACCOUNT_ACTION_STORAGE_KEY), null);
});

test("a valid magic-link continuation restores only the safe instruction", () => {
  const storage = memoryStorage();
  const pending = createPendingAccountAction({ action: "tailor_resume", listingId: "listing-7", createdAt: NOW });
  persistPendingAccountAction(pending, storage);
  const restored = consumePendingAccountAction(storage, NOW);
  assert.deepEqual(restored, pending);
  assert.deepEqual(pendingActionDestination(restored), { step: "digest", listingId: "listing-7" });
});

test("an expired callback continuation falls back safely", () => {
  const storage = memoryStorage();
  const pending = createPendingAccountAction({ action: "edit_resume", createdAt: NOW });
  storage.setItem(PENDING_ACCOUNT_ACTION_STORAGE_KEY, JSON.stringify(pending));
  assert.equal(consumePendingAccountAction(storage, NOW + PENDING_ACCOUNT_ACTION_TTL_MS + 1), null);
});

test("callback continuation cannot loop after consumption", () => {
  const storage = memoryStorage();
  persistPendingAccountAction(createPendingAccountAction({ action: "edit_resume", createdAt: NOW }), storage);
  assert.ok(consumePendingAccountAction(storage, NOW));
  assert.equal(readPendingAccountAction(storage, NOW), null);
});

test("new-tab magic links restore only non-sensitive allowlisted fields", () => {
  const pending = createPendingAccountAction({ action: "save_job", listingId: "listing-9", createdAt: NOW });
  const redirect = new URL(buildPendingActionAuthRedirectUrl("https://gigscapes.example", pending));
  assert.equal(redirect.pathname, "/auth/callback");
  assert.equal(redirect.searchParams.get("pa"), "save_job");
  assert.equal(redirect.searchParams.get("pl"), "listing-9");
  assert.doesNotMatch(redirect.toString(), /resume|email|token|evidence/i);
  assert.deepEqual(pendingActionFromAuthCallback(redirect.searchParams, NOW), pending);
});

test("tampered or expired callback instructions are ignored", () => {
  const params = new URLSearchParams({ next: "/admin", pa: "delete_everything", pt: String(NOW) });
  assert.equal(pendingActionFromAuthCallback(params, NOW), null);

  const expired = new URL(buildPendingActionAuthRedirectUrl(
    "https://gigscapes.example",
    createPendingAccountAction({ action: "edit_resume", createdAt: NOW }),
  ));
  assert.equal(pendingActionFromAuthCallback(expired.searchParams, NOW + PENDING_ACCOUNT_ACTION_TTL_MS + 1), null);
});
