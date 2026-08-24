export const MAGIC_LINK_COOLDOWN_MS = 30_000;
export const MAGIC_LINK_COOLDOWN_KEY = "gigscapes:magic-link-cooldown:v1";

function sessionStorageOrNull(storage) {
  if (storage) return storage;
  try {
    return globalThis.sessionStorage || null;
  } catch {
    return null;
  }
}

export function magicLinkCooldownRemaining(storage, now = Date.now()) {
  const target = sessionStorageOrNull(storage);
  if (!target) return 0;
  try {
    const sentAt = Number(target.getItem(MAGIC_LINK_COOLDOWN_KEY));
    if (!Number.isFinite(sentAt)) return 0;
    return Math.max(0, MAGIC_LINK_COOLDOWN_MS - (now - sentAt));
  } catch {
    return 0;
  }
}

export function recordMagicLinkSubmission(storage, now = Date.now()) {
  const target = sessionStorageOrNull(storage);
  if (!target) return false;
  try {
    target.setItem(MAGIC_LINK_COOLDOWN_KEY, String(now));
    return true;
  } catch {
    return false;
  }
}

export function publicAuthErrorMessage(error) {
  const message = String(error?.message || error || "").toLowerCase();
  if (message.includes("rate") || message.includes("too many")) {
    return "Please wait a moment before requesting another sign-in link.";
  }
  if (message.includes("email") && (message.includes("invalid") || message.includes("format"))) {
    return "Enter a valid email address and try again.";
  }
  return "We could not send the sign-in link. Please try again in a moment.";
}
