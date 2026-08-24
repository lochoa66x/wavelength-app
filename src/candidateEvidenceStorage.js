const CANDIDATE_EVIDENCE_PREFIX = "gigscapes:candidate-evidence:v1:";
const REUSABLE_EVIDENCE_PREFIX = "gigscapes:reusable-candidate-evidence:v1:";
const MAX_REQUEST_EVIDENCE = 5;

export function isVerifiedReusableEvidence(record) {
  return record?.scope === "profile"
    && record.answer_status === "yes"
    && record.user_confirmed === true
    && record.declined !== true
    && Boolean(String(record.answer || "").trim());
}

export function candidateEvidenceStorageKey(userId, targetKey) {
  if (!userId || !targetKey) return null;
  return `${CANDIDATE_EVIDENCE_PREFIX}${encodeURIComponent(userId)}:${encodeURIComponent(targetKey)}`;
}

export function customEvidenceTargetKey(brief = {}) {
  const source = String(brief.source_url || "").trim().toLowerCase();
  const identity = source || [brief.title, brief.company, brief.location]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean)
    .join("|");
  return identity ? `custom:${identity.slice(0, 700)}` : null;
}

export function loadCandidateEvidence(userId, targetKey, storage = globalThis.localStorage) {
  const key = candidateEvidenceStorageKey(userId, targetKey);
  if (!key || !storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.slice(0, 5) : [];
  } catch (error) {
    console.error("Couldn't read the candidate evidence:", error);
    return [];
  }
}

export function saveCandidateEvidence(userId, targetKey, evidence, storage = globalThis.localStorage) {
  const key = candidateEvidenceStorageKey(userId, targetKey);
  if (!key || !storage) return false;
  try {
    const records = Array.isArray(evidence) ? evidence.slice(0, 5) : [];
    if (records.length) storage.setItem(key, JSON.stringify(records));
    else storage.removeItem(key);
    return true;
  } catch (error) {
    console.error("Couldn't save the candidate evidence:", error);
    return false;
  }
}

export function reusableCandidateEvidenceStorageKey(userId) {
  return userId ? `${REUSABLE_EVIDENCE_PREFIX}${encodeURIComponent(userId)}` : null;
}

export function loadReusableCandidateEvidence(userId, storage = globalThis.localStorage) {
  const key = reusableCandidateEvidenceStorageKey(userId);
  if (!key || !storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(key) || "[]");
    return Array.isArray(parsed) ? parsed.filter(isVerifiedReusableEvidence).slice(-MAX_REQUEST_EVIDENCE) : [];
  } catch (error) {
    console.error("Couldn't read reusable candidate evidence:", error);
    return [];
  }
}

export function saveReusableCandidateEvidence(userId, evidence, storage = globalThis.localStorage) {
  const key = reusableCandidateEvidenceStorageKey(userId);
  if (!key || !storage) return false;
  try {
    const reusable = (Array.isArray(evidence) ? evidence : [])
      .filter(isVerifiedReusableEvidence)
      .slice(-MAX_REQUEST_EVIDENCE);
    if (reusable.length) storage.setItem(key, JSON.stringify(reusable));
    else storage.removeItem(key);
    return true;
  } catch (error) {
    console.error("Couldn't save reusable candidate evidence:", error);
    return false;
  }
}

export function mergeReusableCandidateEvidence(existing = [], additions = []) {
  const merged = new Map();
  for (const record of [...existing, ...additions]) {
    if (!record?.id || !isVerifiedReusableEvidence(record)) continue;
    merged.set(record.id, record);
  }
  return Array.from(merged.values()).slice(-MAX_REQUEST_EVIDENCE);
}

export function candidateEvidenceForRequest(applicationEvidence = [], reusableEvidence = []) {
  const selected = [];
  const seen = new Set();
  const append = (record) => {
    const identity = record?.id || `${record?.requirement_id || ""}:${record?.answer || ""}`;
    if (!identity || seen.has(identity) || record?.answer_status === "unsure") return;
    selected.push(record);
    seen.add(identity);
  };
  for (const record of applicationEvidence) {
    append(record);
    if (selected.length === MAX_REQUEST_EVIDENCE) break;
  }
  for (const record of reusableEvidence) {
    if (selected.length === MAX_REQUEST_EVIDENCE) break;
    if (isVerifiedReusableEvidence(record)) append(record);
  }
  return selected;
}
