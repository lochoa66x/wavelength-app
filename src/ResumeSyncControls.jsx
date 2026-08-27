import { useState } from "react";
import { Cloud, CloudOff, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";

import { resumeTextFromPrivateDocument } from "./privateDocumentVault.js";

function Button({ children, onClick, disabled, danger = false, primary = false }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="wl-btn"
      style={{
        minHeight: 40,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 7,
        padding: "9px 14px",
        borderRadius: 999,
        border: primary ? 0 : "1px solid #D9D5D1",
        background: danger ? "#B42318" : primary ? "#1C1917" : "#FFFFFF",
        color: danger || primary ? "#FFFFFF" : "#1C1917",
        font: "inherit",
        fontSize: 12.5,
        fontWeight: 750,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
    >{children}</button>
  );
}

export function ResumeSyncControls({ sync, localResume }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  if (sync.phase === "idle") return null;
  const remoteText = resumeTextFromPrivateDocument(sync.remote);
  const working = sync.busy;

  return (
    <section style={{ marginTop: 22, padding: 16, border: "1px solid #E2DEDA", borderRadius: 16, background: "#FAFAF9" }} aria-labelledby="resume-sync-heading">
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <span style={{ width: 34, height: 34, flex: "0 0 auto", display: "grid", placeItems: "center", borderRadius: "50%", background: sync.phase === "synced" ? "#EAF7EF" : "#FFF4E8", color: sync.phase === "synced" ? "#13795B" : "#B65C00" }}>
          {sync.phase === "synced" ? <ShieldCheck size={18} aria-hidden="true" /> : sync.phase === "unavailable" ? <CloudOff size={18} aria-hidden="true" /> : <Cloud size={18} aria-hidden="true" />}
        </span>
        <div>
          <h3 id="resume-sync-heading" style={{ margin: "0 0 4px", fontSize: 15 }}>Cross-device résumé</h3>
          <p style={{ margin: 0, color: "#6E6E73", fontSize: 12.5, lineHeight: 1.5 }}>
            {sync.phase === "local_only" || sync.phase === "sync_ready"
              ? "Browser-only is the default. Turn on account sync only if you want this résumé available on another signed-in device."
              : sync.phase === "remote_available"
                ? "A synced résumé exists for this account. Your browser copy will not be replaced until you choose."
                : sync.phase === "conflict"
                  ? "This browser and your account contain different copies. Gigscapes will not overwrite either one automatically."
                  : sync.phase === "synced"
                    ? "This browser copy is linked to the private résumé in your account. Future saves on this device will sync."
                    : sync.phase === "pending"
                      ? "Your latest edit is safe in this browser and is waiting to sync."
                      : sync.message || "Your browser copy is unchanged."}
          </p>
        </div>
      </div>

      {sync.phase === "conflict" ? (
        <div style={{ marginTop: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
            <label style={{ fontSize: 12, fontWeight: 750 }}>This browser
              <textarea readOnly value={localResume} rows={6} style={{ width: "100%", boxSizing: "border-box", marginTop: 6, resize: "vertical", border: "1px solid #D9D5D1", borderRadius: 10, padding: 10, background: "white", font: "inherit", fontSize: 12 }} />
            </label>
            <label style={{ fontSize: 12, fontWeight: 750 }}>Synced copy
              <textarea readOnly value={remoteText} rows={6} style={{ width: "100%", boxSizing: "border-box", marginTop: 6, resize: "vertical", border: "1px solid #D9D5D1", borderRadius: 10, padding: 10, background: "white", font: "inherit", fontSize: 12 }} />
            </label>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 10 }}>
            <Button onClick={sync.keepLocal} disabled={working} primary>Keep this browser copy</Button>
            <Button onClick={sync.useRemote} disabled={working}>Use synced copy</Button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
          {(sync.phase === "local_only" || sync.phase === "sync_ready") && <Button onClick={sync.enable} disabled={working || !localResume.trim()} primary><Cloud size={14} /> Turn on résumé sync</Button>}
          {sync.phase === "remote_available" && (
            localResume.trim()
              ? <Button onClick={sync.enable} disabled={working} primary><Cloud size={14} /> Compare and turn on sync</Button>
              : <Button onClick={sync.useRemote} disabled={working} primary><Cloud size={14} /> Use synced copy on this device</Button>
          )}
          {sync.phase === "synced" && <Button onClick={sync.stopOnDevice} disabled={working}><CloudOff size={14} /> Stop syncing on this device</Button>}
          {(sync.phase === "pending" || sync.phase === "offline" || sync.phase === "error" || sync.phase === "unavailable") && <Button onClick={sync.retry} disabled={working}><RefreshCw size={14} /> Retry sync</Button>}
          {sync.remote && !confirmDelete && <Button onClick={() => setConfirmDelete(true)} disabled={working}><Trash2 size={14} /> Delete synced copy</Button>}
        </div>
      )}

      {confirmDelete ? (
        <div role="group" aria-label="Confirm synced résumé deletion" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12, padding: 10, borderRadius: 12, background: "#FFF4E8" }}>
          <strong style={{ width: "100%", fontSize: 12.5 }}>Delete the account-synced résumé from every device? The copy in this browser will remain.</strong>
          <Button danger disabled={working} onClick={async () => { if (await sync.deleteRemote()) setConfirmDelete(false); }}>Yes, delete synced copy</Button>
          <Button disabled={working} onClick={() => setConfirmDelete(false)}>Cancel</Button>
        </div>
      ) : null}

      {sync.message ? <p role="status" style={{ margin: "10px 0 0", color: "#6E6E73", fontSize: 12.5 }}>{sync.message}</p> : null}
      <p style={{ margin: "10px 0 0", color: "#88837E", fontSize: 11.5, lineHeight: 1.45 }}>Sync uses your signed-in Supabase account with per-user database rules. It is encrypted in transit, but it is not end-to-end encrypted.</p>
    </section>
  );
}
