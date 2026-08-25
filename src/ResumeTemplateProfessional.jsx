import { useRef } from "react";

import { ResumeActions } from "./ResumeActions.jsx";
import { DOC, SERIF, SANS, SectionHeader } from "./resumeShared.jsx";

export function ResumeTemplateProfessional({ resumeData, item, hasLink, atsReview, onEditResume, C, primaryBtnStyle }) {
  const r = resumeData;
  const previewRef = useRef(null);

  return (
    <div>
      <div ref={previewRef} data-resume-preview="professional" style={{
        background: DOC.paper,
        borderRadius: 6,
        padding: "36px 40px 32px",
        margin: "0 0 12px",
        boxShadow: "0 1px 2px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.08)",
        fontFamily: SERIF,
        color: DOC.ink,
        lineHeight: 1.55,
      }}>
        <div style={{ textAlign: "center", marginBottom: 6 }}>
          {r.name && (
            <div style={{
              fontFamily: SERIF,
              fontSize: 26,
              fontWeight: 700,
              letterSpacing: 1,
              color: DOC.ink,
              lineHeight: 1.15,
              marginBottom: 4,
            }}>
              {r.name}
            </div>
          )}
          {r.title && (
            <div style={{
              fontFamily: SANS,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: DOC.accent,
              marginBottom: 8,
            }}>
              {r.title}
            </div>
          )}
          {r.contact && (
            <div style={{
              fontFamily: SANS,
              fontSize: 12,
              color: DOC.inkSoft,
              marginBottom: 2,
            }}>
              {r.contact}
            </div>
          )}
        </div>

        <div style={{ height: 2, background: DOC.ink, margin: "12px 0 0" }} />

        {r.profile && (
          <>
            <SectionHeader>Professional Summary</SectionHeader>
            <p style={{
              fontFamily: SERIF,
              fontSize: 13.5,
              lineHeight: 1.6,
              color: DOC.ink,
              margin: 0,
            }}>
              {r.profile}
            </p>
          </>
        )}

        {/* Skills MOVED above Experience — 2025-2026 skills-first ATS parsing */}
        {r.skills?.length > 0 && (
          <>
            <SectionHeader>Skills</SectionHeader>
            <p style={{
              fontFamily: SERIF,
              fontSize: 13,
              lineHeight: 1.6,
              color: DOC.ink,
              margin: 0,
            }}>
              {r.skills.join("  \u00b7  ")}
            </p>
          </>
        )}

        {r.projects?.length > 0 && (
          <>
            <SectionHeader>Projects</SectionHeader>
            {r.projects.map((project, index) => (
              <div key={`${project.name}-${index}`} style={{ marginBottom: 10 }}>
                <strong style={{ fontFamily: SERIF, fontSize: 14 }}>{project.name}</strong>
                {project.description && <p style={{ fontFamily: SERIF, fontSize: 13, lineHeight: 1.5, margin: "3px 0" }}>{project.description}</p>}
                {project.bullets?.length > 0 && <ul style={{ margin: "4px 0 0", paddingLeft: 20 }}>{project.bullets.map((bullet, bulletIndex) => <li key={bulletIndex} style={{ fontFamily: SERIF, fontSize: 13, lineHeight: 1.5, marginBottom: 3 }}>{bullet}</li>)}</ul>}
              </div>
            ))}
          </>
        )}

        {r.training?.length > 0 && (
          <>
            <SectionHeader>Professional Training</SectionHeader>
            {r.training.map((training, index) => (
              <div key={`${training.name}-${index}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 4, fontFamily: SERIF, fontSize: 13 }}>
                <span><strong>{training.name}</strong>{training.provider ? ` — ${training.provider}` : ""}</span>
                {training.dates && <span style={{ fontFamily: SANS, fontSize: 11, color: DOC.inkFaint, whiteSpace: "nowrap" }}>{training.dates}</span>}
              </div>
            ))}
          </>
        )}

        {r.experience?.length > 0 && (
          <>
            <SectionHeader>Professional Experience</SectionHeader>
            {r.experience.map((exp, ei) => (
              <div key={ei} style={{ marginBottom: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 2 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      fontFamily: SERIF,
                      fontSize: 14,
                      fontWeight: 700,
                      color: DOC.ink,
                    }}>
                      {exp.role}
                    </span>
                    {exp.company && (
                      <span style={{
                        fontFamily: SERIF,
                        fontSize: 14,
                        color: DOC.inkSoft,
                        fontStyle: "italic",
                      }}>
                        {" \u2014 "}{exp.company}
                      </span>
                    )}
                  </div>
                  {exp.dates && (
                    <div style={{
                      fontFamily: SANS,
                      fontSize: 11,
                      color: DOC.inkFaint,
                      whiteSpace: "nowrap",
                      fontVariantNumeric: "tabular-nums",
                    }}>
                      {exp.dates}
                    </div>
                  )}
                </div>
                {exp.bullets?.length > 0 && (
                  <ul style={{
                    margin: "5px 0 0",
                    paddingLeft: 18,
                    listStyle: "none",
                  }}>
                    {exp.bullets.map((b, bi) => (
                      <li key={bi} style={{
                        fontFamily: SERIF,
                        fontSize: 13,
                        lineHeight: 1.5,
                        color: DOC.ink,
                        marginBottom: 3,
                        position: "relative",
                        paddingLeft: 2,
                      }}>
                        <span style={{
                          position: "absolute",
                          left: -14,
                          top: 0,
                          color: DOC.bulletDot,
                          fontWeight: 700,
                        }}>{"\u2022"}</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </>
        )}

        {r.education?.length > 0 && (
          <>
            <SectionHeader>Education</SectionHeader>
            {r.education.map((e, i) => (
              <div key={i} style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 12,
                marginBottom: 4,
                fontFamily: SERIF,
                fontSize: 13,
                color: DOC.ink,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {e.degree && <span style={{ fontWeight: 700 }}>{e.degree}</span>}
                  {e.institution && (
                    <span style={{ color: DOC.inkSoft, fontStyle: "italic" }}>
                      {e.degree ? " \u2014 " : ""}{e.institution}
                    </span>
                  )}
                </div>
                {e.dates && (
                  <div style={{
                    fontFamily: SANS,
                    fontSize: 11,
                    color: DOC.inkFaint,
                    whiteSpace: "nowrap",
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {e.dates}
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {r.languages?.length > 0 && (
          <>
            <SectionHeader>Languages</SectionHeader>
            <p style={{
              fontFamily: SERIF,
              fontSize: 13,
              color: DOC.ink,
              margin: 0,
            }}>
              {r.languages.join(", ")}
            </p>
          </>
        )}
      </div>

      <ResumeActions resumeData={resumeData} template="professional" previewRef={previewRef} item={item} hasLink={hasLink} atsReview={atsReview} onEditResume={onEditResume} C={C} primaryBtnStyle={primaryBtnStyle} />
    </div>
  );
}
