import { useCallback, useRef, useState } from "react";

import { PRIVACY_POLICY_VERSION } from "./privacyConfig.js";

export const PRIVATE_PROCESSING_ACK_KEY = "gigscapes:private-processing-ack:v1";
const VALID_SCOPES = new Set(["intake", "resume_intake", "tailor", "cover_letter"]);

function browserStorage(storage) {
  if (storage) return storage;
  try {
    return globalThis.localStorage || null;
  } catch {
    return null;
  }
}

export function readPrivateProcessingAcknowledgement(scope, storage) {
  if (!VALID_SCOPES.has(scope)) return false;
  try {
    const parsed = JSON.parse(browserStorage(storage)?.getItem(PRIVATE_PROCESSING_ACK_KEY) || "null");
    return parsed?.policyVersion === PRIVACY_POLICY_VERSION && parsed?.scopes?.includes(scope);
  } catch {
    return false;
  }
}

export function writePrivateProcessingAcknowledgement(scope, storage) {
  if (!VALID_SCOPES.has(scope)) return false;
  const target = browserStorage(storage);
  if (!target) return false;
  try {
    const current = JSON.parse(target.getItem(PRIVATE_PROCESSING_ACK_KEY) || "null");
    const existing = current?.policyVersion === PRIVACY_POLICY_VERSION && Array.isArray(current.scopes)
      ? current.scopes.filter((item) => VALID_SCOPES.has(item))
      : [];
    target.setItem(PRIVATE_PROCESSING_ACK_KEY, JSON.stringify({
      policyVersion: PRIVACY_POLICY_VERSION,
      scopes: [...new Set([...existing, scope])],
      acknowledgedAt: new Date().toISOString(),
    }));
    return true;
  } catch {
    return false;
  }
}

export function usePrivateProcessingGate(storage) {
  const [pending, setPending] = useState(null);
  const openerRef = useRef(null);

  const requestPrivateProcessing = useCallback((scope, action) => {
    if (!VALID_SCOPES.has(scope) || typeof action !== "function") return Promise.resolve(false);
    if (readPrivateProcessingAcknowledgement(scope, storage)) {
      return Promise.resolve(action()).then(() => true);
    }
    openerRef.current = typeof document !== "undefined" ? document.activeElement : null;
    return new Promise((resolve) => setPending({ scope, action, resolve }));
  }, [storage]);

  const cancel = useCallback(() => {
    setPending((current) => {
      current?.resolve(false);
      return null;
    });
  }, []);

  const confirm = useCallback(() => {
    setPending((current) => {
      if (!current) return null;
      writePrivateProcessingAcknowledgement(current.scope, storage);
      Promise.resolve()
        .then(current.action)
        .then(() => current.resolve(true), () => current.resolve(false));
      return null;
    });
  }, [storage]);

  return { pending, openerRef, requestPrivateProcessing, cancel, confirm };
}
