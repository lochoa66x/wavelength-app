import { useRef } from "react";

import { ResumeActions } from "./ResumeActions.jsx";
import { DOC, SERIF, SANS, SectionHeader } from "./resumeShared.jsx";

function ExperienceSection({ experience }) {
  if (!experience?.length) return null;
  return (
    <>
      <SectionHeader>Professional Experience</SectionHeader>
      {experience.map((entry, index) => (
        <div key={`${entry.role}-${entry.company}-${index}`} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 2 }}>
            <div style={{ flex: 1, minWidth: 0, fontFamily: SERIF, fontSize: 14, color: DOC.ink }}>
              <strong>{entry.role}</strong>
              {entry.company && <span style={{ color: DOC.inkSoft, fontStyle: "italic" }}> — {entry.company}</span>}
            </div>
            {entry.dates && <span style={{ fontFamily: SANS, fontSize: 11, color: DOC.inkFaint, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>{entry.dates}</span>}
          </div>
          {entry.bullets?.length > 0 && (
            <ul style={{ margin: "5px 0 0", paddingLeft: 20 }}>
              {entry.bullets.map((bullet, bulletIndex) => (
                <li key={`${index}-${bulletIndex}`} style={{ fontFamily: SERIF, fontSize: 13, lineHeight: 1.5, color: DOC.ink, marginBottom: 3 }}>{bullet}</li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </>
  );
}

export function ResumeTemplateCareerChange({ resumeData, item, hasLink, atsReview, onEditResume, C, primaryBtnStyle }) {
  const resume = resumeData;
  const previewRef = useRef(null);
  return (
    <div>
      <div ref={previewRef} data-resume-preview="career-change" style={{ background: DOC.paper, borderRadius: 6, padding: "36px 40px 32px", margin: "0 0 12px", boxShadow: "0 1px 2px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.08)", fontFamily: SERIF, color: DOC.ink, lineHeight: 1.55 }}>
        <header style={{ textAlign: "center", marginBottom: 6 }}>
          {resume.name && <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 700, letterSpacing: 1, color: DOC.ink, lineHeight: 1.15, marginBottom: 4 }}>{resume.name}</div>}
          {resume.title && <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 650, letterSpacing: 1.5, textTransform: "uppercase", color: DOC.accent, marginBottom: 8 }}>{resume.title}</div>}
          {resume.contact && <div style={{ fontFamily: SANS, fontSize: 12, color: DOC.inkSoft }}>{resume.contact}</div>}
        </header>
        <div style={{ height: 2, background: DOC.ink, margin: "12px 0 0" }} />

        {resume.profile && (
          <>
            <SectionHeader>Career Transition Summary</SectionHeader>
            <p style={{ fontFamily: SERIF, fontSize: 13.5, lineHeight: 1.6, color: DOC.ink, margin: 0 }}>{resume.profile}</p>
          </>
        )}

        {resume.projects?.length > 0 && (
          <>
            <SectionHeader>Projects</SectionHeader>
            {resume.projects.map((project, index) => (
              <div key={`${project.name}-${index}`} style={{ marginBottom: 10 }}>
                <strong style={{ fontFamily: SERIF, fontSize: 14 }}>{project.name}</strong>
                {project.description && <p style={{ fontFamily: SERIF, fontSize: 13, lineHeight: 1.5, margin: "3px 0" }}>{project.description}</p>}
                {project.bullets?.length > 0 && <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>{project.bullets.map((bullet, bulletIndex) => <li key={bulletIndex} style={{ fontFamily: SERIF, fontSize: 13, lineHeight: 1.5, marginBottom: 3 }}>{bullet}</li>)}</ul>}
              </div>
            ))}
          </>
        )}

        {resume.training?.length > 0 && (
          <>
            <SectionHeader>Training & Certifications</SectionHeader>
            {resume.training.map((training, index) => (
              <div key={`${training.name}-${index}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 4, fontFamily: SERIF, fontSize: 13 }}>
                <span><strong>{training.name}</strong>{training.provider ? ` — ${training.provider}` : ""}</span>
                {training.dates && <span style={{ fontFamily: SANS, fontSize: 11, color: DOC.inkFaint, whiteSpace: "nowrap" }}>{training.dates}</span>}
              </div>
            ))}
          </>
        )}

        {resume.skills?.length > 0 && (
          <>
            <SectionHeader>Relevant Capabilities</SectionHeader>
            <p style={{ fontFamily: SERIF, fontSize: 13, lineHeight: 1.6, color: DOC.ink, margin: 0 }}>{resume.skills.join("  ·  ")}</p>
          </>
        )}

        <ExperienceSection experience={resume.experience} />

        {resume.education?.length > 0 && (
          <>
            <SectionHeader>Education</SectionHeader>
            {resume.education.map((education, index) => (
              <div key={`${education.degree}-${index}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 4, fontFamily: SERIF, fontSize: 13 }}>
                <span><strong>{education.degree}</strong>{education.institution ? ` — ${education.institution}` : ""}</span>
                {education.dates && <span style={{ fontFamily: SANS, fontSize: 11, color: DOC.inkFaint, whiteSpace: "nowrap" }}>{education.dates}</span>}
              </div>
            ))}
          </>
        )}

        {resume.languages?.length > 0 && (
          <>
            <SectionHeader>Languages</SectionHeader>
            <p style={{ fontFamily: SERIF, fontSize: 13, margin: 0 }}>{resume.languages.join(", ")}</p>
          </>
        )}
      </div>
      <ResumeActions resumeData={resumeData} template="career-change" previewRef={previewRef} item={item} hasLink={hasLink} atsReview={atsReview} onEditResume={onEditResume} C={C} primaryBtnStyle={primaryBtnStyle} />
    </div>
  );
}
