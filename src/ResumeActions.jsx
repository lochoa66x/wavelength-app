import { useState } from "react";
import { Copy, Download, ExternalLink, FileText, Loader2 } from "lucide-react";

import { resumeDataToPlainText } from "./resumeText.js";
import { createResumeExportContext, getResumeExportReadiness, validateResumeExportContext } from "./resumeReadiness.js";
import { classifyDocxExportError, docxExportErrorMessage } from "./resumeExportErrors.js";
import { useAuth } from "./auth.jsx";
import { QualityFeedback } from "./QualityFeedback.jsx";
import { emitResumeQualitySignal } from "./qualitySignals.js";

export function ResumeActions({ resumeData, resumePackage, renderPlan, template, previewRef, item, hasLink, atsReview, onEditResume, qualityRoute = "app", qualityPostingSource = "not_applicable", C, primaryBtnStyle }) {
  const { requestAccountAction } = useAuth();
  const [docxState, setDocxState] = useState("idle");
  const [pdfState, setPdfState] = useState("idle");
  const [message, setMessage] = useState(null);
  const [feedbackFormat, setFeedbackFormat] = useState("");
  const canonicalInput = resumePackage || resumeData;
  const readiness = getResumeExportReadiness(canonicalInput, atsReview);
  const exportBusy = docxState === "loading" || pdfState === "loading";
  const freshExportContext = () => validateResumeExportContext(createResumeExportContext(canonicalInput, atsReview, { item, templateId: template }));
  const signalInput = (extra = {}) => ({
    resumeData,
    resumePackage,
    item,
    atsReview,
    route: qualityRoute,
    postingSource: qualityPostingSource,
    ...extra,
  });

  const downloadDocx = async () => {
    const startedAt = Date.now();
    setDocxState("loading");
    setMessage(null);
    setFeedbackFormat("");
    void emitResumeQualitySignal("export_attempted", signalInput({ exportFormat: "docx" }));
    try {
      const { downloadResumeDocx } = await import("./resumeDocx.js");
      await downloadResumeDocx(freshExportContext());
      setDocxState("done");
      setFeedbackFormat("docx");
      void emitResumeQualitySignal("export_completed", signalInput({ exportFormat: "docx", outcome: "completed", durationMs: Date.now() - startedAt }));
    } catch (error) {
      console.error("DOCX export failed:", error);
      setDocxState("error");
      setMessage({ type: "error", text: docxExportErrorMessage(error) });
      void emitResumeQualitySignal("export_failed", signalInput({ exportFormat: "docx", outcome: "failed", errorCategory: classifyDocxExportError(error), durationMs: Date.now() - startedAt }));
    }
  };

  const handleDocxDownload = () => requestAccountAction("download_docx", {
    continuation: downloadDocx,
  });

  const downloadPdf = async () => {
    const startedAt = Date.now();
    setPdfState("loading");
    setMessage(null);
    setFeedbackFormat("");
    void emitResumeQualitySignal("export_attempted", signalInput({ exportFormat: "pdf" }));
    let pdfExports;
    try {
      pdfExports = await import("./resumePdf.js");
      await pdfExports.downloadResumePdf(freshExportContext());
      setPdfState("done");
      setFeedbackFormat("pdf");
      setMessage({ type: "info", text: "The ATS-readable PDF was downloaded. Its text remains selectable and searchable." });
      void emitResumeQualitySignal("export_completed", signalInput({ exportFormat: "pdf", outcome: "completed", durationMs: Date.now() - startedAt }));
    } catch (error) {
      console.warn("Direct PDF export failed; opening the browser print fallback:", error);
      try {
        const context = freshExportContext();
        const title = [context.renderPlan.header.fullName, context.renderPlan.header.headline].filter(Boolean).join(" - ");
        pdfExports ||= await import("./resumePdf.js");
        await pdfExports.printResumePdf(previewRef?.current, title || "Tailored resume");
        setPdfState("done");
        setFeedbackFormat("pdf");
        setMessage({ type: "info", text: "The direct download was unavailable. In the browser print dialog, choose “Save as PDF”." });
        void emitResumeQualitySignal("export_completed", signalInput({ exportFormat: "pdf", outcome: "completed_with_fallback", durationMs: Date.now() - startedAt }));
      } catch (fallbackError) {
        console.error("PDF export failed:", fallbackError);
        setPdfState("error");
        setMessage({ type: "error", text: "The PDF could not be created. Download the DOCX or copy the tailored text instead." });
        void emitResumeQualitySignal("export_failed", signalInput({ exportFormat: "pdf", outcome: "failed", errorCategory: "unknown", durationMs: Date.now() - startedAt }));
      }
    }
  };

  const handlePdfDownload = () => requestAccountAction("download_pdf", {
    continuation: downloadPdf,
  });

  const handleCopy = () => requestAccountAction("copy_tailored_text", {
    continuation: async () => {
      const startedAt = Date.now();
      setFeedbackFormat("");
      void emitResumeQualitySignal("export_attempted", signalInput({ exportFormat: "text" }));
      try {
        const context = freshExportContext();
        await navigator.clipboard?.writeText(resumeDataToPlainText(context));
        setMessage({ type: "info", text: "The tailored résumé text was copied." });
        setFeedbackFormat("text");
        void emitResumeQualitySignal("export_completed", signalInput({ exportFormat: "text", outcome: "completed", durationMs: Date.now() - startedAt }));
      } catch {
        setMessage({ type: "error", text: "The text could not be copied. Try the DOCX download instead." });
        void emitResumeQualitySignal("export_failed", signalInput({ exportFormat: "text", outcome: "failed", errorCategory: "browser_download", durationMs: Date.now() - startedAt }));
      }
    },
  });

  return (
    <>
      <p role={readiness.missingIdentity ? "alert" : undefined} style={{ fontSize: 12, color: readiness.missingIdentity ? C.red : C.textFaint, margin: "0 0 12px", lineHeight: 1.5 }}>
        {readiness.missingIdentity
          ? "Add your real name to the saved résumé before exporting. Gigscapes will never insert an identity placeholder."
          : "Review every detail before applying — nothing is submitted automatically."}
        {readiness.missingIdentity && onEditResume ? (
          <> <button type="button" onClick={onEditResume} className="wl-btn" style={{ border: 0, padding: 0, background: "transparent", color: C.red, font: "inherit", fontWeight: 700, textDecoration: "underline", cursor: "pointer" }}>Edit saved résumé</button></>
        ) : null}
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={handleDocxDownload}
          disabled={exportBusy || !readiness.canExport}
          className="wl-btn"
          style={{ ...primaryBtnStyle(exportBusy || !readiness.canExport), fontSize: 13, padding: "9px 16px" }}
        >
          {docxState === "loading" ? <Loader2 size={12} className="wl-spin" /> : <Download size={12} />}
          {readiness.docxButtonLabel}
        </button>
        <button
          type="button"
          onClick={handlePdfDownload}
          disabled={exportBusy || !readiness.canExport}
          className="wl-btn"
          style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 600, padding: "9px 16px", borderRadius: 980, border: `1px solid ${C.border}`, background: C.bgCard, color: C.text, cursor: exportBusy || !readiness.canExport ? "not-allowed" : "pointer", opacity: exportBusy || !readiness.canExport ? 0.5 : 1 }}
        >
          {pdfState === "loading" ? <Loader2 size={12} className="wl-spin" /> : <FileText size={12} />}
          {readiness.pdfButtonLabel}
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="wl-btn"
          style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 500, padding: "9px 16px", borderRadius: 980, border: `1px solid ${C.border}`, background: C.bgCard, color: C.text, cursor: "pointer" }}
        >
          <Copy size={12} /> Copy tailored text
        </button>
        {hasLink && (
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="wl-btn"
            style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 500, padding: "9px 16px", borderRadius: 980, border: `1px solid ${C.border}`, color: C.text, textDecoration: "none" }}
          >
            Open original posting <ExternalLink size={12} />
          </a>
        )}
      </div>
      {message && <p role={message.type === "error" ? "alert" : "status"} style={{ color: message.type === "error" ? C.red : C.textSub, fontSize: 12.5, margin: "10px 0 0" }}>{message.text}</p>}
      {feedbackFormat ? (
        <QualityFeedback
          kind="export"
          C={C}
          onSubmit={({ feedback, feedbackReason }) => emitResumeQualitySignal("suggestion_feedback_submitted", signalInput({
            exportFormat: feedbackFormat,
            outcome: "completed",
            feedback,
            feedbackReason,
          }))}
        />
      ) : null}
    </>
  );
}
