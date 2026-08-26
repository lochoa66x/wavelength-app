import { useState } from "react";
import { Check, LayoutTemplate, ShieldCheck } from "lucide-react";

import { ResumeDesignThumbnail } from "../ResumeDesignSelector.jsx";
import { availableResumeDesigns } from "../resumeModel.js";

const DESIGNS = availableResumeDesigns();

export function LandingTemplates() {
  const [selectedId, setSelectedId] = useState(DESIGNS[0]?.id || "");
  const selected = DESIGNS.find(({ id }) => id === selectedId) || DESIGNS[0];

  if (!selected) return null;

  return (
    <section id="resume-templates" className="landing-section landing-section--templates" aria-labelledby="templates-title">
      <div className="landing-section-heading landing-section-heading--split">
        <div>
          <p className="landing-eyebrow"><LayoutTemplate size={16} aria-hidden="true" /> Seven visual résumé designs</p>
          <h2 id="templates-title">Choose the look. Keep the evidence strategy intact.</h2>
        </div>
        <div>
          <p>
            Gigscapes first recommends a content strategy from verified evidence—then lets you choose a genuinely different visual design.
          </p>
          <p className="landing-template-strategy-note"><ShieldCheck size={16} aria-hidden="true" /> Design changes never rewrite facts, change requirement coverage, or bypass export readiness.</p>
        </div>
      </div>

      <div className="landing-template-layout">
        <ul className="landing-template-grid" aria-label="Available visual résumé designs">
          {DESIGNS.map((design) => {
            const isSelected = design.id === selected.id;
            return (
              <li key={design.id}>
                <button
                  type="button"
                  className="landing-template-card"
                  aria-label={`${design.displayName}. ${design.intendedUse}`}
                  aria-pressed={isSelected}
                  onClick={() => setSelectedId(design.id)}
                  style={{ "--template-accent": design.visualTokens.accent }}
                >
                  <ResumeDesignThumbnail design={design} selected={isSelected} compact />
                  <span className="landing-template-card-copy">
                    <span className="landing-template-card-title">
                      {design.displayName}
                      {isSelected ? <Check size={16} aria-hidden="true" /> : null}
                    </span>
                    <span>{design.tone} · {design.atsSafetyLevel === "high" ? "Application-safe" : "Networking-forward"}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        <div className="landing-template-preview" role="region" aria-live="polite" aria-label={`${selected.displayName} design example`}>
          <div className="landing-template-preview-topline">
            <span>Visual design preview</span>
            <span>Searchable · selectable · single column</span>
          </div>
          <div className="landing-template-preview-document">
            <ResumeDesignThumbnail design={selected} selected />
          </div>
          <div className="landing-template-preview-name">{selected.displayName}</div>
          <div className="landing-template-preview-role">{selected.tone} visual system</div>
          <p>{selected.description}</p>
          <dl className="landing-template-preview-facts">
            <div><dt>Best for</dt><dd>{selected.intendedUse}</dd></div>
            <div><dt>Content</dt><dd>Unchanged when you switch designs</dd></div>
            <div><dt>Exports</dt><dd>Browser preview, DOCX, and PDF share the same design tokens</dd></div>
          </dl>
          <p className="landing-template-preview-note">
            {selected.atsSafetyLevel === "high"
              ? "Application-safe: restrained presentation for online portals and direct applications."
              : "Networking-forward: a more expressive look for direct outreach while preserving ATS-readable text."}
            {" "}This gallery uses generic sample content and makes no AI request.
          </p>
        </div>
      </div>
    </section>
  );
}
