import { Check, LayoutTemplate, ShieldCheck } from "lucide-react";

const sampleSections = [
  ["Professional summary", "Evidence-led positioning for the target role."],
  ["Core capabilities", "Verified skill · Relevant tool · Transferable strength"],
  ["Experience", "Role and employer", "Delivered a clear, supported result for the team."],
];

export function ResumeDesignThumbnail({ design, selected = false, compact = false }) {
  const tokens = design.visualTokens;
  const headerBand = tokens.headerTreatment === "accent-band";
  const leftAligned = tokens.headerAlignment === "left";
  const sectionStyle = tokens.sectionTreatment === "soft-band"
    ? { background: tokens.accentSoft, padding: "2px 3px" }
    : tokens.sectionTreatment === "accent-edge"
      ? { borderLeft: `3px solid ${tokens.accent}`, paddingLeft: 4 }
      : { borderBottom: `${tokens.sectionTreatment === "compact-rule" ? 2 : 1}px solid ${tokens.accent}`, paddingBottom: 1 };
  return (
    <span
      data-design-thumbnail={design.id}
      aria-hidden="true"
      style={{
        width: compact ? 116 : 144,
        aspectRatio: "8.5 / 11",
        padding: compact ? 8 : 10,
        border: `${selected ? 2 : 1}px solid ${selected ? tokens.accent : "#d8dadd"}`,
        borderRadius: 6,
        background: tokens.paper,
        color: tokens.ink,
        display: "flex",
        flexDirection: "column",
        gap: compact ? 4 : 5,
        boxSizing: "border-box",
        boxShadow: "0 5px 16px rgba(20, 23, 27, 0.08)",
        overflow: "hidden",
        flexShrink: 0,
        fontFamily: tokens.fontFamily,
      }}
    >
      <span style={{
        padding: headerBand ? "6px 7px" : tokens.headerTreatment === "accent-edge" ? "2px 0 5px 7px" : "0 0 5px",
        borderLeft: tokens.headerTreatment === "accent-edge" ? `4px solid ${tokens.accent}` : 0,
        borderBottom: headerBand ? 0 : `1px solid ${tokens.ink}`,
        background: headerBand ? tokens.headerBackground : "transparent",
        color: headerBand ? tokens.headerText : tokens.ink,
        textAlign: leftAligned ? "left" : "center",
      }}>
        <span style={{ display: "block", fontSize: compact ? 6.5 : 7.5, fontWeight: 800, lineHeight: 1.05 }}>ALEX MORGAN</span>
        <span style={{ display: "block", marginTop: 2, color: headerBand ? tokens.headerText : tokens.accent, fontSize: compact ? 4.5 : 5.5, fontWeight: 700 }}>TARGET ROLE</span>
        <span style={{ display: "block", marginTop: 2, opacity: 0.78, fontSize: compact ? 3.7 : 4.4 }}>email@example.com · Canada</span>
      </span>
      {sampleSections.map(([heading, ...lines]) => (
        <span key={heading} style={{ display: "block", textAlign: "left" }}>
          <span style={{ display: "block", color: tokens.accent, fontSize: compact ? 4.2 : 4.9, fontWeight: 800, lineHeight: 1.1, textTransform: tokens.sectionTextTransform, ...sectionStyle }}>{heading}</span>
          {lines.map((line) => <span key={line} style={{ display: "block", marginTop: 2, fontSize: compact ? 3.6 : 4.25, lineHeight: 1.25 }}>{line}</span>)}
        </span>
      ))}
    </span>
  );
}

export function ResumeDesignSelector({
  designs,
  recommendedStrategy,
  recommendedDesign,
  selectedDesign,
  recommendationReason,
  showOptions,
  onToggle,
  onChoose,
  controlId,
  C,
}) {
  return (
    <section aria-labelledby={controlId} style={{ margin: "0 0 14px", padding: "15px", border: `1px solid ${C.border}`, borderRadius: 14, background: C.bgCard }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0, flex: "1 1 300px" }}>
          <div id={controlId} style={{ display: "flex", alignItems: "center", gap: 7, color: C.text, fontSize: 13.5, fontWeight: 750 }}>
            <ShieldCheck size={16} aria-hidden="true" /> Recommended content strategy: {recommendedStrategy.displayName}
          </div>
          <p style={{ margin: "5px 0 0", color: C.textSub, fontSize: 12.5, lineHeight: 1.45 }}>{recommendationReason}</p>
          <p style={{ margin: "6px 0 0", color: C.textFaint, fontSize: 11.5, lineHeight: 1.45 }}>
            Strategy controls evidence emphasis, section order, and role-specific headings. Changing the design below never changes your facts, wording, or readiness decision.
          </p>
        </div>
        <button type="button" onClick={onToggle} aria-expanded={showOptions} className="wl-btn" style={{ minHeight: 44, padding: "9px 14px", border: `1px solid ${C.border}`, borderRadius: 999, background: C.bg, color: C.text, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
          <LayoutTemplate size={15} aria-hidden="true" /> {showOptions ? "Close designs" : "Choose résumé design"}
        </button>
      </div>

      <div role="status" style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}`, color: C.textSub, fontSize: 12 }}>
        Visual design: <strong style={{ color: C.text }}>{selectedDesign.displayName}</strong>
        {selectedDesign.id === recommendedDesign.id ? " · Recommended for this strategy" : ` · Gigscapes recommends ${recommendedDesign.displayName}`}
      </div>

      {showOptions ? (
        <div style={{ marginTop: 14 }}>
          <div style={{ marginBottom: 9 }}>
            <strong style={{ display: "block", color: C.text, fontSize: 13 }}>Choose the look</strong>
            <span style={{ color: C.textFaint, fontSize: 11.5 }}>All seven designs use searchable, selectable, single-column text. “Networking-forward” options are more expressive but remain export-safe.</span>
          </div>
          <ul aria-label="Available visual résumé designs" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(250px, 100%), 1fr))", gap: 10, margin: 0, padding: 0, listStyle: "none" }}>
            {designs.map((design) => {
              const isSelected = design.id === selectedDesign.id;
              const isRecommended = design.id === recommendedDesign.id;
              const safetyLabel = design.atsSafetyLevel === "high" ? "Application-safe" : "Networking-forward";
              return (
                <li key={design.id} style={{ display: "flex", minWidth: 0 }}>
                  <button
                    type="button"
                    aria-label={`${design.displayName}${isRecommended ? ", recommended" : ""}. ${design.intendedUse}`}
                    aria-pressed={isSelected}
                    onClick={() => onChoose(design.id)}
                    className="wl-btn"
                    style={{ width: "100%", minHeight: 194, padding: 11, border: `2px solid ${isSelected ? design.visualTokens.accent : C.border}`, borderRadius: 12, background: isSelected ? `${design.visualTokens.accent}0d` : C.bg, color: C.text, textAlign: "left", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 11 }}
                  >
                    <ResumeDesignThumbnail design={design} selected={isSelected} compact />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 750 }}>
                        {design.displayName} {isSelected ? <Check size={14} aria-hidden="true" /> : null}
                      </span>
                      <span style={{ display: "block", marginTop: 4, color: C.textSub, fontSize: 11.5, lineHeight: 1.35 }}>{design.intendedUse}</span>
                      <span style={{ display: "block", marginTop: 5, color: C.textFaint, fontSize: 11, lineHeight: 1.35 }}>{design.description}</span>
                      <span style={{ display: "inline-block", marginTop: 7, padding: "2px 7px", borderRadius: 99, background: `${design.visualTokens.accent}18`, color: design.visualTokens.accent, fontSize: 10.5, fontWeight: 750 }}>
                        {isRecommended ? `Recommended · ${safetyLabel}` : safetyLabel}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
