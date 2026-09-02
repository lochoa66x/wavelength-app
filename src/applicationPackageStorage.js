import { createApplicationPackageState, validateApplicationPackageState } from "./applicationPackageModel.js";
import { COVER_LETTER_STORAGE_PREFIX } from "./coverLetterStorage.js";
import { validateStoredCoverLetterPlan } from "./coverLetterModel.js";

export const APPLICATION_PACKAGE_STORAGE_PREFIX = "gigscapes:application-package:v1:";

function storageOrNull(storage) {
  if (storage) return storage;
  try { return globalThis.localStorage || null; } catch { return null; }
}

function userPrefix(prefix, userId) {
  return `${prefix}${encodeURIComponent(userId || "guest")}:`;
}

export function applicationPackageStorageKey(userId, targetKey) {
  return `${userPrefix(APPLICATION_PACKAGE_STORAGE_PREFIX, userId)}${encodeURIComponent(targetKey || "unknown")}`;
}

export function saveApplicationPackageState(userId, state, storage) {
  const target = storageOrNull(storage);
  const valid = validateApplicationPackageState(state);
  if (!target || !userId || !valid) return false;
  try {
    target.setItem(applicationPackageStorageKey(userId, valid.targetKey), JSON.stringify(valid));
    return true;
  } catch {
    return false;
  }
}

function storedKeys(storage, prefix) {
  const keys = [];
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (key?.startsWith(prefix)) keys.push(key);
  }
  return keys;
}

function legacyCoverLetterPackages(userId, storage) {
  return storedKeys(storage, userPrefix(COVER_LETTER_STORAGE_PREFIX, userId)).flatMap((key) => {
    try {
      const plan = validateStoredCoverLetterPlan(JSON.parse(storage.getItem(key) || "null"));
      if (!plan?.target?.jobTitle) return [];
      return [createApplicationPackageState({
        item: {
          id: plan.target.id,
          title: plan.target.jobTitle,
          company: plan.target.company,
          location: plan.target.location,
        },
        intent: "cover_letter_only",
        coverLetterStatus: "draft",
        sourceFingerprint: plan.sourceFingerprint,
        updatedAt: plan.updatedAt || plan.createdAt,
      })];
    } catch {
      return [];
    }
  });
}

export function listApplicationPackageStates(userId, storage) {
  const target = storageOrNull(storage);
  if (!target || !userId) return [];
  const packages = storedKeys(target, userPrefix(APPLICATION_PACKAGE_STORAGE_PREFIX, userId)).flatMap((key) => {
    try {
      const value = validateApplicationPackageState(JSON.parse(target.getItem(key) || "null"));
      return value ? [value] : [];
    } catch {
      return [];
    }
  });
  const byTarget = new Map(packages.map((entry) => [entry.targetKey, entry]));
  for (const legacy of legacyCoverLetterPackages(userId, target)) {
    if (!byTarget.has(legacy.targetKey)) byTarget.set(legacy.targetKey, legacy);
  }
  return [...byTarget.values()].sort((left, right) => String(right.updatedAt).localeCompare(String(left.updatedAt)));
}

export function removeApplicationPackageState(userId, targetKey, storage) {
  const target = storageOrNull(storage);
  if (!target || !userId) return false;
  try {
    target.removeItem(applicationPackageStorageKey(userId, targetKey));
    return true;
  } catch {
    return false;
  }
}
