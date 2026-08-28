import { useEffect, useRef, useState } from "react";
import { Check, Expand, LayoutTemplate, ShieldCheck, X } from "lucide-react";

import { ResumeDesignSample, ResumeDesignThumbnail } from "../ResumeDesignSelector.jsx";
import { availableResumeDesigns } from "../resumeModel.js";

const DESIGNS = availableResumeDesigns();

export function LandingTemplates() {
  const [selectedId, setSelectedId] = useState(DESIGNS[0]?.id || "");
  const [fullPreviewOpen, setFullPreviewOpen] = useState(false);
  const dialogRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previewOpenerRef = useRef(null);
  const selected = DESIGNS.find(({ id }) => id === selectedId) || DESIGNS[0];

  useEffect(() => {
    if (!fullPreviewOpen) return undefined;
    const dialog = dialogRef.current;
    if (!dialog) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    }
    window.requestAnimationFrame(() => closeButtonRef.current?.focus());

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [fullPreviewOpen]);

  const openFullPreview = (event) => {
    previewOpenerRef.current = event.currentTarget;
    setFullPreviewOpen(true);
  };

  const restorePreviewFocus = () => {
    window.requestAnimationFrame(() => previewOpenerRef.current?.focus({ preventScroll: true }));
  };

  const closeFullPreview = () => {
    const dialog = dialogRef.current;
    setFullPreviewOpen(false);
    if (dialog?.open && typeof dialog.close === "function") dialog.close();
    else dialog?.removeAttribute("open");
    restorePreviewFocus();
  };

  const handleDialogClose = () => {
    setFullPreviewOpen(false);
    restorePreviewFocus();
  };

  if (!selected) return null;

  return (
    <section id="resume-templates" className="landing-section landing-section--templates" aria-labelledby="templates-title">
      <div className="landing-section-heading landing-section-heading--split">
        <div>
          <p className="landing-eyebrow"><LayoutTemplate size={16} aria-hidden="true" /> Seven résumé styles</p>
          <h2 id="templates-title">Choose the look. Keep the evidence strategy intact.</h2>
        </div>
        <div>
          <p>
            Gigscapes first recommends a content approach from verified evidence—then lets you choose a genuinely different visual style.
          </p>
          <p className="landing-template-strategy-note"><ShieldCheck size={16} aria-hidden="true" /> Style changes never rewrite facts, change requirement coverage, or bypass export readiness.</p>
        </div>
      </div>

      <div className="landing-template-layout">
        <ul className="landing-template-grid" aria-label="Available visual résumé styles">
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

        <div className="landing-template-preview" role="region" aria-live="polite" aria-label={`${selected.displayName} style example`}>
          <div className="landing-template-preview-topline">
            <span>Résumé style preview</span>
            <span>Searchable · selectable · single column</span>
          </div>
          <div className="landing-template-preview-document">
            <ResumeDesignSample design={selected} />
          </div>
          <p className="landing-template-sample-label">Generic sample résumé — your information appears after tailoring.</p>
          <button type="button" className="landing-template-full-preview-button" onClick={openFullPreview}>
            <Expand size={16} aria-hidden="true" /> View full-size sample
          </button>
          <div className="landing-template-preview-name">{selected.displayName}</div>
          <div className="landing-template-preview-role">{selected.tone} presentation</div>
          <p>{selected.description}</p>
          <dl className="landing-template-preview-facts">
            <div><dt>Best for</dt><dd>{selected.intendedUse}</dd></div>
            <div><dt>Content</dt><dd>Unchanged when you switch styles</dd></div>
            <div><dt>Exports</dt><dd>Browser preview, DOCX, and PDF share the same presentation tokens</dd></div>
          </dl>
          <p className="landing-template-preview-note">
            {selected.atsSafetyLevel === "high"
              ? "Application-safe: restrained presentation for online portals and direct applications."
              : "Networking-forward: a more expressive look for direct outreach while preserving ATS-readable text."}
            {" "}The gallery makes no AI or network request.
          </p>
        </div>
      </div>

      <dialog
        ref={dialogRef}
        className="landing-template-dialog"
        aria-modal="true"
        aria-labelledby="template-dialog-title"
        aria-describedby="template-dialog-description"
        onClose={handleDialogClose}
        onCancel={(event) => { event.preventDefault(); closeFullPreview(); }}
        onClick={(event) => { if (event.target === dialogRef.current) closeFullPreview(); }}
      >
        <div className="landing-template-dialog-card">
          <header>
            <div>
              <span>Generic sample résumé</span>
              <h2 id="template-dialog-title">{selected.displayName} — full-size sample</h2>
              <p id="template-dialog-description">Your information replaces this synthetic sample only after you tailor a résumé.</p>
            </div>
            <button ref={closeButtonRef} type="button" onClick={closeFullPreview} aria-label="Close full-size résumé sample">
              <X aria-hidden="true" />
            </button>
          </header>
          <div className="landing-template-dialog-document">
            <ResumeDesignSample design={selected} size="full" />
          </div>
        </div>
      </dialog>
    </section>
  );
}
