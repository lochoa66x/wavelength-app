function canReceiveFocus(target) {
  return Boolean(
    target
    && target.isConnected !== false
    && target.disabled !== true
    && target.getAttribute?.("aria-hidden") !== "true"
    && typeof target.focus === "function"
  );
}
export function captureAccountActionOpener(documentRef = globalThis.document) {
  const target = documentRef?.activeElement;
  return canReceiveFocus(target) && target !== documentRef?.body ? target : null;
}
function focusWithoutScroll(target) {
  try {
    target.focus({ preventScroll: true });
  } catch {
    target.focus();
  }
}

export function restoreAccountActionFocus(opener, documentRef = globalThis.document) {
  if (canReceiveFocus(opener)) {
    focusWithoutScroll(opener);
    return "opener";
  }
  const fallbacks = documentRef?.querySelectorAll?.("[data-account-action-fallback]") || [];
  const fallback = [...fallbacks].find(canReceiveFocus);
  if (!fallback) return "none";
  focusWithoutScroll(fallback);
  return "fallback";
}
