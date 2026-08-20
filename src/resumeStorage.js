const RESUME_STORAGE_PREFIX = "gigscapes:resume:v1:";

export function resumeStorageKey(userId) {
  return userId ? `${RESUME_STORAGE_PREFIX}${userId}` : null;
}

export function loadLocalResume(userId, storage = globalThis.localStorage) {
  const key = resumeStorageKey(userId);
  if (!key || !storage) return "";

  try {
    return storage.getItem(key) || "";
  } catch (error) {
    console.error("Couldn't read the local resume:", error);
    return "";
  }
}

export function saveLocalResume(userId, resume, storage = globalThis.localStorage) {
  const key = resumeStorageKey(userId);
  if (!key || !storage) return false;

  try {
    const text = String(resume || "").trim();
    if (text) storage.setItem(key, text);
    else storage.removeItem(key);
    return true;
  } catch (error) {
    console.error("Couldn't save the resume on this device:", error);
    return false;
  }
}
