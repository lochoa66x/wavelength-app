import { AlertTriangle, CheckCircle2, ShieldCheck } from "lucide-react";

export function AtsReview({ review, C }) {
  if (!review) return null;
  const ready = review.status === "ready";
  const issues = review.verb_issues?.length + review.tense_issues?.length + (review.reverse_chronological ? 0 : 1);

  return (
    <div style={{ background: ready ? C.greenTint : C.amberTint, border: `1px solid ${ready ? C.greenBorder : C.amberBorder}`, borderRadius: 14, padding: "14px 16px", marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 13, fontWeight: 700, color: C.text }}>
          {ready ? <ShieldCheck size={16} color={C.green} /> : <AlertTriangle size={16} color={C.amber} />}
          ATS quality check
        </div>
        <strong style={{ fontSize: 13, color: C.text }}>{review.score}/100</strong>
      </div>
      <div style={{ display: "grid", gap: 5, color: C.textSub, fontSize: 12.5, lineHeight: 1.45 }}>
        <span style={{ display: "flex", gap: 6, alignItems: "center" }}><CheckCircle2 size={13} /> Reverse-chronological, single-column export</span>
        <span style={{ display: "flex", gap: 6, alignItems: "center" }}><CheckCircle2 size={13} /> No unsupported numbers, employers, titles, or dates detected</span>
        <span>{review.matched_keywords?.length || 0} truthful posting keywords matched{issues ? ` · ${issues} wording item${issues === 1 ? "" : "s"} to review` : ""}</span>
        {review.missing_keywords?.length > 0 && (
          <span>Unmatched posting terms: {review.missing_keywords.slice(0, 8).join(", ")}. Add them only if your real experience supports them.</span>
        )}
      </div>
      <p style={{ fontSize: 11.5, color: C.textFaint, margin: "9px 0 0" }}>{review.disclaimer}</p>
    </div>
  );
}
