import { Check, LayoutTemplate } from "lucide-react";

function TemplateThumbnail({ template, selected }) {
  const tokens = template.visualTokens;
  const isBand = tokens.headerTreatment === "accent-band";
  const isLeft = tokens.headerAlignment === "left";
  return (
    <span data-template-style={tokens.headerTreatment} aria-hidden="true" style={{ width: 48, height: 62, padding: 5, border: `1px solid ${selected ? tokens.accent : "#c9cdd1"}`, borderRadius: 4, background: "#fff", display: "flex", flexDirection: "column", gap: 3, boxSizing: "border-box", flexShrink: 0 }}>
      <span style={{ width: "100%", minHeight: isBand ? 13 : 9, padding: isBand ? "3px 2px" : 0, borderLeft: tokens.headerTreatment === "accent-edge" ? `3px solid ${tokens.accent}` : 0, background: isBand ? tokens.accent : "transparent", display: "flex", flexDirection: "column", alignItems: isLeft ? "flex-start" : "center", gap: 2, boxSizing: "border-box" }}>
        <span style={{ width: "64%", height: 3, background: isBand ? tokens.headerText : tokens.ink }} />
        <span style={{ width: "82%", height: 2, background: isBand ? tokens.headerText : tokens.muted, opacity: 0.78 }} />
      </span>
      <span style={{ width: "100%", height: tokens.sectionTreatment === "soft-band" ? 4 : 2, marginTop: 2, background: tokens.sectionTreatment === "soft-band" ? tokens.accentSoft : tokens.accent }} />
      <span style={{ width: "100%", height: 2, background: "#d9dde0" }} />
      <span style={{ width: "88%", height: 2, background: "#d9dde0" }} />
      <span style={{ width: "100%", height: tokens.sectionTreatment === "soft-band" ? 4 : 2, marginTop: 2, background: tokens.sectionTreatment === "soft-band" ? tokens.accentSoft : tokens.accent }} />
      <span style={{ width: "94%", height: 2, background: "#d9dde0" }} />
      <span style={{ width: "78%", height: 2, background: "#d9dde0" }} />
    </span>
  );
}

export function ResumeTemplateSelector({
  templates,
  recommended,
  selected,
  recommendationReason,
  showOptions,
  onToggle,
  onChoose,
  controlId,
  C,
}) {
  const groups = [
    { id: "role-aware", label: "Role-aware structures", description: "Recommended from verified occupation evidence." },
    { id: "design-style", label: "Universal design styles", description: "Choose a look without changing facts or occupation-aware section logic." },
  ].map((group) => ({ ...group, templates: templates.filter((template) => (template.group || "role-aware") === group.id) }))
    .filter((group) => group.templates.length);
  return (
    <section aria-labelledby={controlId} style={{ margin: "0 0 14px", padding: "13px 14px", border: `1px solid ${C.border}`, borderRadius: 14, background: C.bgCard }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0, flex: "1 1 260px" }}>
          <div id={controlId} style={{ display: "flex", alignItems: "center", gap: 7, color: C.text, fontSize: 13.5, fontWeight: 700 }}>
            <LayoutTemplate size={15} aria-hidden="true" /> Recommended: {recommended.displayName}
          </div>
          <p style={{ margin: "5px 0 0", color: C.textSub, fontSize: 12.5, lineHeight: 1.45 }}>{recommendationReason}</p>
          {selected.id !== recommended.id ? <p role="status" style={{ margin: "5px 0 0", color: C.textFaint, fontSize: 12 }}>Showing your choice: {selected.displayName}. Facts and evidence are unchanged.</p> : null}
        </div>
        <button type="button" onClick={onToggle} aria-expanded={showOptions} className="wl-btn" style={{ minHeight: 40, padding: "8px 13px", border: `1px solid ${C.border}`, borderRadius: 999, background: C.bg, color: C.text, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
          {showOptions ? "Close templates" : "Change template"}
        </button>
      </div>

      {showOptions ? (
        <div style={{ marginTop: 12 }}>
          {groups.map((group) => <div key={group.id} style={{ marginTop: group.id === "role-aware" ? 0 : 14 }}>
            <div style={{ marginBottom: 7 }}>
              <strong style={{ display: "block", color: C.text, fontSize: 12.5 }}>{group.label}</strong>
              <span style={{ color: C.textFaint, fontSize: 11.5 }}>{group.description}</span>
            </div>
            <ul aria-label={`${group.label} résumé templates`} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(220px, 100%), 1fr))", gap: 9, margin: 0, padding: 0, listStyle: "none" }}>
          {group.templates.map((template) => {
            const isSelected = template.id === selected.id;
            const isRecommended = template.id === recommended.id;
            const safetyLabel = template.atsSafetyLevel === "high" ? "Application-safe" : "Networking-forward";
            return (
              <li key={template.id} style={{ display: "flex", minWidth: 0 }}>
                <button
                  type="button"
                  aria-label={`${template.displayName}${isRecommended ? ", recommended" : ""}. ${template.intendedUse}`}
                  aria-pressed={isSelected}
                  onClick={() => onChoose(template.id)}
                  className="wl-btn"
                  style={{ width: "100%", minHeight: 88, padding: 10, border: `2px solid ${isSelected ? template.visualTokens.accent : C.border}`, borderRadius: 12, background: isSelected ? `${template.visualTokens.accent}0d` : C.bg, color: C.text, textAlign: "left", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 10 }}
                >
                  <TemplateThumbnail template={template} selected={isSelected} />
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 750 }}>
                      {template.displayName} {isSelected ? <Check size={13} aria-hidden="true" /> : null}
                    </span>
                    <span style={{ display: "block", marginTop: 3, color: C.textSub, fontSize: 11.5, lineHeight: 1.35 }}>{template.intendedUse}</span>
                    <span style={{ display: "block", marginTop: 4, color: C.textFaint, fontSize: 11, lineHeight: 1.35 }}>{template.description}</span>
                    <span style={{ display: "inline-block", marginTop: 5, padding: "2px 6px", borderRadius: 99, background: `${template.visualTokens.accent}18`, color: template.visualTokens.accent, fontSize: 10.5, fontWeight: 750 }}>
                      {isRecommended ? `Recommended · ${safetyLabel}` : safetyLabel}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
            </ul>
          </div>)}
        </div>
      ) : null}
    </section>
  );
}
