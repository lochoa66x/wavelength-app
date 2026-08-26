import { useCallback, useEffect, useState } from "react";

import {
  QUALITY_SIGNAL_CONSENT_EVENT,
  readQualitySignalConsent,
  writeQualitySignalConsent,
} from "./qualitySignals.js";

export function useQualitySignalConsent() {
  const [enabled, setEnabled] = useState(() => readQualitySignalConsent());
  useEffect(() => {
    const update = () => setEnabled(readQualitySignalConsent());
    window.addEventListener(QUALITY_SIGNAL_CONSENT_EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(QUALITY_SIGNAL_CONSENT_EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  const setConsent = useCallback((next) => {
    writeQualitySignalConsent(next);
    setEnabled(readQualitySignalConsent());
  }, []);
  return [enabled, setConsent];
}
export function QualitySignalSettings({ C }) {
  const [enabled, setEnabled] = useQualitySignalConsent();
  const [expanded, setExpanded] = useState(false);
  return (
    <section style={{ padding: 18, background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 16 }}>
      <h2 style={{ margin: "0 0 7px", color: C.text, fontSize: 14.5 }}>Anonymous quality signals</h2>
      <p style={{ margin: "0 0 11px", color: C.textSub, fontSize: 12.5, lineHeight: 1.5 }}>
        {enabled ? "Sharing is on. You can turn it off immediately." : "Off by default. Gigscapes works the same either way."}
      </p>
      <button
        type="button"
        onClick={() => setEnabled(!enabled)}
        aria-pressed={enabled}
        className="wl-btn"
        style={{ width: "100%", justifyContent: "center", padding: "9px 13px", border: `1px solid ${C.border}`, borderRadius: 999, background: enabled ? (C.greenTint || "#f2fbf6") : C.bgCard, color: enabled ? C.green : C.text, font: "inherit", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
      >
        {enabled ? "Stop sharing" : "Share anonymous signals"}
      </button>
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="wl-btn"
        style={{ marginTop: 9, padding: 0, border: 0, background: "transparent", color: C.textSub, font: "inherit", fontSize: 12, fontWeight: 650, textDecoration: "underline", cursor: "pointer" }}
      >
        {expanded ? "Hide privacy details" : "What is shared?"}
      </button>
      {expanded ? (
        <div style={{ marginTop: 9, color: C.textSub, fontSize: 11.5, lineHeight: 1.55 }}>
          <p style={{ margin: "0 0 6px" }}><strong>Shared:</strong> fixed categories such as workflow outcome, template, readiness band, export type, and optional structured feedback.</p>
          <p style={{ margin: 0 }}><strong>Never shared:</strong> résumé or posting text, searches, URLs, company names, listing IDs, contact details, account IDs, or free-form feedback.</p>
        </div>
      ) : null}
    </section>
  );
}
