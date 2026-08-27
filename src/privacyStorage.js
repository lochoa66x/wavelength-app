import {
  CANDIDATE_EVIDENCE_PREFIX,
  REUSABLE_EVIDENCE_PREFIX,
} from "./candidateEvidenceStorage.js";
import { PRIVATE_PROCESSING_ACK_KEY } from "./privateProcessing.js";
import { RESUME_STORAGE_PREFIX } from "./resumeStorage.js";
import { TEMPLATE_STORAGE_PREFIX } from "./resumeTemplateStorage.js";
import { COVER_LETTER_STORAGE_PREFIX } from "./coverLetterStorage.js";
import { RESUME_SYNC_STORAGE_PREFIX } from "./privateDocumentVault.js";

function keysIn(storage) {
  const keys = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key) keys.push(key);
  }
  return keys;
}

export function privateBrowserDataKeys(userId, storage = globalThis.localStorage) {
  if (!userId || !storage) return [];
  const encodedUserId = encodeURIComponent(userId);
  const exactKeys = new Set([
    `${RESUME_STORAGE_PREFIX}${userId}`,
    `${REUSABLE_EVIDENCE_PREFIX}${encodedUserId}`,
    `${RESUME_SYNC_STORAGE_PREFIX}${encodedUserId}`,
    PRIVATE_PROCESSING_ACK_KEY,
  ]);
  const prefixes = [
    `${CANDIDATE_EVIDENCE_PREFIX}${encodedUserId}:`,
    `${TEMPLATE_STORAGE_PREFIX}${encodedUserId}:`,
    `${COVER_LETTER_STORAGE_PREFIX}${encodedUserId}:`,
  ];

  return keysIn(storage).filter((key) => exactKeys.has(key) || prefixes.some((prefix) => key.startsWith(prefix)));
}

export function clearPrivateBrowserData(userId, storage = globalThis.localStorage) {
  if (!userId || !storage) return { ok: false, removed: 0 };
  try {
    const keys = privateBrowserDataKeys(userId, storage);
    keys.forEach((key) => storage.removeItem(key));
    return { ok: true, removed: keys.length };
  } catch {
    return { ok: false, removed: 0 };
  }
}
