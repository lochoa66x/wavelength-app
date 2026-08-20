import { useState } from "react";
import { Copy, Download, ExternalLink, Loader2 } from "lucide-react";

import { downloadResumeDocx } from "./resumeDocx.js";
import { resumeDataToPlainText } from "./resumeShared.jsx";

export function ResumeActions({ resumeData, template, item, hasLink, C, primaryBtnStyle }) {
  const [downloadState, setDownloadState] = useState("idle");
  const [message, setMessage] = useState("");

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
      <p style={{ fontSize: 12, color: C.textFaint, margin: "0 0 12px" }}>
        Review every detail before applying — nothing is submitted automatically.
      </p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={handleDownload}
          disabled={downloadState === "loading"}
          className="wl-btn"
          style={{ ...primaryBtnStyle(downloadState === "loading"), fontSize: 13, padding: "9px 16px" }}
        >
          {downloadState === "loading" ? <Loader2 size={12} className="wl-spin" /> : <Download size={12} />}
          Download ATS-safe DOCX
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
