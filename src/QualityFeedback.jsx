import { useState } from "react";

import { useQualitySignalConsent } from "./QualitySignalSettings.jsx";

const FIT_REASONS = Object.freeze([
  ["positioning_unclear", "Positioning was unclear"],
  ["missing_relevant_evidence", "Relevant evidence seemed missing"],
  ["too_generic", "It felt too generic"],
]);

const EXPORT_REASONS = Object.freeze([
  ["document_did_not_open", "The file did not open"],
  ["formatting_issue", "Formatting looked wrong"],
  ["missing_content", "Content seemed missing"],
]);

export function QualityFeedback({ kind = "fit", onSubmit, C }) {
  const [consentEnabled] = useQualitySignalConsent();
  const [choice, setChoice] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  if (!consentEnabled) return null;

  const isFit = kind === "fit";
  const reasons = isFit ? FIT_REASONS : EXPORT_REASONS;
  const positiveValue = isFit ? "helpful" : "opened";
  const negativeValue = isFit ? "not_helpful" : "did_not_open";
  const positiveReason = isFit ? "positioning_accurate" : "document_opened";

  const submit = async (feedback, feedbackReason) => {
    if (pending || submitted) return;
    setPending(true);
    setError("");
    const result = await onSubmit?.({ feedback, feedbackReason });
    setPending(false);
    if (result?.status === "accepted") setSubmitted(true);
    else setError("That answer was not sent. Your résumé and export are unaffected.");
  };

  if (submitted) {
    return <p role="status" style={{ margin: "10px 0 0", color: C.textSub, fontSize: 12.5 }}>Thanks—only that structured answer was shared.</p>;
  }

  return (
    <fieldset style={{ margin: "12px 0 0", padding: "12px", border: `1px solid ${C.border}`, borderRadius: 12 }} disabled={pending}>
      <legend style={{ padding: "0 5px", color: C.text, fontSize: 12.5, fontWeight: 700 }}>
        {isFit ? "Was this positioning helpful?" : "Did the exported document open correctly?"}
      </legend>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        <button type="button" className="wl-btn" onClick={() => submit(positiveValue, positiveReason)} style={{ padding: "7px 11px", border: `1px solid ${C.border}`, borderRadius: 999, background: C.bgCard, color: C.text, font: "inherit", fontSize: 12, cursor: "pointer" }}>Yes</button>
        <button type="button" className="wl-btn" aria-expanded={choice === negativeValue} onClick={() => setChoice(negativeValue)} style={{ padding: "7px 11px", border: `1px solid ${C.border}`, borderRadius: 999, background: C.bgCard, color: C.text, font: "inherit", fontSize: 12, cursor: "pointer" }}>{isFit ? "Not really" : "No"}</button>
      </div>
      {choice === negativeValue ? (
        <div style={{ display: "grid", gap: 7, marginTop: 10 }}>
          <span style={{ color: C.textSub, fontSize: 11.5 }}>Choose one reason—there is no free-text box.</span>
          {reasons.map(([value, label]) => (
            <button key={value} type="button" className="wl-btn" onClick={() => submit(negativeValue, value)} style={{ width: "fit-content", padding: 0, border: 0, background: "transparent", color: C.textSub, font: "inherit", fontSize: 12, textDecoration: "underline", cursor: "pointer" }}>{label}</button>
          ))}
        </div>
      ) : null}
      {error ? <p role="alert" style={{ margin: "9px 0 0", color: C.red, fontSize: 11.5 }}>{error}</p> : null}
    </fieldset>
  );
}
