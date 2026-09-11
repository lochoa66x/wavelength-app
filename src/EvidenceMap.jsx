import { useId, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, CircleHelp, FileCheck2, ShieldAlert } from "lucide-react";
import { applicationRequirementMatchesFilter, buildApplicationRiskView } from "./applicationRisk.js";

function toneColors(tone, C) {
  if (tone === "positive") return { color: C.green, border: C.greenBorder, background: C.greenTint, Icon: CheckCircle2 };
  if (tone === "neutral") return { color: C.blue, border: C.blueBorder, background: C.blueTint || C.bgCard, Icon: CheckCircle2 };
  if (tone === "danger") return { color: C.red, border: C.redBorder || C.amberBorder, background: C.redTint || C.amberTint, Icon: ShieldAlert };
  if (tone === "caution") return { color: C.amber, border: C.amberBorder, background: C.amberTint, Icon: AlertTriangle };
  return { color: C.amber, border: C.amberBorder, background: C.amberTint, Icon: CircleHelp };
}

function requirementTone(requirement, C) {
  if (requirement.gapSeverity === "verified_blocker") return { color: C.red, border: C.redBorder || C.amberBorder, background: C.redTint || C.amberTint };
  if (requirement.gapSeverity === "material_gap") return { color: C.amber, border: C.amberBorder, background: C.amberTint };
  if (requirement.gapSeverity === "candidate_check") return { color: C.blue, border: C.blueBorder, background: C.blueTint || C.bgCard };
  if (requirement.evidenceMatch === "direct") return { color: C.green, border: C.greenBorder, background: C.greenTint };
  if (["adjacent", "transferable"].includes(requirement.evidenceMatch)) return { color: C.blue, border: C.blueBorder, background: C.blueTint || C.bgCard };
  return { color: C.amber, border: C.border, background: C.bgCard };
}

function RequirementDetail({ requirement, C }) {
  const tone = requirementTone(requirement, C);
  const citationLabel = requirement.citation?.source === "candidate_note" ? "Candidate-confirmed note" : "Base résumé";
  return (
    <details style={{ border: `1px solid ${tone.border}`, background: C.bgCard, borderRadius: 11, overflow: "hidden" }}>
      <summary style={{ color: C.text, cursor: "pointer", padding: "10px 11px", fontSize: 12, lineHeight: 1.45, fontWeight: 700 }}>
        <span>{requirement.requirement}</span>
        <span style={{ display: "inline-block", color: tone.color, background: tone.background, border: `1px solid ${tone.border}`, borderRadius: 999, marginLeft: 7, padding: "2px 7px", fontSize: 10, fontWeight: 800, whiteSpace: "nowrap" }}>
          {requirement.gapSeverity === "supported" ? requirement.evidenceLabel : requirement.severityLabel}
        </span>
      </summary>
      <div style={{ borderTop: `1px solid ${C.border}`, padding: "10px 11px 12px" }}>
        <dl style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8, margin: 0 }}>
          {[
            ["Requirement type", requirement.originLabel],
            ["Importance", requirement.importance],
            ["Assessment confidence", requirement.confidence],
          ].map(([label, value]) => (
            <div key={label} style={{ minWidth: 0 }}>
              <dt style={{ color: C.textSub, fontSize: 10.25 }}>{label}</dt>
              <dd style={{ color: C.text, fontSize: 11.25, fontWeight: 650, margin: "2px 0 0", textTransform: label === "Requirement type" ? "none" : "capitalize" }}>{value}</dd>
            </div>
          ))}
        </dl>
        {requirement.parentRequirement ? (
          <p style={{ color: C.textSub, fontSize: 10.75, lineHeight: 1.4, margin: "9px 0 0" }}>
            Atomic requirement separated from: “{requirement.parentRequirement}”
          </p>
        ) : null}
        <p style={{ color: C.textSub, fontSize: 11.5, lineHeight: 1.5, margin: "9px 0 0" }}>
          <strong style={{ color: C.text }}>Why:</strong> {requirement.explanation}
        </p>
        {requirement.citation ? (
          <blockquote style={{ color: C.textSub, borderLeft: `3px solid ${tone.border}`, background: tone.background, borderRadius: "0 8px 8px 0", fontSize: 11.5, lineHeight: 1.48, margin: "9px 0 0", padding: "8px 9px" }}>
            “{requirement.citation.excerpt}”
            <footer style={{ color: C.textSub, fontSize: 10.5, marginTop: 4 }}>
              {citationLabel} · {requirement.citation.section}{requirement.citation.lineIndex ? ` · line ${requirement.citation.lineIndex}` : ""}
            </footer>
          </blockquote>
        ) : (
          <div style={{ color: C.textSub, background: C.bgSubtle || C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11.25, lineHeight: 1.45, marginTop: 9, padding: "7px 8px" }}>
            No supporting candidate evidence was found. The posting text is never used as candidate evidence.
          </div>
        )}
        {requirement.unproven ? (
          <p style={{ color: C.textSub, fontSize: 11.25, lineHeight: 1.45, margin: "8px 0 0" }}>
            <strong style={{ color: C.text }}>Still unproven:</strong> {requirement.unproven}
          </p>
        ) : null}
        {requirement.matchBasis ? (
          <p style={{ color: C.textSub, fontSize: 10.75, lineHeight: 1.4, margin: "7px 0 0" }}>{requirement.matchBasis}</p>
        ) : null}
        {requirement.applicationImpact ? (
          <p style={{ color: C.textSub, fontSize: 11.25, lineHeight: 1.45, margin: "7px 0 0" }}>
            <strong style={{ color: C.text }}>Application impact:</strong> {requirement.applicationImpact}
          </p>
        ) : null}
        {requirement.safeLanguage && requirement.evidenceMatch !== "missing" ? (
          <p style={{ color: C.textSub, fontSize: 11.25, lineHeight: 1.45, margin: "7px 0 0" }}>
            <strong style={{ color: C.text }}>Evidence-safe language:</strong> {requirement.safeLanguage}
          </p>
        ) : null}
        <div style={{ color: C.textSub, background: C.bgSubtle || C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, fontSize: 11.25, lineHeight: 1.45, marginTop: 9, padding: "7px 8px" }}>
          <strong style={{ color: C.text }}>What could change this:</strong> {requirement.nextAction}
        </div>
      </div>
    </details>
  );
}

export function EvidenceMap({ review, C }) {
  const view = useMemo(() => buildApplicationRiskView(review), [review]);
  const [filter, setFilter] = useState("all");
  const filterGroupId = useId();
  const selectedFilter = view.filters.find((item) => item.id === filter);
  const activeFilter = selectedFilter && (selectedFilter.id === "all" || selectedFilter.count > 0) ? filter : "all";
  const visibleRequirements = useMemo(
    () => view.requirements.filter((requirement) => applicationRequirementMatchesFilter(requirement, activeFilter)),
    [view.requirements, activeFilter],
  );
  const outlookStyle = toneColors(view.outlook.tone, C);
  const OutlookIcon = outlookStyle.Icon;

  return (
    <div style={{ display: "grid", gap: 10, margin: "10px 0 4px" }}>
      <section aria-label="Document checks" style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 13px" }}>
        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 7, color: C.text, fontSize: 12.5, fontWeight: 750 }}>
          <FileCheck2 aria-hidden="true" size={15} color={view.document.truthChecksPass ? C.green : C.amber} />
          Document checks · {view.document.truthLabel}
          <span style={{ marginLeft: "auto", color: view.document.exportBlocked ? C.red : C.textSub, fontSize: 11 }}>{view.document.exportLabel}</span>
        </div>
        <p style={{ color: C.textSub, fontSize: 11.75, lineHeight: 1.5, margin: "5px 0 0" }}>{view.document.detail}</p>
      </section>
      <section aria-labelledby={`${filterGroupId}-outlook`} style={{ color: C.text, background: outlookStyle.background, border: `1px solid ${outlookStyle.border}`, borderRadius: 12, padding: "12px 13px" }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 9 }}>
          <div style={{ minWidth: 0, flex: "1 1 300px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <OutlookIcon aria-hidden="true" size={16} color={outlookStyle.color} />
              <h3 id={`${filterGroupId}-outlook`} style={{ fontSize: 12.75, margin: 0 }}>Role fit</h3>
            </div>
            <p style={{ color: C.textSub, fontSize: 11.75, lineHeight: 1.48, margin: "6px 0 0" }}>{view.outlook.reason}</p>
          </div>
          <span style={{ color: outlookStyle.color, background: C.bgCard, border: `1px solid ${outlookStyle.border}`, borderRadius: 999, padding: "5px 9px", fontSize: 10.75, fontWeight: 800 }}>
            {view.outlook.label}
          </span>
        </div>
        <p style={{ color: C.textSub, fontSize: 11.75, lineHeight: 1.5, margin: "9px 0 0" }}>
          Central qualifications and responsibilities: <strong style={{ color: C.text }}>{view.coreCounts.verifiedStrengths} direct · {view.coreCounts.relatedEvidence} related · {view.coreCounts.missing} unsupported{view.coreCounts.unassessed ? ` · ${view.coreCounts.unassessed} unassessed` : ""}</strong>
        </p>
        {(view.highlights.strengths.length > 0 || view.highlights.gaps.length > 0) ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 14, marginTop: 10 }}>
          {[["Strongest evidence", view.highlights.strengths], ["Review first", view.highlights.gaps]].map(([label, entries]) => entries.length ? <div key={label}>
            <div style={{ fontSize: 11.75, fontWeight: 750 }}>{label}</div>
            <ul style={{ margin: "5px 0 0", paddingLeft: 17, color: C.textSub, fontSize: 11.75, lineHeight: 1.5 }}>{entries.map((entry) => <li key={entry.id}>{entry.requirement}</li>)}</ul>
          </div> : null)}
        </div> : null}
        <p style={{ color: C.textSub, fontSize: 10.75, lineHeight: 1.4, margin: "10px 0 0" }}>
          Evidence confidence: <strong style={{ textTransform: "capitalize" }}>{view.outlook.confidence}</strong> · Related experience supports part of a requirement; it does not establish equivalent ownership.
        </p>
      </section>

      <details style={{ borderTop: `1px solid ${C.border}`, paddingTop: 9 }}>
        <summary style={{ color: C.text, cursor: "pointer", fontSize: 12.5, fontWeight: 750 }}>
          Requirement evidence · {view.counts.total} total ({view.coreCounts.total} central)
        </summary>
        {!view.requirements.length ? (
          <div role="status" style={{ color: C.textSub, background: C.amberTint, border: `1px solid ${C.amberBorder}`, borderRadius: 9, fontSize: 11.5, lineHeight: 1.45, marginTop: 9, padding: "8px 9px" }}>
            Candidate gaps are not inferred from incomplete posting data. Review the full responsibilities and qualifications to unlock the Evidence Map.
          </div>
        ) : (
          <>
            <div id={filterGroupId} role="group" aria-label="Filter Evidence Map" style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 9 }}>
              {view.filters.map((item) => {
                const selected = item.id === activeFilter;
                const disabled = item.id !== "all" && item.count === 0;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={selected}
                    disabled={disabled}
                    onClick={() => setFilter(item.id)}
                    style={{ color: selected ? C.bgCard : C.textSub, background: selected ? C.text : C.bgCard, border: `1px solid ${selected ? C.text : C.border}`, borderRadius: 999, cursor: disabled ? "not-allowed" : "pointer", minHeight: 34, opacity: disabled ? 0.45 : 1, padding: "6px 9px", fontSize: 10.75, fontWeight: 700 }}
                  >
                    {item.label} ({item.count})
                  </button>
                );
              })}
            </div>
            <p aria-live="polite" style={{ color: C.textSub, fontSize: 10.75, margin: "8px 0 0" }}>
              Showing {visibleRequirements.length} of {view.requirements.length} requirements. Credential checks and skills to review appear first.
            </p>
            <div style={{ display: "grid", gap: 7, marginTop: 8 }}>
              {visibleRequirements.map((requirement) => (
                <div key={requirement.id} style={{ contentVisibility: "auto", containIntrinsicSize: "80px" }}>
                  <RequirementDetail requirement={requirement} C={C} />
                </div>
              ))}
            </div>
          </>
        )}
      </details>
    </div>
  );
}
