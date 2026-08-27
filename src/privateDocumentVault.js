export const PRIVATE_DOCUMENT_TABLE = "private_documents";
export const PRIVATE_DOCUMENT_SCHEMA_VERSION = 1;
export const BASE_RESUME_DOCUMENT_TYPE = "base_resume";
export const BASE_RESUME_DOCUMENT_KEY = "primary";
export const RESUME_SYNC_STORAGE_PREFIX = "gigscapes:resume-sync:v1:";

const PRIVATE_DOCUMENT_PROJECTION = "id,user_id,document_type,document_key,schema_version,payload,content_hash,revision,client_updated_at,created_at,updated_at";
const MAX_RESUME_LENGTH = 60_000;

function storageOrNull(storage) {
  if (storage) return storage;
  try { return globalThis.localStorage || null; } catch { return null; }
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
}

function hashString(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function privateDocumentHash(payload) {
  return `vault-${hashString(JSON.stringify(canonicalize(payload)))}`;
}

export function createBaseResumePayload(resumeText) {
  const text = typeof resumeText === "string" ? resumeText.trim().slice(0, MAX_RESUME_LENGTH) : "";
  return Object.freeze({ schema_version: PRIVATE_DOCUMENT_SCHEMA_VERSION, resume_text: text });
}

export function resumeTextFromPrivateDocument(document) {
  if (document?.document_type !== BASE_RESUME_DOCUMENT_TYPE) return "";
  if (document?.schema_version !== PRIVATE_DOCUMENT_SCHEMA_VERSION) return "";
  if (document?.payload?.schema_version !== PRIVATE_DOCUMENT_SCHEMA_VERSION) return "";
  return typeof document.payload.resume_text === "string"
    ? document.payload.resume_text.trim().slice(0, MAX_RESUME_LENGTH)
    : "";
}

export function resumeSyncStorageKey(userId) {
  return userId ? `${RESUME_SYNC_STORAGE_PREFIX}${encodeURIComponent(userId)}` : null;
}

export function loadResumeSyncPreference(userId, storage) {
  const key = resumeSyncStorageKey(userId);
  const target = storageOrNull(storage);
  if (!key || !target) return { enabled: false, knownRevision: 0, knownHash: "", pending: false };
  try {
    const value = JSON.parse(target.getItem(key) || "null");
    if (!value || value.version !== 1 || typeof value.enabled !== "boolean") throw new Error("invalid");
    return {
      enabled: value.enabled,
      knownRevision: Number.isSafeInteger(value.known_revision) && value.known_revision >= 0 ? value.known_revision : 0,
      knownHash: /^vault-[0-9a-f]{8}$/.test(value.known_hash || "") ? value.known_hash : "",
      pending: value.pending === true,
    };
  } catch {
    return { enabled: false, knownRevision: 0, knownHash: "", pending: false };
  }
}

export function saveResumeSyncPreference(userId, preference, storage) {
  const key = resumeSyncStorageKey(userId);
  const target = storageOrNull(storage);
  if (!key || !target) return false;
  try {
    target.setItem(key, JSON.stringify({
      version: 1,
      enabled: preference?.enabled === true,
      known_revision: Number.isSafeInteger(preference?.knownRevision) && preference.knownRevision >= 0 ? preference.knownRevision : 0,
      known_hash: /^vault-[0-9a-f]{8}$/.test(preference?.knownHash || "") ? preference.knownHash : "",
      pending: preference?.pending === true,
    }));
    return true;
  } catch { return false; }
}

export function removeResumeSyncPreference(userId, storage) {
  const key = resumeSyncStorageKey(userId);
  const target = storageOrNull(storage);
  if (!key || !target) return false;
  try { target.removeItem(key); return true; } catch { return false; }
}

export function classifyVaultError(error) {
  const code = String(error?.code || "").toUpperCase();
  const message = String(error?.message || "").toLowerCase();
  if (["42P01", "42501", "PGRST205"].includes(code) || /relation .* does not exist|permission denied/.test(message)) return "unavailable";
  if (/fetch|network|offline|timeout|failed to connect/.test(message)) return "offline";
  return "error";
}

function normalizePrivateDocument(data, userId) {
  if (!data || data.user_id !== userId) return null;
  if (data.document_type !== BASE_RESUME_DOCUMENT_TYPE || data.document_key !== BASE_RESUME_DOCUMENT_KEY) return null;
  if (!Number.isSafeInteger(Number(data.revision)) || Number(data.revision) < 1) return null;
  const text = resumeTextFromPrivateDocument(data);
  if (!text) return null;
  const payload = createBaseResumePayload(text);
  if (data.content_hash !== privateDocumentHash(payload)) return null;
  return { ...data, revision: Number(data.revision), payload };
}

export async function readPrivateResume(client, userId) {
  if (!client || !userId) return { status: "unavailable", document: null };
  const { data, error } = await client
    .from(PRIVATE_DOCUMENT_TABLE)
    .select(PRIVATE_DOCUMENT_PROJECTION)
    .eq("user_id", userId)
    .eq("document_type", BASE_RESUME_DOCUMENT_TYPE)
    .eq("document_key", BASE_RESUME_DOCUMENT_KEY)
    .maybeSingle();
  if (error) return { status: classifyVaultError(error), document: null };
  if (!data) return { status: "missing", document: null };
  const document = normalizePrivateDocument(data, userId);
  return document ? { status: "ok", document } : { status: "invalid", document: null };
}

async function readConflict(client, userId) {
  const latest = await readPrivateResume(client, userId);
  return { status: "conflict", document: latest.status === "ok" ? latest.document : null };
}

export async function writePrivateResume(client, {
  userId,
  resumeText,
  expectedRevision = 0,
  now = () => new Date(),
}) {
  const payload = createBaseResumePayload(resumeText);
  if (!client || !userId || !payload.resume_text) return { status: "invalid", document: null };
  const values = {
    user_id: userId,
    document_type: BASE_RESUME_DOCUMENT_TYPE,
    document_key: BASE_RESUME_DOCUMENT_KEY,
    schema_version: PRIVATE_DOCUMENT_SCHEMA_VERSION,
    payload,
    content_hash: privateDocumentHash(payload),
    client_updated_at: now().toISOString(),
  };

  if (!expectedRevision) {
    const { data, error } = await client
      .from(PRIVATE_DOCUMENT_TABLE)
      .insert(values)
      .select(PRIVATE_DOCUMENT_PROJECTION)
      .maybeSingle();
    if (error?.code === "23505") return readConflict(client, userId);
    if (error) return { status: classifyVaultError(error), document: null };
    const document = normalizePrivateDocument(data, userId);
    return document ? { status: "saved", document } : { status: "invalid", document: null };
  }

  const { data, error } = await client
    .from(PRIVATE_DOCUMENT_TABLE)
    .update(values)
    .eq("user_id", userId)
    .eq("document_type", BASE_RESUME_DOCUMENT_TYPE)
    .eq("document_key", BASE_RESUME_DOCUMENT_KEY)
    .eq("revision", expectedRevision)
    .select(PRIVATE_DOCUMENT_PROJECTION)
    .maybeSingle();
  if (error) return { status: classifyVaultError(error), document: null };
  if (!data) return readConflict(client, userId);
  const document = normalizePrivateDocument(data, userId);
  return document ? { status: "saved", document } : { status: "invalid", document: null };
}

export async function deletePrivateResume(client, { userId, expectedRevision }) {
  if (!client || !userId || !expectedRevision) return { status: "invalid" };
  const { data, error } = await client
    .from(PRIVATE_DOCUMENT_TABLE)
    .delete()
    .eq("user_id", userId)
    .eq("document_type", BASE_RESUME_DOCUMENT_TYPE)
    .eq("document_key", BASE_RESUME_DOCUMENT_KEY)
    .eq("revision", expectedRevision)
    .select("id")
    .maybeSingle();
  if (error) return { status: classifyVaultError(error) };
  return data?.id ? { status: "deleted" } : { status: "conflict" };
}

export function decideResumeSyncState({ localResume, remoteDocument, preference }) {
  const localPayload = createBaseResumePayload(localResume);
  const localHash = localPayload.resume_text ? privateDocumentHash(localPayload) : "";
  const remoteText = resumeTextFromPrivateDocument(remoteDocument);
  if (!remoteDocument) return preference?.enabled ? "sync_ready" : "local_only";
  if (!preference?.enabled) return "remote_available";
  if (!localHash) return "adopt_remote";
  if (localHash === remoteDocument.content_hash) return preference?.pending ? "pending" : "synced";
  return "conflict";
}
