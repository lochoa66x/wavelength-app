import { useRef, useState } from "react";
import { Camera, FileText, Loader2, Upload } from "lucide-react";

import { extractResumeImages } from "./tailorClient.js";
import {
  RESUME_IMPORT_MAX_IMAGES,
  compressResumeImage,
  extractDocxResume,
  extractPdfResume,
  resumeImportStatusCopy,
  validateResumeImportFile,
} from "./resumeIntake.js";
import { resumeIntakeEvent } from "./resumeIntakeTelemetry.js";

const TAB_OPTIONS = [
  { id: "paste", label: "Paste text", icon: FileText },
  { id: "file", label: "DOCX or PDF", icon: Upload },
  { id: "photo", label: "Photos / scans", icon: Camera },
];

export function ResumeIntakePanel({ value, savedValue, onChange, requestPrivateProcessing, C, fontFamily }) {
  const [tab, setTab] = useState("paste");
  const [status, setStatus] = useState({ source: value ? "paste" : "", message: "", warnings: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef(null);
  const photoRef = useRef(null);

  const transcribePages = async (images) => {
    const parts = [];
    const warnings = [];
    for (let index = 0; index < images.length; index += 3) {
      const result = await extractResumeImages(images.slice(index, index + 3));
      parts.push(result.text);
      warnings.push(...result.warnings);
    }
    return { text: parts.join("\n\n"), warnings: warnings.slice(0, 5) };
  };

  const applyResult = (result) => {
    onChange(result.text);
    setTab("paste");
    setStatus({ source: result.source, message: "", warnings: result.warnings || [] });
    setError("");
    resumeIntakeEvent(result.source === "photo_ocr" ? "photo" : result.source, "review_ready");
  };

  const importDocument = async (file) => {
    const validation = validateResumeImportFile(file);
    if (!validation.ok || !["docx", "pdf"].includes(validation.kind)) {
      setError(validation.error || "Choose a DOCX or PDF résumé.");
      return;
    }
    setBusy(true);
    setError("");
    resumeIntakeEvent(validation.kind, "started");
    try {
      const result = validation.kind === "docx" ? await extractDocxResume(file) : await extractPdfResume(file);
      if (result.needsOcr) {
        setStatus({ source: "", message: "", warnings: result.warnings });
        const continued = await requestPrivateProcessing("resume_intake", async () => {
          const ocr = await transcribePages(result.ocrImages);
          applyResult({ ...ocr, source: "pdf" });
        });
        if (!continued) setError("Scanned-PDF reading was canceled. Your saved résumé was not changed.");
      } else applyResult(result);
    } catch (cause) {
      resumeIntakeEvent(validation.kind, "failed");
      setError(cause?.message || "That résumé could not be read.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const importPhotos = async (files) => {
    const selected = Array.from(files || []).slice(0, RESUME_IMPORT_MAX_IMAGES);
    if (!selected.length) return;
    const invalid = selected.map(validateResumeImportFile).find((item) => !item.ok || item.kind !== "photo");
    if (invalid) {
      setError(invalid.error || "Use JPG, PNG, or WebP résumé images.");
      return;
    }
    await requestPrivateProcessing("resume_intake", async () => {
      setBusy(true);
      setError("");
      resumeIntakeEvent("photo", "started");
      try {
        const images = [];
        for (const file of selected) images.push(await compressResumeImage(file));
        const result = await transcribePages(images);
        applyResult({ ...result, source: "photo_ocr" });
      } catch (cause) {
        resumeIntakeEvent("photo", "failed");
        setError(cause?.message || "Those résumé images could not be read.");
      } finally {
        setBusy(false);
        if (photoRef.current) photoRef.current.value = "";
      }
    });
  };

  return (
    <section aria-label="Résumé intake" style={{ marginBottom: 16 }}>
      <div className="resume-intake-tabs" role="tablist" aria-label="Choose how to add your résumé">
        {TAB_OPTIONS.map(({ id, label, icon: Icon }) => (
          <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => { setTab(id); setError(""); }} className="wl-btn resume-intake-tab" data-active={tab === id}>
            <Icon size={16} /> {label}
          </button>
        ))}
      </div>

      {tab === "paste" ? (
        <textarea
          value={value}
          onChange={(event) => { onChange(event.target.value); setStatus({ source: "paste", message: "", warnings: [] }); }}
          placeholder="Paste your résumé text here (experience, skills, certifications, projects)…"
          rows={18}
          aria-label="Résumé text to review"
          style={{ width: "100%", background: C.bgCard, border: `1.5px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", color: C.text, fontSize: 14, fontFamily, resize: "vertical", boxShadow: "0 1px 2px rgba(0,0,0,0.03)" }}
        />
      ) : (
        <div className="resume-intake-dropzone">
          <strong>{tab === "file" ? "Import an editable DOCX or text-based PDF" : "Photograph every résumé page in order"}</strong>
          <span>{tab === "file" ? "Parsed on this device. The original file is not saved or synced." : `Up to ${RESUME_IMPORT_MAX_IMAGES} JPG, PNG, or WebP pages. OCR starts only after the privacy notice.`}</span>
          <input
            ref={tab === "file" ? fileRef : photoRef}
            type="file"
            accept={tab === "file" ? ".docx,.pdf,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" : "image/jpeg,image/png,image/webp"}
            multiple={tab === "photo"}
            capture={tab === "photo" ? "environment" : undefined}
            onChange={(event) => tab === "file" ? importDocument(event.target.files?.[0]) : importPhotos(event.target.files)}
            disabled={busy}
          />
          {busy ? <span role="status" className="resume-intake-busy"><Loader2 size={15} className="wl-spin" /> Reading résumé…</span> : null}
        </div>
      )}

      <p className="resume-intake-status" role="status">{resumeImportStatusCopy({ source: status.source, savedValue, draftValue: value })}</p>
      {status.warnings.map((warning) => <p key={warning} className="resume-intake-warning">{warning}</p>)}
      {error ? <p role="alert" className="resume-intake-error">{error}</p> : null}
    </section>
  );
}
