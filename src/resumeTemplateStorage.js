import {
  RESUME_DESIGN_REGISTRY,
  RESUME_STRATEGY_REGISTRY,
  RESUME_TEMPLATE_REGISTRY,
  presentationSelectionFromLegacy,
  resolveDensityId,
  resolveDesignId,
  resolveHeaderAlignment,
  resolveLengthPreference,
  resolvePaletteId,
  resolveStrategyId,
  resolveTemplateId,
  stableHash,
} from "./resumeModel.js";

export const TEMPLATE_STORAGE_PREFIX = "gigscapes:resume-template:v1:";
export const RESUME_TEMPLATE_STORAGE_VERSION = 3;

function withPresentationDefaults(selection) {
  return {
    ...selection,
    paletteId: resolvePaletteId(selection?.paletteId),
    densityId: resolveDensityId(selection?.densityId),
    headerAlignment: resolveHeaderAlignment(selection?.headerAlignment),
    lengthPreference: resolveLengthPreference(selection?.lengthPreference),
  };
}

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
    const candidate = parsed?.version === 1
      ? parsed.templateId
      : [2, RESUME_TEMPLATE_STORAGE_VERSION].includes(parsed?.version)
        ? parsed.legacyTemplateId || parsed.designId || parsed.strategyId
        : "";
    const normalized = resolveTemplateId(candidate, "");
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
  const selection = presentationSelectionFromLegacy(normalized);
  try {
    storage.setItem(key, JSON.stringify({
      version: RESUME_TEMPLATE_STORAGE_VERSION,
      strategyId: selection.strategyId,
      designId: selection.designId,
      paletteId: resolvePaletteId(),
      densityId: resolveDensityId(),
      headerAlignment: resolveHeaderAlignment(),
      lengthPreference: resolveLengthPreference(),
      legacyTemplateId: normalized,
    }));
    return true;
  } catch {
    return false;
  }
}

export function loadResumePresentationSelection(userId, targetKey, storage = globalThis.localStorage) {
  const key = resumeTemplateStorageKey(userId, targetKey);
  if (!key || !storage) return null;
  try {
    const parsed = JSON.parse(storage.getItem(key) || "null");
    if (parsed?.version === 1) {
      const legacyId = resolveTemplateId(parsed.templateId, "");
      return RESUME_TEMPLATE_REGISTRY[legacyId]
        ? withPresentationDefaults(presentationSelectionFromLegacy(legacyId))
        : null;
    }
    if (![2, RESUME_TEMPLATE_STORAGE_VERSION].includes(parsed?.version)) return null;
    const strategyId = resolveStrategyId(parsed.strategyId, "");
    const designId = resolveDesignId(parsed.designId, "");
    if (!RESUME_STRATEGY_REGISTRY[strategyId] || !RESUME_DESIGN_REGISTRY[designId]) return null;
    return withPresentationDefaults({
      strategyId,
      designId,
      paletteId: parsed.paletteId,
      densityId: parsed.densityId,
      headerAlignment: parsed.headerAlignment,
      lengthPreference: parsed.lengthPreference,
    });
  } catch {
    return null;
  }
}

export function saveResumePresentationSelection(userId, targetKey, selection, storage = globalThis.localStorage) {
  const key = resumeTemplateStorageKey(userId, targetKey);
  if (!key || !storage || !selection || typeof selection !== "object") return false;
  const strategyId = resolveStrategyId(selection.strategyId, "");
  const designId = resolveDesignId(selection.designId, "");
  if (!RESUME_STRATEGY_REGISTRY[strategyId] || !RESUME_DESIGN_REGISTRY[designId]) return false;
  const paletteId = resolvePaletteId(selection.paletteId);
  const densityId = resolveDensityId(selection.densityId);
  const headerAlignment = resolveHeaderAlignment(selection.headerAlignment);
  const lengthPreference = resolveLengthPreference(selection.lengthPreference);
  try {
    storage.setItem(key, JSON.stringify({ version: RESUME_TEMPLATE_STORAGE_VERSION, strategyId, designId, paletteId, densityId, headerAlignment, lengthPreference }));
    return true;
  } catch {
    return false;
  }
}
