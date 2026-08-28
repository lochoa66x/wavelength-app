import test from "node:test";
import assert from "node:assert/strict";

import {
  BASE_RESUME_DOCUMENT_KEY,
  BASE_RESUME_DOCUMENT_TYPE,
  MAX_BASE_RESUME_LENGTH,
  MAX_PRIVATE_DOCUMENT_PAYLOAD_BYTES,
  classifyVaultError,
  createBaseResumePayload,
  deletePrivateResume,
  decideResumeSyncState,
  loadResumeSyncPreference,
  privateDocumentHash,
  readPrivateResume,
  removeResumeSyncPreference,
  resumeSyncStorageKey,
  saveResumeSyncPreference,
  validateBaseResumeText,
  writePrivateResume,
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

test("private résumé payloads normalize and hash deterministically", () => {
  const payload = createBaseResumePayload("  Verified experience  ");
  assert.deepEqual(payload, { schema_version: 1, resume_text: "Verified experience" });
  assert.match(privateDocumentHash(payload), /^vault-[0-9a-f]{8}$/);
  assert.equal(privateDocumentHash(payload), privateDocumentHash({ resume_text: "Verified experience", schema_version: 1 }));
});

test("oversized résumés are rejected without truncation or a vault request", async () => {
  const oversized = `verified-${"x".repeat(MAX_BASE_RESUME_LENGTH)}`;
  let requested = false;
  const client = { from() { requested = true; throw new Error("must not run"); } };
  assert.equal(createBaseResumePayload(oversized).resume_text, oversized);
  assert.deepEqual(validateBaseResumeText(oversized), {
    valid: false,
    reason: "resume_too_long",
    length: oversized.length,
  });
  assert.deepEqual(await writePrivateResume(client, { userId: "user-1", resumeText: oversized }), {
    status: "invalid",
    reason: "resume_too_long",
    document: null,
  });
  assert.equal(requested, false);
});

test("multibyte payloads respect the database byte limit before a vault request", async () => {
  const oversized = "😀".repeat(25_000);
  let requested = false;
  const validation = validateBaseResumeText(oversized);
  assert.ok(oversized.length <= MAX_BASE_RESUME_LENGTH);
  assert.equal(validation.valid, false);
  assert.equal(validation.reason, "resume_payload_too_large");
  assert.ok(validation.payloadBytes > MAX_PRIVATE_DOCUMENT_PAYLOAD_BYTES);
  const result = await writePrivateResume({ from() { requested = true; } }, { userId: "user-1", resumeText: oversized });
  assert.equal(result.status, "invalid");
  assert.equal(result.reason, "resume_payload_too_large");
  assert.equal(requested, false);
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

test("thrown transport failures remain recoverable and never escape", async () => {
  const client = { from() { throw new Error("Failed to fetch"); } };
  assert.equal((await readPrivateResume(client, "user-1")).status, "offline");
  assert.equal((await writePrivateResume(client, { userId: "user-1", resumeText: "Verified résumé" })).status, "offline");
  assert.equal((await deletePrivateResume(client, { userId: "user-1", expectedRevision: 1 })).status, "offline");
});

test("insert and revision-bound update preserve the document ownership contract", async () => {
  let insertedValues;
  const insertChain = {
    insert(values) { insertedValues = values; return insertChain; },
    select() { return insertChain; },
    async maybeSingle() {
      return {
        data: {
          id: "document-1",
          ...insertedValues,
          revision: 1,
          created_at: "2026-08-28T12:00:00.000Z",
          updated_at: "2026-08-28T12:00:00.000Z",
        },
        error: null,
      };
    },
  };
  const insertClient = { from(table) { assert.equal(table, "private_documents"); return insertChain; } };
  const inserted = await writePrivateResume(insertClient, {
    userId: "user-1",
    resumeText: "Verified résumé",
    now: () => new Date("2026-08-28T12:00:00.000Z"),
  });
  assert.equal(inserted.status, "saved");
  assert.equal(inserted.document.revision, 1);
  assert.equal(insertedValues.user_id, "user-1");
  assert.equal(insertedValues.document_type, BASE_RESUME_DOCUMENT_TYPE);
  assert.equal(insertedValues.document_key, BASE_RESUME_DOCUMENT_KEY);

  let updatedValues;
  const filters = [];
  const updateChain = {
    update(values) { updatedValues = values; return updateChain; },
    eq(key, value) { filters.push([key, value]); return updateChain; },
    select() { return updateChain; },
    async maybeSingle() {
      return {
        data: {
          id: "document-1",
          ...updatedValues,
          revision: 4,
          created_at: "2026-08-28T12:00:00.000Z",
          updated_at: "2026-08-28T12:05:00.000Z",
        },
        error: null,
      };
    },
  };
  const updated = await writePrivateResume({ from: () => updateChain }, {
    userId: "user-1",
    resumeText: "Updated verified résumé",
    expectedRevision: 3,
    now: () => new Date("2026-08-28T12:05:00.000Z"),
  });
  assert.equal(updated.status, "saved");
  assert.equal(updated.document.revision, 4);
  assert.deepEqual(filters, [
    ["user_id", "user-1"],
    ["document_type", BASE_RESUME_DOCUMENT_TYPE],
    ["document_key", BASE_RESUME_DOCUMENT_KEY],
    ["revision", 3],
  ]);
});

test("a stale update returns the latest copy as an explicit conflict", async () => {
  const latest = documentFor("user-1", "Newer remote résumé");
  let operation = "";
  const client = {
    from() {
      const chain = {
        update() { operation = "update"; return chain; },
        select() { if (!operation) operation = "read"; return chain; },
        eq() { return chain; },
        async maybeSingle() {
          return operation === "update"
            ? (operation = "", { data: null, error: null })
            : { data: latest, error: null };
        },
      };
      return chain;
    },
  };
  const result = await writePrivateResume(client, {
    userId: "user-1",
    resumeText: "Stale local résumé",
    expectedRevision: 2,
  });
  assert.equal(result.status, "conflict");
  assert.equal(result.document.content_hash, latest.content_hash);
});

test("delete is revision-bound and reports a late conflict without deleting local data", async () => {
  const filters = [];
  const chain = {
    delete() { return chain; },
    eq(key, value) { filters.push([key, value]); return chain; },
    select() { return chain; },
    async maybeSingle() { return { data: null, error: null }; },
  };
  const result = await deletePrivateResume({ from: () => chain }, { userId: "user-1", expectedRevision: 7 });
  assert.equal(result.status, "conflict");
  assert.deepEqual(filters, [
    ["user_id", "user-1"],
    ["document_type", BASE_RESUME_DOCUMENT_TYPE],
    ["document_key", BASE_RESUME_DOCUMENT_KEY],
    ["revision", 7],
  ]);
});
