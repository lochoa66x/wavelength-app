import { CheckCircle2, RotateCcw } from "lucide-react";

import { tailoringChangeCurrentText } from "./tailoringChanges.js";

export function TailoringChangeReview({ changes = [], resumeData, onDecision, C }) {
  if (!changes.length) return null;
  const changed = changes.filter((change) => change.change_type !== "retained" && change.original && change.proposed);
  const retainedCount = changes.length - changed.length;
  const reviewFirst = changed.filter((change) => change.change_type !== "rephrased");
  const straightforward = changed.filter((change) => change.change_type === "rephrased");
  const prioritizedChanges = [...reviewFirst, ...straightforward];

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
        {prioritizedChanges.map((change, index) => {
          const current = tailoringChangeCurrentText(resumeData, change);
          const usesOriginal = current === String(change.original || "").replace(/\s+/g, " ").trim();
          const citations = change.evidence_citations || [];
          const needsEvidenceReview = change.citation_complete === false;
          return (
            <div key={change.id}>
              {index === 0 && reviewFirst.length ? <h4 style={{ color: C.text, fontSize: 11.75, margin: "0 0 7px" }}>Review first · repositioned or condensed ({reviewFirst.length})</h4> : null}
              {index === reviewFirst.length && straightforward.length ? <h4 style={{ color: C.text, borderTop: reviewFirst.length ? `1px solid ${C.border}` : "none", fontSize: 11.75, margin: reviewFirst.length ? "12px 0 7px" : "0 0 7px", paddingTop: reviewFirst.length ? 10 : 0 }}>Straightforward rephrases ({straightforward.length})</h4> : null}
            <article style={{ border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 11px" }}>
              <div style={{ alignItems: "flex-start", display: "flex", gap: 8, justifyContent: "space-between" }}>
                <strong style={{ color: C.text, fontSize: 12 }}>{change.role || "Experience"} · bullet {Number(change.bullet_index || 0) + 1}</strong>
                <span style={{ color: needsEvidenceReview ? C.amber : C.blue, fontSize: 10.5, fontWeight: 750, textTransform: "capitalize" }}>{needsEvidenceReview ? "Needs evidence review" : String(change.change_type).replaceAll("_", " ")}</span>
              </div>
              <div style={{ display: "grid", gap: 7, marginTop: 8 }}>
                <div style={{ background: C.bg, borderRadius: 8, color: C.textSub, fontSize: 11.5, lineHeight: 1.45, padding: "7px 8px" }}><strong style={{ color: C.text }}>Verified original:</strong> {change.original}</div>
                <div style={{ background: C.greenTint, border: `1px solid ${C.greenBorder}`, borderRadius: 8, color: C.textSub, fontSize: 11.5, lineHeight: 1.45, padding: "7px 8px" }}><strong style={{ color: C.text }}>Tailored wording:</strong> {change.proposed}</div>
              </div>
              <p style={{ color: C.textSub, fontSize: 11.25, lineHeight: 1.45, margin: "7px 0 0" }}>{change.reason}</p>
              {citations.length ? (
                <p style={{ color: C.textFaint, fontSize: 10.75, lineHeight: 1.45, margin: "5px 0 0" }}>
                  Evidence: {citations.map((citation) => `${citation.source === "candidate_note" ? "candidate-confirmed note" : "base résumé"}${citation.line_index ? ` · line ${citation.line_index}` : ""}`).join("; ")}
                </p>
              ) : <p style={{ color: C.amber, fontSize: 10.75, margin: "5px 0 0" }}>No complete candidate-evidence citation is available for this wording.</p>}
              {onDecision ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 8 }}>
                  <button type="button" disabled={needsEvidenceReview} onClick={() => onDecision(change, "tailored")} aria-pressed={!usesOriginal} className="wl-btn" style={{ alignItems: "center", background: !usesOriginal && !needsEvidenceReview ? C.greenTint : "transparent", border: `1px solid ${!usesOriginal && !needsEvidenceReview ? C.greenBorder : C.border}`, borderRadius: 999, color: C.text, cursor: needsEvidenceReview ? "not-allowed" : "pointer", display: "inline-flex", fontSize: 11.25, fontWeight: 700, gap: 5, opacity: needsEvidenceReview ? 0.5 : 1, padding: "6px 9px" }}><CheckCircle2 size={12} /> Keep tailored wording</button>
                  <button type="button" onClick={() => onDecision(change, "original")} aria-pressed={usesOriginal} className="wl-btn" style={{ alignItems: "center", background: usesOriginal ? C.amberTint : "transparent", border: `1px solid ${usesOriginal ? C.amberBorder : C.border}`, borderRadius: 999, color: C.text, display: "inline-flex", fontSize: 11.25, fontWeight: 700, gap: 5, padding: "6px 9px" }}><RotateCcw size={12} /> Use verified original</button>
                </div>
              ) : null}
            </article>
            </div>
          );
        })}
      </div>
    </details>
  );
}
