import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { ShieldCheck, X } from "lucide-react";

const COPY = {
  resume_intake: {
    title: "Before Gigscapes reads these résumé images",
    body: "Gigscapes sends compressed copies of the résumé photos you selected through Gigscapes servers to a configured AI processing provider for transcription. The original images are not saved to your profile or synced; only text you review and explicitly save can become your base résumé.",
  },
  intake: {
    title: "Before Gigscapes reads this posting",
    body: "Gigscapes sends the posting text, public page contents, or compressed screenshots through Gigscapes servers to a configured AI processing provider so the job can be structured for your review. This input is not added to your Gigscapes profile.",
  },
  tailor: {
    title: "Before Gigscapes tailors your résumé",
    body: "Gigscapes sends the résumé you selected, the reviewed posting, and any evidence you confirmed through Gigscapes servers to a configured AI processing provider for this request. Your base résumé remains under the storage choice shown in your workspace, and Gigscapes never submits an application to an employer.",
  },
  cover_letter: {
    title: "Before Gigscapes writes your cover letter",
    body: "Gigscapes sends the résumé you selected, reviewed posting, confirmed evidence, application assessment, and—when regenerating—a minimized copy of the current draft through Gigscapes servers to a configured AI processing provider. The result stays target-specific and editable; it does not change your saved résumé or submit an application.",
  },
  evidence_coach: {
    title: "Before Gigscapes clarifies your evidence",
    body: "Gigscapes sends only this requirement, its follow-up question, and the factual sentences you entered for this answer through Gigscapes servers to a configured AI processing provider. It does not send your full résumé. The result is a proposal only: you can approve, edit, reject, or answer a follow-up before it can affect tailoring.",
  },
};

export function PrivateProcessingDialog({ scope, onCancel, onConfirm, returnFocusTarget }) {
  const dialogRef = useRef(null);
  const copy = COPY[scope] || COPY.tailor;

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => dialogRef.current?.querySelector("[data-initial-focus]")?.focus());
    function onKeyDown(event) {
      if (event.key === "Escape") onCancel();
      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll('button:not([disabled]), a[href]');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", onKeyDown);
      returnFocusTarget?.focus?.();
    };
  }, [onCancel, returnFocusTarget]);

  return (
    <div className="privacy-gate-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }}>
      <section ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="private-processing-title" aria-describedby="private-processing-copy" className="privacy-gate-dialog">
        <button type="button" onClick={onCancel} aria-label="Close privacy notice" className="privacy-gate-close"><X size={18} /></button>
        <ShieldCheck size={30} color="#13795B" aria-hidden="true" />
        <h2 id="private-processing-title">{copy.title}</h2>
        <p id="private-processing-copy">{copy.body}</p>
        <p className="privacy-gate-detail">The generated result remains editable. Current AI providers and their purposes are identified in the Privacy Notice. Gigscapes does not use résumé details for advertising, and optional product-quality signals exclude résumé text.</p>
        <Link to="/privacy" target="_blank" rel="noreferrer" className="privacy-gate-link">Read the full Privacy Notice</Link>
        <div className="privacy-gate-actions">
          <button type="button" onClick={onCancel} className="privacy-gate-secondary">Cancel</button>
          <button type="button" onClick={onConfirm} data-initial-focus className="privacy-gate-primary">Continue securely</button>
        </div>
      </section>
    </div>
  );
}
