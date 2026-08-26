import { CheckCircle2, RotateCcw } from "lucide-react";

import { tailoringChangeCurrentText } from "./tailoringChanges.js";

export function TailoringChangeReview({ changes = [], resumeData, onDecision, C }) {
  if (!changes.length) return null;
  const changed = changes.filter((change) => change.change_type !== "retained" && change.original && change.proposed);
  const retainedCount = changes.length - changed.length;

  return (
    <details style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 14, margin: "0 0 12px", padding: "11px 13px" }}>
      <summary style={{ color: C.text, cursor: "pointer", fontSize: 13, fontWeight: 750 }}>
        Why this résumé changed · {changed.length} explained change{changed.length === 1 ? "" : "s"}
      </summary>
      <p style={{ color: C.textSub, fontSize: 11.75, lineHeight: 1.5, margin: "7px 0 0" }}>
        Every item below is mapped to verified résumé evidence. Your saved base résumé is unchanged. Choosing the verified original makes this export preliminary until the tailored wording is restored or the document is rechecked.
      </p>
      {retainedCount > 0 ? <p style={{ color: C.textFaint, fontSize: 11.25, margin: "5px 0 0" }}>{retainedCount} mapped line{retainedCount === 1 ? " was" : "s were"} retained without rewriting.</p> : null}
      <div style={{ display: "grid", gap: 9, marginTop: 10 }}>
        {changed.map((change) => {
          const current = tailoringChangeCurrentText(resumeData, change);
          const usesOriginal = current === String(change.original || "").replace(/\s+/g, " ").trim();
          const citation = change.evidence_citations?.[0];
          return (
            <article key={change.id} style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 11px" }}>
              <div style={{ alignItems: "flex-start", display: "flex", gap: 8, justifyContent: "space-between" }}>
                <strong style={{ color: C.text, fontSize: 12 }}>{change.role || "Experience"} · bullet {Number(change.bullet_index || 0) + 1}</strong>
                <span style={{ color: C.blue, fontSize: 10.5, fontWeight: 750, textTransform: "capitalize" }}>{String(change.change_type).replaceAll("_", " ")}</span>
              </div>
              <div style={{ display: "grid", gap: 7, marginTop: 8 }}>
                <div style={{ background: C.bg, borderRadius: 8, color: C.textSub, fontSize: 11.5, lineHeight: 1.45, padding: "7px 8px" }}><strong style={{ color: C.text }}>Verified original:</strong> {change.original}</div>
                <div style={{ background: C.greenTint, border: `1px solid ${C.greenBorder}`, borderRadius: 8, color: C.textSub, fontSize: 11.5, lineHeight: 1.45, padding: "7px 8px" }}><strong style={{ color: C.text }}>Tailored wording:</strong> {change.proposed}</div>
              </div>
              <p style={{ color: C.textSub, fontSize: 11.25, lineHeight: 1.45, margin: "7px 0 0" }}>{change.reason}</p>
              {citation ? <p style={{ color: C.textFaint, fontSize: 10.75, margin: "5px 0 0" }}>Evidence: {citation.source === "candidate_note" ? "candidate-confirmed note" : "base résumé"}{citation.line_index ? ` · line ${citation.line_index}` : ""}</p> : null}
              {onDecision ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 8 }}>
                  <button type="button" onClick={() => onDecision(change, "tailored")} aria-pressed={!usesOriginal} className="wl-btn" style={{ alignItems: "center", background: !usesOriginal ? C.greenTint : "transparent", border: `1px solid ${!usesOriginal ? C.greenBorder : C.border}`, borderRadius: 999, color: C.text, display: "inline-flex", fontSize: 11.25, fontWeight: 700, gap: 5, padding: "6px 9px" }}><CheckCircle2 size={12} /> Keep tailored wording</button>
                  <button type="button" onClick={() => onDecision(change, "original")} aria-pressed={usesOriginal} className="wl-btn" style={{ alignItems: "center", background: usesOriginal ? C.amberTint : "transparent", border: `1px solid ${usesOriginal ? C.amberBorder : C.border}`, borderRadius: 999, color: C.text, display: "inline-flex", fontSize: 11.25, fontWeight: 700, gap: 5, padding: "6px 9px" }}><RotateCcw size={12} /> Use verified original</button>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </details>
  );
}
