import { ResumeActions } from "./ResumeActions.jsx";
import { DOC, SERIF, SANS, SectionHeader } from "./resumeShared.jsx";

export function ResumeTemplateTrades({ resumeData, item, hasLink, C, primaryBtnStyle }) {
  const r = resumeData;

  return (
    <div>
      <div style={{
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
            <SectionHeader>Profile</SectionHeader>
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

        {/* Certifications & Licenses — the single most important section for
            trades hiring in Canada. Red Seal, journeyman certifications, master
            licenses go here. Rendered above Experience by design. */}
        {r.certifications?.length > 0 && (
          <>
            <SectionHeader>Certifications & Licenses</SectionHeader>
            {r.certifications.map((c, ci) => (
              <div key={ci} style={{
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
                  {c.name && <span style={{ fontWeight: 700 }}>{c.name}</span>}
                  {c.issuer && (
                    <span style={{ color: DOC.inkSoft, fontStyle: "italic" }}>
                      {c.name ? " \u2014 " : ""}{c.issuer}
                    </span>
                  )}
                </div>
                {c.year && (
                  <div style={{
                    fontFamily: SANS,
                    fontSize: 11,
                    color: DOC.inkFaint,
                    whiteSpace: "nowrap",
                    fontVariantNumeric: "tabular-nums",
                  }}>
                    {c.year}
                  </div>
                )}
              </div>
            ))}
          </>
        )}

        {/* Safety Training — surprising research finding: safety record is
            the first screen for trades employers, before technical capability.
            Only rendered if the AI populated safety_record or safety_certifications
            from the base résumé — never invented. */}
        {(r.safety_record || r.safety_certifications?.length > 0) && (
          <>
            <SectionHeader>Safety Training</SectionHeader>
            {r.safety_record && (
              <p style={{
                fontFamily: SERIF,
                fontSize: 13,
                lineHeight: 1.6,
                color: DOC.ink,
                margin: "0 0 6px",
              }}>
                {r.safety_record}
              </p>
            )}
            {r.safety_certifications?.length > 0 && (
              <p style={{
                fontFamily: SERIF,
                fontSize: 13,
                lineHeight: 1.6,
                color: DOC.ink,
                margin: 0,
              }}>
                {r.safety_certifications.join("  \u00b7  ")}
              </p>
            )}
          </>
        )}

        {r.experience?.length > 0 && (
          <>
            <SectionHeader>Experience</SectionHeader>
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

        {r.skills?.length > 0 && (
          <>
            <SectionHeader>Skills & Equipment</SectionHeader>
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
      </div>

      <ResumeActions resumeData={resumeData} template="trades" item={item} hasLink={hasLink} C={C} primaryBtnStyle={primaryBtnStyle} />
    </div>
  );
}
