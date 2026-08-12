// src/components/ResumeExport.jsx
// Drop-in export panel for a structured tailored résumé.
// Shows an on-screen preview and lets the user download PDF or Word.
//
// Integration (in App.jsx, wherever the tailored result comes back):
//   import ResumeExport from "./components/ResumeExport";
//   ...
//   {tailoredResume && <ResumeExport resume={tailoredResume} gig={selectedGig} />}
//
// `resume` must match the shape returned by /api/tailor (see api/tailor.js).
// `gig` is optional and only used for a small context label.

import React, { useState } from "react";
import { pdf } from "@react-pdf/renderer";
import ResumePDF from "./ResumePDF";
import { buildResumeDocx, resumeFilename } from "../lib/resumeDocx";

const ACCENT = "#1F7A6D";

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Give the browser a tick to start the download before revoking.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function ResumeExport({ resume, gig }) {
  const [busy, setBusy] = useState(null); // "pdf" | "docx" | null
  const [error, setError] = useState(null);

  if (!resume || !resume.profile) return null;

  const { profile, experience = [], skills = [], education = [], languages = [] } =
    resume;

  async function handlePdf() {
    setError(null);
    setBusy("pdf");
    try {
      const blob = await pdf(<ResumePDF resume={resume} />).toBlob();
      downloadBlob(blob, resumeFilename(resume, "pdf"));
    } catch (e) {
      console.error("PDF export failed:", e);
      setError("Couldn't build the PDF. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function handleDocx() {
    setError(null);
    setBusy("docx");
    try {
      const blob = await buildResumeDocx(resume);
      downloadBlob(blob, resumeFilename(resume, "docx"));
    } catch (e) {
      console.error("Word export failed:", e);
      setError("Couldn't build the Word file. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div style={styles.wrap}>
      <div style={styles.bar}>
        <div style={styles.barLabel}>
          Tailored résumé
          {gig?.title ? (
            <span style={styles.gigTag}> · for {gig.title}</span>
          ) : null}
        </div>
        <div style={styles.buttons}>
          <button
            onClick={handlePdf}
            disabled={busy !== null}
            style={{ ...styles.btn, ...styles.btnPrimary, ...(busy ? styles.btnDisabled : {}) }}
          >
            {busy === "pdf" ? "Building…" : "Download PDF"}
          </button>
          <button
            onClick={handleDocx}
            disabled={busy !== null}
            style={{ ...styles.btn, ...styles.btnGhost, ...(busy ? styles.btnDisabled : {}) }}
          >
            {busy === "docx" ? "Building…" : "Download Word"}
          </button>
        </div>
      </div>

      {error ? <div style={styles.error}>{error}</div> : null}

      {/* On-screen preview — mirrors the exported document */}
      <div style={styles.sheet}>
        <div style={styles.name}>{profile.name || "Your Name"}</div>
        {profile.title ? <div style={styles.title}>{profile.title}</div> : null}
        {[profile.location, profile.email, profile.phone].filter(Boolean).length ? (
          <div style={styles.contact}>
            {[profile.location, profile.email, profile.phone].filter(Boolean).join("   •   ")}
          </div>
        ) : null}

        {profile.summary ? (
          <Section title="Summary">
            <p style={styles.p}>{profile.summary}</p>
          </Section>
        ) : null}

        {experience.length ? (
          <Section title="Experience">
            {experience.map((job, i) => (
              <div key={i} style={styles.job}>
                <div style={styles.jobHead}>
                  <span style={styles.jobRole}>
                    {job.role}
                    {job.company ? `  —  ${job.company}` : ""}
                  </span>
                  {job.dates ? <span style={styles.jobDates}>{job.dates}</span> : null}
                </div>
                <ul style={styles.ul}>
                  {(job.bullets || []).map((b, j) => (
                    <li key={j} style={styles.li}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </Section>
        ) : null}

        {skills.length ? (
          <Section title="Skills">
            <p style={styles.p}>{skills.join("   •   ")}</p>
          </Section>
        ) : null}

        {education.length ? (
          <Section title="Education">
            {education.map((ed, i) => (
              <div key={i} style={styles.edu}>
                <strong>{ed.degree}</strong>
                {ed.institution ? `  —  ${ed.institution}` : ""}
                {ed.dates ? `  (${ed.dates})` : ""}
              </div>
            ))}
          </Section>
        ) : null}

        {languages.length ? (
          <Section title="Languages">
            <p style={styles.p}>{languages.join("   •   ")}</p>
          </Section>
        ) : null}
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div style={styles.sectionHeading}>{title}</div>
      {children}
    </div>
  );
}

const styles = {
  wrap: { marginTop: 16 },
  bar: {
    display: "flex",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 14px",
    borderRadius: 14,
    background: "rgba(255,255,255,0.6)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    border: "1px solid rgba(0,0,0,0.06)",
    position: "sticky",
    top: 8,
    zIndex: 2,
  },
  barLabel: { fontWeight: 600, fontSize: 14, color: "#1a1a1a" },
  gigTag: { fontWeight: 400, color: "#6b7280" },
  buttons: { display: "flex", gap: 8 },
  btn: {
    fontSize: 14,
    fontWeight: 600,
    padding: "8px 14px",
    borderRadius: 10,
    cursor: "pointer",
    border: "1px solid transparent",
    transition: "opacity .15s ease",
  },
  btnPrimary: { background: ACCENT, color: "#fff" },
  btnGhost: { background: "transparent", color: ACCENT, borderColor: ACCENT },
  btnDisabled: { opacity: 0.55, cursor: "default" },
  error: {
    marginTop: 10,
    padding: "8px 12px",
    borderRadius: 10,
    background: "#fdecec",
    color: "#a12626",
    fontSize: 13,
  },
  sheet: {
    marginTop: 14,
    background: "#fff",
    borderRadius: 14,
    border: "1px solid rgba(0,0,0,0.08)",
    padding: "28px 32px",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    color: "#1a1a1a",
    fontSize: 14,
    lineHeight: 1.45,
  },
  name: { fontSize: 26, fontWeight: 700 },
  title: { fontSize: 15, color: ACCENT, marginTop: 2 },
  contact: { fontSize: 12.5, color: "#555", marginTop: 6 },
  sectionHeading: {
    fontSize: 12,
    fontWeight: 700,
    color: ACCENT,
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 18,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottom: `1px solid ${ACCENT}`,
  },
  p: { margin: 0 },
  job: { marginBottom: 10 },
  jobHead: { display: "flex", justifyContent: "space-between", gap: 12 },
  jobRole: { fontWeight: 700 },
  jobDates: { fontSize: 12.5, color: "#555", fontStyle: "italic", whiteSpace: "nowrap" },
  ul: { margin: "4px 0 0", paddingLeft: 18 },
  li: { marginBottom: 2 },
  edu: { marginBottom: 4 },
};
