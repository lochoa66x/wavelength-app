import { useCallback, useEffect, useRef, useState } from "react";

import {
  createBaseResumePayload,
  decideResumeSyncState,
  deletePrivateResume,
  loadResumeSyncPreference,
  privateDocumentHash,
  readPrivateResume,
  removeResumeSyncPreference,
  resumeTextFromPrivateDocument,
  saveResumeSyncPreference,
  writePrivateResume,
} from "./privateDocumentVault.js";
import { supabase } from "./supabase.js";

const INITIAL_STATE = Object.freeze({ phase: "idle", remote: null, message: "", busy: false });

export function useResumeVault({ userId, ready, localResume, replaceLocalResume }) {
  const [state, setState] = useState(INITIAL_STATE);
  const stateRef = useRef(INITIAL_STATE);
  const localResumeRef = useRef(localResume);
  const updateState = useCallback((next) => {
    stateRef.current = typeof next === "function" ? next(stateRef.current) : next;
    setState(stateRef.current);
  }, []);

  useEffect(() => { localResumeRef.current = localResume; }, [localResume]);

  const storeKnownDocument = useCallback((document, { pending = false, enabled = true } = {}) => {
    saveResumeSyncPreference(userId, {
      enabled,
      knownRevision: document?.revision || 0,
      knownHash: document?.content_hash || "",
      pending,
    });
  }, [userId]);

  const refresh = useCallback(async () => {
    if (!userId || !ready) return;
    updateState((current) => ({ ...current, busy: true, message: "" }));
    const result = await readPrivateResume(supabase, userId);
    if (result.status === "unavailable") {
      updateState({ phase: "unavailable", remote: null, message: "Account sync is not available in this environment yet.", busy: false });
      return;
    }
    if (result.status === "offline" || result.status === "error") {
      updateState((current) => ({ ...current, phase: "offline", message: "We could not check the synced copy. Your browser copy is unchanged.", busy: false }));
      return;
    }
    if (result.status === "invalid") {
      updateState({ phase: "error", remote: null, message: "The synced copy could not be safely verified. Your browser copy is unchanged.", busy: false });
      return;
    }
    const remote = result.document;
    const preference = loadResumeSyncPreference(userId);
    const phase = decideResumeSyncState({ localResume: localResumeRef.current, remoteDocument: remote, preference });
    if (phase === "adopt_remote" && remote) {
      const text = resumeTextFromPrivateDocument(remote);
      if (replaceLocalResume(text)) {
        storeKnownDocument(remote);
        updateState({ phase: "synced", remote, message: "Synced résumé restored on this device.", busy: false });
        return;
      }
    }
    updateState({ phase, remote, message: "", busy: false });
  }, [ready, replaceLocalResume, storeKnownDocument, updateState, userId]);

  useEffect(() => {
    if (!userId || !ready) {
      updateState(INITIAL_STATE);
      return undefined;
    }
    refresh();
    return undefined;
  }, [ready, refresh, updateState, userId]);

  const saveResult = useCallback((result, text) => {
    if (result.status === "saved") {
      storeKnownDocument(result.document);
      updateState({ phase: "synced", remote: result.document, message: "Résumé synced across your account.", busy: false });
      return true;
    }
    if (result.status === "conflict") {
      updateState({ phase: "conflict", remote: result.document, message: "Another copy changed before this save. Choose which résumé to keep.", busy: false });
      return false;
    }
    if (result.status === "invalid") {
      updateState((current) => ({
        ...current,
        phase: "error",
        message: result.reason === "resume_too_long"
          ? "This résumé is longer than the 60,000-character sync limit. It remains complete in this browser and was not uploaded."
          : result.reason === "resume_payload_too_large"
            ? "This résumé exceeds the safe encoded sync limit. It remains complete in this browser and was not uploaded."
            : "The résumé could not be safely prepared for sync. Your browser copy is unchanged and was not uploaded.",
        busy: false,
      }));
      return false;
    }
    const payload = createBaseResumePayload(text);
    saveResumeSyncPreference(userId, {
      ...loadResumeSyncPreference(userId),
      enabled: true,
      knownHash: payload.resume_text ? privateDocumentHash(payload) : "",
      pending: true,
    });
    updateState((current) => ({
      ...current,
      phase: result.status === "unavailable" ? "unavailable" : "pending",
      message: result.status === "unavailable"
        ? "Account sync is not available in this environment yet. Your browser copy is safe."
        : "Saved in this browser. Sync is pending until the connection recovers.",
      busy: false,
    }));
    return false;
  }, [storeKnownDocument, updateState, userId]);

  const syncText = useCallback(async (text, expectedRevision) => {
    updateState((current) => ({ ...current, busy: true, message: "" }));
    const result = await writePrivateResume(supabase, { userId, resumeText: text, expectedRevision });
    return saveResult(result, text);
  }, [saveResult, updateState, userId]);

  const enableText = useCallback(async (resumeText = localResumeRef.current) => {
    const text = String(resumeText || "").trim();
    if (!userId || !text) return false;
    localResumeRef.current = text;
    updateState((current) => ({ ...current, busy: true, message: "" }));
    const latest = await readPrivateResume(supabase, userId);
    if (latest.status === "missing") return syncText(text, 0);
    if (latest.status !== "ok") return saveResult(latest, text);
    if (latest.document.content_hash === privateDocumentHash(createBaseResumePayload(text))) {
      storeKnownDocument(latest.document);
      updateState({ phase: "synced", remote: latest.document, message: "Cross-device résumé sync is on.", busy: false });
      return true;
    }
    updateState({ phase: "conflict", remote: latest.document, message: "A different synced résumé already exists. Choose which copy to keep.", busy: false });
    return false;
  }, [saveResult, storeKnownDocument, syncText, updateState, userId]);

  const enable = useCallback(() => enableText(localResumeRef.current), [enableText]);

  const syncAfterLocalSave = useCallback(async (text) => {
    const preference = loadResumeSyncPreference(userId);
    if (!preference.enabled) return false;
    const remoteRevision = stateRef.current.remote?.revision || preference.knownRevision || 0;
    return syncText(text, remoteRevision);
  }, [syncText, userId]);

  const useRemote = useCallback(() => {
    const remote = stateRef.current.remote;
    const text = resumeTextFromPrivateDocument(remote);
    if (!remote || !text || !replaceLocalResume(text)) {
      updateState((current) => ({ ...current, message: "The synced copy could not be saved in this browser.", busy: false }));
      return false;
    }
    storeKnownDocument(remote);
    updateState({ phase: "synced", remote, message: "The synced copy is now active on this device.", busy: false });
    return true;
  }, [replaceLocalResume, storeKnownDocument, updateState]);

  const keepLocal = useCallback(async () => {
    const remote = stateRef.current.remote;
    if (!remote) return enable();
    return syncText(localResumeRef.current, remote.revision);
  }, [enable, syncText]);

  const stopOnDevice = useCallback(() => {
    const remote = stateRef.current.remote;
    storeKnownDocument(remote, { enabled: false });
    updateState({ phase: remote ? "remote_available" : "local_only", remote, message: "Automatic résumé sync is off on this device. The synced copy remains in your account.", busy: false });
  }, [storeKnownDocument, updateState]);

  const deleteRemote = useCallback(async () => {
    const remote = stateRef.current.remote;
    if (!remote) return false;
    updateState((current) => ({ ...current, busy: true, message: "" }));
    const result = await deletePrivateResume(supabase, { userId, expectedRevision: remote.revision });
    if (result.status === "deleted") {
      removeResumeSyncPreference(userId);
      updateState({ phase: "local_only", remote: null, message: "The synced résumé was deleted. Your browser copy remains.", busy: false });
      return true;
    }
    if (result.status === "conflict") {
      await refresh();
      updateState((current) => ({ ...current, message: "The synced copy changed before deletion. Review it and try again." }));
      return false;
    }
    updateState((current) => ({ ...current, phase: result.status === "unavailable" ? "unavailable" : "offline", message: "The synced copy was not deleted. Your browser copy is unchanged.", busy: false }));
    return false;
  }, [refresh, updateState, userId]);

  const resetAfterLocalClear = useCallback(() => {
    removeResumeSyncPreference(userId);
    const remote = stateRef.current.remote;
    updateState({
      phase: remote ? "remote_available" : "local_only",
      remote,
      message: remote
        ? "Private data was cleared from this browser. The account-synced copy was not deleted."
        : "Private data was cleared from this browser.",
      busy: false,
    });
  }, [updateState, userId]);

  const retry = useCallback(() => {
    const preference = loadResumeSyncPreference(userId);
    if (preference.enabled && localResumeRef.current.trim()) return syncAfterLocalSave(localResumeRef.current);
    return refresh();
  }, [refresh, syncAfterLocalSave, userId]);

  useEffect(() => {
    if (state.phase !== "pending") return undefined;
    const handleOnline = () => retry();
    globalThis.addEventListener?.("online", handleOnline);
    return () => globalThis.removeEventListener?.("online", handleOnline);
  }, [retry, state.phase]);

  return { ...state, enable, enableText, syncAfterLocalSave, keepLocal, useRemote, stopOnDevice, deleteRemote, resetAfterLocalClear, refresh, retry };
}
