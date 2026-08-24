import { RESUME_TEMPLATE_REGISTRY, resolveTemplateId, stableHash } from "./resumeModel.js";

const TEMPLATE_STORAGE_PREFIX = "gigscapes:resume-template:v1:";
export const RESUME_TEMPLATE_STORAGE_VERSION = 1;

export function resumeTemplateTargetKey(item = {}) {
  const listingId = typeof item?.id === "string" || typeof item?.id === "number" ? String(item.id).trim() : "";
  if (listingId) return `listing:${encodeURIComponent(listingId)}`;
  const identity = [item?.source_url || item?.url, item?.title, item?.company, item?.location]
    .map((value) => typeof value === "string" ? value.trim().toLowerCase() : "")
    .filter(Boolean)
    .join("|");
  return identity ? stableHash(identity, "target") : null;
}

export function resumeTemplateStorageKey(userId, targetKey) {
  if (!userId || !targetKey) return null;
  return `${TEMPLATE_STORAGE_PREFIX}${encodeURIComponent(userId)}:${encodeURIComponent(targetKey)}`;
}

export function loadResumeTemplateSelection(userId, targetKey, storage = globalThis.localStorage) {
  const key = resumeTemplateStorageKey(userId, targetKey);
  if (!key || !storage) return null;
  try {
    const parsed = JSON.parse(storage.getItem(key) || "null");
    if (parsed?.version !== RESUME_TEMPLATE_STORAGE_VERSION) return null;
    const normalized = resolveTemplateId(parsed.templateId, "");
    return RESUME_TEMPLATE_REGISTRY[normalized] ? normalized : null;
  } catch {
    return null;
  }
}

export function saveResumeTemplateSelection(userId, targetKey, templateId, storage = globalThis.localStorage) {
  const key = resumeTemplateStorageKey(userId, targetKey);
  if (!key || !storage) return false;
  const normalized = resolveTemplateId(templateId, "");
  if (!RESUME_TEMPLATE_REGISTRY[normalized]) return false;
  try {
    storage.setItem(key, JSON.stringify({ version: RESUME_TEMPLATE_STORAGE_VERSION, templateId: normalized }));
    return true;
  } catch {
    return false;
  }
}
