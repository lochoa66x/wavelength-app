import { FileText, ScrollText } from "lucide-react";

const LABELS = Object.freeze({
  not_created: "Not created",
  generating: "Generating",
  draft: "Draft",
  preliminary: "Preliminary",
  ready: "Ready",
  stale: "Stale",
  failed: "Needs attention",
});

function DocumentRow({ icon: Icon, label, status, actionLabel, onAction, C }) {
  const positive = status === "ready";
  const warning = ["preliminary", "stale", "failed"].includes(status);
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: 10, alignItems: "center", padding: "11px 0", borderTop: `1px solid ${C.border}` }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
        <Icon size={16} color={positive ? C.green : warning ? C.amber : C.textSub} aria-hidden="true" />
        <span>
          <strong style={{ display: "block", color: C.text, fontSize: 13 }}>{label}</strong>
          <span style={{ color: positive ? C.green : warning ? C.amber : C.textFaint, fontSize: 11.5 }}>{LABELS[status] || LABELS.not_created}</span>
        </span>
      </div>
      {onAction ? <button type="button" onClick={onAction} className="wl-btn" style={{ minHeight: 44, border: `1px solid ${C.border}`, borderRadius: 980, background: C.bgCard, color: C.text, padding: "8px 12px", fontSize: 12, fontWeight: 700 }}>{actionLabel}</button> : null}
    </div>
  );
}

export function ApplicationPackageSummary({ item, packageStatus, resumeStatus, coverLetterStatus, onReviewResume, resumeActionLabel = "Review résumé", onOpenCoverLetter, C }) {
  const packageLabel = packageStatus === "ready" ? "Ready" : packageStatus === "preliminary" ? "Preliminary" : packageStatus === "needs_attention" ? "Needs attention" : "In progress";
  return (
    <section aria-labelledby="application-package-heading" data-application-package-summary style={{ margin: "0 0 18px", padding: "15px 16px 4px", border: `1px solid ${C.border}`, borderRadius: 15, background: C.bgCard }}>
      <div style={{ display: "flex", alignItems: "start", justifyContent: "space-between", gap: 10, flexWrap: "wrap", paddingBottom: 11 }}>
        <div>
          <div style={{ color: C.green, fontSize: 11.5, fontWeight: 750, textTransform: "uppercase", letterSpacing: 0.35 }}>Application documents</div>
          <h3 id="application-package-heading" style={{ color: C.text, fontSize: 16, margin: "4px 0 2px" }}>{item?.title || "This opportunity"}</h3>
          {item?.company ? <p style={{ color: C.textSub, fontSize: 12, margin: 0 }}>{item.company}</p> : null}
        </div>
        <span style={{ border: `1px solid ${packageStatus === "ready" ? (C.greenBorder || C.green) : (C.amberBorder || C.border)}`, borderRadius: 980, color: packageStatus === "ready" ? C.green : C.amber, padding: "5px 9px", fontSize: 11.5, fontWeight: 750 }}>{packageLabel}</span>
      </div>
      <DocumentRow icon={ScrollText} label="Tailored résumé" status={resumeStatus} actionLabel={resumeActionLabel} onAction={onReviewResume} C={C} />
      <DocumentRow icon={FileText} label="Cover letter" status={coverLetterStatus} actionLabel={coverLetterStatus === "not_created" ? "Create matching cover letter" : "Review cover letter"} onAction={onOpenCoverLetter} C={C} />
      <p style={{ color: C.textFaint, fontSize: 10.5, lineHeight: 1.4, margin: "6px 0 10px" }}>These application drafts stay on this device. Your saved résumé remains unchanged.</p>
    </section>
  );
}
