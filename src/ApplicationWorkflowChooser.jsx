import { FileText, Files, ScrollText } from "lucide-react";

import { APPLICATION_WORKFLOW_INTENTS } from "./applicationPackageModel.js";

const ICONS = Object.freeze({ package: Files, resume_only: ScrollText, cover_letter_only: FileText });

export function ApplicationWorkflowChooser({ value, onChange, disabled = false, C, compact = false }) {
  return (
    <fieldset data-application-workflow-chooser disabled={disabled} style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
      <legend style={{ color: C.text, fontSize: compact ? 13 : 15, fontWeight: 750, marginBottom: 5 }}>What would you like to prepare?</legend>
      <p style={{ color: C.textSub, fontSize: 12, lineHeight: 1.45, margin: "0 0 11px" }}>Choose the documents you want for this opportunity. You can add the other document later.</p>
      <div role="radiogroup" aria-label="Application documents" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(190px, 100%), 1fr))", gap: 9 }}>
        {APPLICATION_WORKFLOW_INTENTS.map((option) => {
          const selected = value === option.id;
          const Icon = ICONS[option.id];
          return (
            <label key={option.id} style={{ display: "grid", gridTemplateColumns: "auto auto minmax(0, 1fr)", alignItems: "start", gap: 9, minHeight: 44, padding: compact ? 10 : 12, border: `1px solid ${selected ? C.orange : C.border}`, borderRadius: 12, background: selected ? (C.orangeTint || "#fff3ea") : C.bgCard, cursor: disabled ? "not-allowed" : "pointer" }}>
              <input type="radio" name="application-workflow" value={option.id} checked={selected} onChange={() => onChange(option.id)} style={{ width: 18, height: 18, margin: 0, accentColor: C.orange }} />
              <Icon size={17} color={selected ? C.orange : C.textSub} aria-hidden="true" />
              <span>
                <strong style={{ display: "block", color: C.text, fontSize: 12.5, lineHeight: 1.3 }}>{option.label}</strong>
                <span style={{ display: "block", color: C.textSub, fontSize: 11.5, lineHeight: 1.4, marginTop: 3 }}>{option.description}</span>
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
