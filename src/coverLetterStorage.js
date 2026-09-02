import { createCoverLetterPlan, validateStoredCoverLetterPlan } from "./coverLetterModel.js";

export const COVER_LETTER_STORAGE_PREFIX = "gigscapes:cover-letter:v1:";

function storageOrNull(storage) {
  if (storage) return storage;
  try { return globalThis.localStorage || null; } catch { return null; }
}

export function coverLetterTargetKey(item = {}) {
  return encodeURIComponent(String(item.id || `${item.title || "job"}|${item.company || ""}`).trim().toLowerCase());
}

export function coverLetterStorageKey(userId, item) {
  return `${COVER_LETTER_STORAGE_PREFIX}${encodeURIComponent(userId || "guest")}:${coverLetterTargetKey(item)}`;
}

export function saveCoverLetterDraft(userId, item, plan, storage) {
  const target = storageOrNull(storage);
  if (!target || !userId || !plan) return false;
  try {
    target.setItem(coverLetterStorageKey(userId, item), JSON.stringify(plan));
    return true;
  } catch { return false; }
}

export function loadCoverLetterDraft(userId, item, context, storage) {
  const target = storageOrNull(storage);
  if (!target || !userId) return null;
  try {
    const raw = JSON.parse(target.getItem(coverLetterStorageKey(userId, item)) || "null");
    if (!raw || raw.kind !== "cover-letter-plan") return null;
    const plan = createCoverLetterPlan(raw, context);
    return plan.sourceFingerprint === raw.sourceFingerprint && plan.contentHash === raw.contentHash ? raw : null;
  } catch { return null; }
}

export function loadCoverLetterDraftForReview(userId, item, storage) {
  const target = storageOrNull(storage);
  if (!target || !userId) return null;
  try {
    return validateStoredCoverLetterPlan(JSON.parse(target.getItem(coverLetterStorageKey(userId, item)) || "null"));
  } catch { return null; }
}

export function removeCoverLetterDraft(userId, item, storage) {
  const target = storageOrNull(storage);
  if (!target || !userId) return false;
  try { target.removeItem(coverLetterStorageKey(userId, item)); return true; } catch { return false; }
}
