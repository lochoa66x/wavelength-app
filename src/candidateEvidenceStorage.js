const CANDIDATE_EVIDENCE_PREFIX = "gigscapes:candidate-evidence:v1:";

export function candidateEvidenceStorageKey(userId, targetKey) {
  if (!userId || !targetKey) return null;
  return `${CANDIDATE_EVIDENCE_PREFIX}${encodeURIComponent(userId)}:${encodeURIComponent(targetKey)}`;
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

