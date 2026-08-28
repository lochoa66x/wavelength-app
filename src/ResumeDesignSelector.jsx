import { Check, LayoutTemplate, ShieldCheck } from "lucide-react";

import {
  availableResumeDensities,
  availableResumeHeaderAlignments,
  availableResumeLengthPreferences,
  availableResumePalettes,
  composeResumeVisualTokens,
} from "./resumeModel.js";

const PALETTES = availableResumePalettes();
const DENSITIES = availableResumeDensities();
const HEADER_ALIGNMENTS = availableResumeHeaderAlignments();
const LENGTH_PREFERENCES = availableResumeLengthPreferences();

const sampleSections = [
  ["Professional summary", "Evidence-led positioning for the target role."],
  ["Core capabilities", "Verified skill · Relevant tool · Transferable strength"],
  ["Experience", "Role and employer", "Delivered a clear, supported result for the team."],
];

export function ResumeDesignThumbnail({ design, selected = false, compact = false, visualTokens }) {
  const tokens = visualTokens || design.visualTokens;
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

function PresentationChoiceGroup({ label, description, options, value, onChange, C, swatches = false }) {
  return (
    <fieldset style={{ minWidth: 0, margin: 0, padding: 0, border: 0 }}>
      <legend style={{ color: C.text, fontSize: 12.5, fontWeight: 750 }}>{label}</legend>
      {description ? <p style={{ margin: "3px 0 8px", color: C.textFaint, fontSize: 11, lineHeight: 1.35 }}>{description}</p> : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
        {options.map((option) => {
          const active = option.id === value;
          return (
            <button
              key={option.id}
              type="button"
              aria-pressed={active}
              onClick={() => onChange(option.id)}
              className="wl-btn"
              style={{ minHeight: 44, padding: "8px 11px", border: `1.5px solid ${active ? (option.accent || C.orange || "#a93d0c") : C.border}`, borderRadius: 10, background: active ? (option.accentSoft || C.bg) : C.bgCard, color: C.text, fontSize: 11.5, fontWeight: active ? 750 : 600, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7 }}
            >
              {swatches ? <span aria-hidden="true" style={{ width: 13, height: 13, borderRadius: 99, background: option.accent, border: "1px solid rgba(0,0,0,0.14)" }} /> : null}
              {option.displayName}
              {active ? <Check size={13} aria-hidden="true" /> : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function ResumeDesignSelector({
  designs,
  recommendedStrategy,
  recommendedDesign,
  selectedDesign,
  selectedPresentation,
  recommendationReason,
  showOptions,
  onToggle,
  onChoose,
  onPresentationChange,
  controlId,
  C,
}) {
  return (
    <section aria-labelledby={controlId} style={{ margin: "0 0 14px", padding: "15px", border: `1px solid ${C.border}`, borderRadius: 14, background: C.bgCard }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
        <div style={{ minWidth: 0, flex: "1 1 300px" }}>
          <div id={controlId} style={{ display: "flex", alignItems: "center", gap: 7, color: C.text, fontSize: 13.5, fontWeight: 750 }}>
            <ShieldCheck size={16} aria-hidden="true" /> Content approach: {recommendedStrategy.displayName}
          </div>
          <p style={{ margin: "5px 0 0", color: C.textSub, fontSize: 12.5, lineHeight: 1.45 }}>{recommendationReason}</p>
          <p style={{ margin: "6px 0 0", color: C.textFaint, fontSize: 11.5, lineHeight: 1.45 }}>
            The content approach controls evidence emphasis, section order, and role-specific headings. Changing the résumé style below never changes your facts, wording, requirement coverage, or readiness decision.
          </p>
        </div>
        <button type="button" onClick={onToggle} aria-expanded={showOptions} className="wl-btn" style={{ minHeight: 44, padding: "9px 14px", border: `1px solid ${C.border}`, borderRadius: 999, background: C.bg, color: C.text, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}>
          <LayoutTemplate size={15} aria-hidden="true" /> {showOptions ? "Close styles" : "Choose résumé style"}
        </button>
      </div>

      <div role="status" style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}`, color: C.textSub, fontSize: 12 }}>
        Résumé style: <strong style={{ color: C.text }}>{selectedDesign.displayName}</strong>
        {selectedDesign.id === recommendedDesign.id ? " · Recommended for this strategy" : ` · Gigscapes recommends ${recommendedDesign.displayName}`}
      </div>

      {showOptions ? (
        <div style={{ marginTop: 14 }}>
          <div style={{ marginBottom: 9 }}>
            <strong style={{ display: "block", color: C.text, fontSize: 13 }}>Choose the visual style</strong>
            <span style={{ color: C.textFaint, fontSize: 11.5 }}>Styles are position-independent. All seven use searchable, selectable, single-column text; the usage notes are mild suggestions, not occupational rules.</span>
          </div>
          <ul aria-label="Available visual résumé styles" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(250px, 100%), 1fr))", gap: 10, margin: 0, padding: 0, listStyle: "none" }}>
            {designs.map((design) => {
              const isSelected = design.id === selectedDesign.id;
              const isRecommended = design.id === recommendedDesign.id;
              const safetyLabel = design.atsSafetyLevel === "high" ? "Application-safe" : "Networking-forward";
              const thumbnailTokens = composeResumeVisualTokens(design, selectedPresentation);
              return (
                <li key={design.id} style={{ display: "flex", minWidth: 0 }}>
                  <button
                    type="button"
                    aria-label={`${design.displayName}${isRecommended ? ", recommended" : ""}. ${design.intendedUse}`}
                    aria-pressed={isSelected}
                    onClick={() => onChoose(design.id)}
                    className="wl-btn"
                    style={{ width: "100%", minHeight: 194, padding: 11, border: `2px solid ${isSelected ? thumbnailTokens.accent : C.border}`, borderRadius: 12, background: isSelected ? thumbnailTokens.accentSoft : C.bg, color: C.text, textAlign: "left", cursor: "pointer", display: "flex", alignItems: "flex-start", gap: 11 }}
                  >
                    <ResumeDesignThumbnail design={design} selected={isSelected} compact visualTokens={thumbnailTokens} />
                    <span style={{ minWidth: 0 }}>
                      <span style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12.5, fontWeight: 750 }}>
                        {design.displayName} {isSelected ? <Check size={14} aria-hidden="true" /> : null}
                      </span>
                      <span style={{ display: "block", marginTop: 4, color: C.textSub, fontSize: 11.5, lineHeight: 1.35 }}>{design.intendedUse}</span>
                      <span style={{ display: "block", marginTop: 5, color: C.textFaint, fontSize: 11, lineHeight: 1.35 }}>{design.description}</span>
                      <span style={{ display: "inline-block", marginTop: 7, padding: "2px 7px", borderRadius: 99, background: thumbnailTokens.accentSoft, color: thumbnailTokens.accent, fontSize: 10.5, fontWeight: 750 }}>
                        {isRecommended ? `Recommended · ${safetyLabel}` : safetyLabel}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(245px, 100%), 1fr))", gap: 16, marginTop: 18, paddingTop: 16, borderTop: `1px solid ${C.border}` }}>
            <PresentationChoiceGroup
              label="Colour palette"
              description="Applied consistently to browser preview, DOCX, and PDF."
              options={PALETTES}
              value={selectedPresentation.paletteId}
              onChange={(paletteId) => onPresentationChange({ paletteId })}
              C={C}
              swatches
            />
            <PresentationChoiceGroup
              label="Evidence density"
              description="Compact spacing fits more without removing verified content."
              options={DENSITIES}
              value={selectedPresentation.densityId}
              onChange={(densityId) => onPresentationChange({ densityId })}
              C={C}
            />
            <PresentationChoiceGroup
              label="Header alignment"
              description="Override the style default without changing identity text."
              options={HEADER_ALIGNMENTS}
              value={selectedPresentation.headerAlignment}
              onChange={(headerAlignment) => onPresentationChange({ headerAlignment })}
              C={C}
            />
            <PresentationChoiceGroup
              label="Target length"
              description="A layout preference, never permission to delete evidence. Overflow always continues safely."
              options={LENGTH_PREFERENCES}
              value={selectedPresentation.lengthPreference}
              onChange={(lengthPreference) => onPresentationChange({ lengthPreference })}
              C={C}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
