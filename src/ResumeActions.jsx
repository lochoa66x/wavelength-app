import { useState } from "react";
import { Copy, Download, ExternalLink, Loader2 } from "lucide-react";

import { downloadResumeDocx } from "./resumeDocx.js";
import { resumeDataToPlainText } from "./resumeShared.jsx";
import { getResumeExportReadiness } from "./resumeReadiness.js";

export function ResumeActions({ resumeData, template, item, hasLink, atsReview, onEditResume, C, primaryBtnStyle }) {
  const [downloadState, setDownloadState] = useState("idle");
  const [message, setMessage] = useState("");
  const readiness = getResumeExportReadiness(resumeData, atsReview);

  const handleDownload = async () => {
    setDownloadState("loading");
    setMessage("");
    try {
      await downloadResumeDocx(resumeData, template);
      setDownloadState("done");
    } catch (error) {
      console.error("DOCX export failed:", error);
      setDownloadState("error");
      setMessage("The DOCX could not be created. Copy the tailored text instead.");
    }
  };

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
          onClick={handleDownload}
          disabled={downloadState === "loading" || !readiness.canExport}
          className="wl-btn"
          style={{ ...primaryBtnStyle(downloadState === "loading" || !readiness.canExport), fontSize: 13, padding: "9px 16px" }}
        >
          {downloadState === "loading" ? <Loader2 size={12} className="wl-spin" /> : <Download size={12} />}
          {readiness.buttonLabel}
        </button>
        <button
          type="button"
          onClick={() => navigator.clipboard?.writeText(resumeDataToPlainText(resumeData, template))}
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
      {message && <p role="alert" style={{ color: C.red, fontSize: 12.5, margin: "10px 0 0" }}>{message}</p>}
    </>
  );
}
