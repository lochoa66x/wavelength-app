export const GUEST_PREFERENCES_STORAGE_KEY = "gigscapes:guest-preferences:v1";
export const GUEST_PREFERENCES_VERSION = 1;

const ALLOWED_LOCATIONS = new Set(["either", "remote", "hybrid", "onsite"]);
const ALLOWED_WORK_TYPES = new Set(["any", "fulltime", "parttime", "contract", "gig"]);
const ALLOWED_STRICTNESS = new Set(["strict", "loose"]);

function cleanText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function localStorageOrNull(storage) {
  if (storage) return storage;
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

export function normalizeGuestPreferences(value = {}) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const workTypes = Array.isArray(source.workTypes)
    ? [...new Set(source.workTypes.filter((item) => ALLOWED_WORK_TYPES.has(item)))].slice(0, 5)
    : [];
  const location = ALLOWED_LOCATIONS.has(source.location) ? source.location : "either";
  const strictness = ALLOWED_STRICTNESS.has(source.strictness) ? source.strictness : null;
  const countryCode = cleanText(source.countryCode, 2).toUpperCase();

  return {
    version: GUEST_PREFERENCES_VERSION,
    keyword: cleanText(source.keyword, 120),
    field: cleanText(source.field, 80) || null,
    location,
    countryCode: /^[A-Z]{2}$/.test(countryCode) ? countryCode : "CA",
    region: cleanText(source.region, 80).toLowerCase(),
    city: cleanText(source.city, 100),
    workTypes,
    strictness,
  };
}

export function loadGuestPreferences(storage) {
  const target = localStorageOrNull(storage);
  if (!target) return normalizeGuestPreferences();
  try {
    const parsed = JSON.parse(target.getItem(GUEST_PREFERENCES_STORAGE_KEY) || "null");
    if (parsed?.version !== GUEST_PREFERENCES_VERSION) return normalizeGuestPreferences();
    return normalizeGuestPreferences(parsed);
  } catch {
    return normalizeGuestPreferences();
  }
}

export function saveGuestPreferences(value, storage) {
  const target = localStorageOrNull(storage);
  if (!target) return false;
  try {
    target.setItem(GUEST_PREFERENCES_STORAGE_KEY, JSON.stringify(normalizeGuestPreferences(value)));
    return true;
  } catch {
    return false;
  }
}
