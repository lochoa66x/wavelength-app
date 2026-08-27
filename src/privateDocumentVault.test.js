import test from "node:test";
import assert from "node:assert/strict";

import {
  BASE_RESUME_DOCUMENT_KEY,
  BASE_RESUME_DOCUMENT_TYPE,
  classifyVaultError,
  createBaseResumePayload,
  decideResumeSyncState,
  loadResumeSyncPreference,
  privateDocumentHash,
  readPrivateResume,
  removeResumeSyncPreference,
  resumeSyncStorageKey,
  saveResumeSyncPreference,
} from "./privateDocumentVault.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
    has: (key) => values.has(key),
  };
}

function documentFor(userId, resumeText = "Licensed electrician") {
  const payload = createBaseResumePayload(resumeText);
  return {
    id: "document-1",
    user_id: userId,
    document_type: BASE_RESUME_DOCUMENT_TYPE,
    document_key: BASE_RESUME_DOCUMENT_KEY,
    schema_version: 1,
    payload,
    content_hash: privateDocumentHash(payload),
    revision: 3,
    client_updated_at: "2026-08-27T20:00:00.000Z",
    created_at: "2026-08-27T20:00:00.000Z",
    updated_at: "2026-08-27T20:00:00.000Z",
  };
}

function readClient(result) {
  const chain = {
    select() { return chain; },
    eq() { return chain; },
    async maybeSingle() { return result; },
  };
  return { from: () => chain };
}

test("private résumé payloads are bounded and hash deterministically", () => {
  const payload = createBaseResumePayload("  Verified experience  ");
  assert.deepEqual(payload, { schema_version: 1, resume_text: "Verified experience" });
  assert.match(privateDocumentHash(payload), /^vault-[0-9a-f]{8}$/);
  assert.equal(privateDocumentHash(payload), privateDocumentHash({ resume_text: "Verified experience", schema_version: 1 }));
});

test("sync preferences are versioned, account-isolated, and fail closed", () => {
  const storage = memoryStorage();
  assert.notEqual(resumeSyncStorageKey("user/a"), resumeSyncStorageKey("user/b"));
  assert.equal(saveResumeSyncPreference("user/a", { enabled: true, knownRevision: 3, knownHash: "vault-1234abcd", pending: true }, storage), true);
  assert.deepEqual(loadResumeSyncPreference("user/a", storage), { enabled: true, knownRevision: 3, knownHash: "vault-1234abcd", pending: true });
  assert.deepEqual(loadResumeSyncPreference("user/b", storage), { enabled: false, knownRevision: 0, knownHash: "", pending: false });
  storage.setItem(resumeSyncStorageKey("user/a"), "not-json");
  assert.deepEqual(loadResumeSyncPreference("user/a", storage), { enabled: false, knownRevision: 0, knownHash: "", pending: false });
  assert.equal(removeResumeSyncPreference("user/a", storage), true);
  assert.equal(storage.has(resumeSyncStorageKey("user/a")), false);
});

test("sync state never silently replaces divergent copies", () => {
  const remote = documentFor("user-1", "Remote résumé");
  const enabled = { enabled: true, pending: false };
  assert.equal(decideResumeSyncState({ localResume: "", remoteDocument: remote, preference: enabled }), "adopt_remote");
  assert.equal(decideResumeSyncState({ localResume: "Different local résumé", remoteDocument: remote, preference: enabled }), "conflict");
  assert.equal(decideResumeSyncState({ localResume: "Remote résumé", remoteDocument: remote, preference: enabled }), "synced");
  assert.equal(decideResumeSyncState({ localResume: "Remote résumé", remoteDocument: remote, preference: { ...enabled, pending: true } }), "pending");
  assert.equal(decideResumeSyncState({ localResume: "Local résumé", remoteDocument: remote, preference: { enabled: false } }), "remote_available");
  assert.equal(decideResumeSyncState({ localResume: "Local résumé", remoteDocument: null, preference: { enabled: false } }), "local_only");
});

test("remote reads reject another account and tampered payloads", async () => {
  const valid = documentFor("user-1");
  assert.equal((await readPrivateResume(readClient({ data: valid, error: null }), "user-1")).status, "ok");
  assert.equal((await readPrivateResume(readClient({ data: valid, error: null }), "user-2")).status, "invalid");
  assert.equal((await readPrivateResume(readClient({ data: { ...valid, content_hash: "vault-deadbeef" }, error: null }), "user-1")).status, "invalid");
});

test("vault errors distinguish unavailable schema and recoverable connectivity", () => {
  assert.equal(classifyVaultError({ code: "42P01", message: "relation does not exist" }), "unavailable");
  assert.equal(classifyVaultError({ message: "Failed to fetch" }), "offline");
  assert.equal(classifyVaultError({ code: "XX000", message: "unexpected" }), "error");
});
