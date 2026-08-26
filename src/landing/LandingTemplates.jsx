import { useState } from "react";
import { Check, LayoutTemplate } from "lucide-react";

import { availableResumeTemplates } from "../resumeModel.js";

const SECTION_LABELS = Object.freeze({
  summary: "Targeted summary",
  skills: "Verified capabilities",
  experience: "Relevant experience",
  projects: "Selected projects",
  certifications: "Credentials",
  safety: "Safety training",
  training: "Training",
  education: "Education",
  languages: "Languages",
});

const TEMPLATES = availableResumeTemplates();

export function LandingTemplates() {
  const [selectedId, setSelectedId] = useState(TEMPLATES[0]?.id || "");
  const selected = TEMPLATES.find(({ id }) => id === selectedId) || TEMPLATES[0];

  if (!selected) return null;

  return (
    <section id="resume-templates" className="landing-section landing-section--templates" aria-labelledby="templates-title">
      <div className="landing-section-heading landing-section-heading--split">
        <div>
          <p className="landing-eyebrow"><LayoutTemplate size={16} aria-hidden="true" /> Job-aware résumé templates</p>
          <h2 id="templates-title">Structure follows the evidence—not a decorative skin.</h2>
        </div>
        <p>
          Every family keeps the same verified facts. The hierarchy, section order, evidence emphasis, and page profile adapt to the work.
        </p>
      </div>

      <div className="landing-template-layout">
        <ul className="landing-template-grid" aria-label="Available ATS-readable résumé template families">
          {TEMPLATES.map((template) => {
            const isSelected = template.id === selected.id;
            return (
              <li key={template.id}>
                <button
                  type="button"
                  className="landing-template-card"
                  aria-pressed={isSelected}
                  onClick={() => setSelectedId(template.id)}
                  style={{ "--template-accent": template.visualTokens.accent }}
                >
                  <span className="landing-template-card-title">
                    {template.displayName}
                    {isSelected ? <Check size={16} aria-hidden="true" /> : null}
                  </span>
                  <span>{template.intendedUse}</span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="landing-template-preview" aria-live="polite" aria-label={`${selected.displayName} example`}>
          <div className="landing-template-preview-topline">
            <span>Sample structure</span>
            <span>ATS-readable · {selected.pageTarget}-page target</span>
          </div>
          <div className="landing-template-preview-name">Sample candidate</div>
          <div className="landing-template-preview-role">Role-specific positioning</div>
          <p>{selected.description}</p>
          <div className="landing-template-preview-sections">
            {selected.sectionOrder.slice(0, 5).map((section, index) => (
              <div key={section}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{SECTION_LABELS[section] || section}</strong>
              </div>
            ))}
          </div>
          <p className="landing-template-preview-note">
            {selected.atsSafetyLevel === "high"
              ? "Application-safe: searchable single-column text with restrained presentation."
              : "Networking-forward: searchable single-column text with a more expressive presentation."}
            {" "}Switching this example is local and immediate. It does not call AI or change candidate facts.
          </p>
        </div>
      </div>
    </section>
  );
}
