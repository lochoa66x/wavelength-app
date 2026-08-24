import { useState } from "react";
import { Copy, Download, ExternalLink, FileText, Loader2 } from "lucide-react";

import { resumeDataToPlainText } from "./resumeShared.jsx";
import { getResumeExportReadiness } from "./resumeReadiness.js";
import { useAuth } from "./auth.jsx";

export function ResumeActions({ resumeData, template, previewRef, item, hasLink, atsReview, onEditResume, C, primaryBtnStyle }) {
  const { requestAccountAction } = useAuth();
  const [docxState, setDocxState] = useState("idle");
  const [pdfState, setPdfState] = useState("idle");
  const [message, setMessage] = useState(null);
  const readiness = getResumeExportReadiness(resumeData, atsReview);
  const exportBusy = docxState === "loading" || pdfState === "loading";

  const downloadDocx = async () => {
    setDocxState("loading");
    setMessage(null);
    try {
      const { downloadResumeDocx } = await import("./resumeDocx.js");
      await downloadResumeDocx(resumeData, template, { preliminary: readiness.preliminary });
      setDocxState("done");
    } catch (error) {
      console.error("DOCX export failed:", error);
      setDocxState("error");
      setMessage({ type: "error", text: "The DOCX could not be created. Copy the tailored text instead." });
    }
  };

  const handleDocxDownload = () => requestAccountAction("download_docx", {
    continuation: downloadDocx,
  });

  const downloadPdf = async () => {
    setPdfState("loading");
    setMessage(null);
    let pdfExports;
    try {
      pdfExports = await import("./resumePdf.js");
      await pdfExports.downloadResumePdf(resumeData, template, { preliminary: readiness.preliminary });
      setPdfState("done");
      setMessage({ type: "info", text: "The ATS-readable PDF was downloaded. Its text remains selectable and searchable." });
    } catch (error) {
      console.warn("Direct PDF export failed; opening the browser print fallback:", error);
      try {
        const title = [resumeData?.name, resumeData?.title].filter((value) => typeof value === "string" && value.trim()).join(" - ");
        pdfExports ||= await import("./resumePdf.js");
        await pdfExports.printResumePdf(previewRef?.current, title || "Tailored resume");
        setPdfState("done");
        setMessage({ type: "info", text: "The direct download was unavailable. In the browser print dialog, choose “Save as PDF”." });
      } catch (fallbackError) {
        console.error("PDF export failed:", fallbackError);
        setPdfState("error");
        setMessage({ type: "error", text: "The PDF could not be created. Download the DOCX or copy the tailored text instead." });
      }
    }
  };

  const handlePdfDownload = () => requestAccountAction("download_pdf", {
    continuation: downloadPdf,
  });

  const handleCopy = () => requestAccountAction("copy_tailored_text", {
    continuation: async () => {
      try {
        await navigator.clipboard?.writeText(resumeDataToPlainText(resumeData, template));
        setMessage({ type: "info", text: "The tailored résumé text was copied." });
      } catch {
        setMessage({ type: "error", text: "The text could not be copied. Try the DOCX download instead." });
      }
    },
  });

  return (
    <>
      <p role={readiness.missingIdentity ? "alert" : undefined} style={{ fontSize: 12, color: readiness.missingIdentity ? C.red : readiness.preliminary ? C.amber : C.textFaint, margin: "0 0 12px", lineHeight: 1.5 }}>
        {readiness.missingIdentity
          ? "Add your real name to the saved résumé before exporting. Gigscapes will never insert an identity placeholder."
          : readiness.preliminary
            ? "Preliminary draft — resolve the evidence or posting gaps above before treating it as application-ready."
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
    </>
  );
}
