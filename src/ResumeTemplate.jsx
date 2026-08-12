import { Copy, ExternalLink } from "lucide-react";

export function resumeDataToPlainText(r) {
  const lines = [];
  if (r.name) lines.push(r.name);
  if (r.title) lines.push(r.title);
  if (r.contact) lines.push(r.contact);
  lines.push("");
  if (r.profile) { lines.push("PROFILE"); lines.push(r.profile); lines.push(""); }
  if (r.experience?.length) {
    lines.push("EXPERIENCE");
    for (const exp of r.experience) {
      lines.push([exp.role, exp.company].filter(Boolean).join(" — ") + (exp.dates ? ` (${exp.dates})` : ""));
      for (const b of exp.bullets || []) lines.push(`• ${b}`);
      lines.push("");
    }
  }
  if (r.skills?.length) { lines.push("SKILLS"); lines.push(r.skills.join(" · ")); lines.push(""); }
  if (r.education?.length) { lines.push("EDUCATION"); for (const e of r.education) lines.push([e.degree, e.institution, e.dates].filter(Boolean).join(" — ")); lines.push(""); }
  if (r.languages?.length) { lines.push("LANGUAGES"); lines.push(r.languages.join(", ")); }
  return lines.join("\n").trim();
}

const DOC = { paper: "#FDFDF9", ink: "#1A1A1F", inkSoft: "#4A4A52", inkFaint: "#7A7A82", accent: "#1D5F7A", rule: "#D8D4C4", bulletDot: "#1D5F7A" };
const SERIF = "'Iowan Old Style', 'Palatino Linotype', 'Palatino', 'Georgia', serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif";

function SectionHeader({ children }) {
  return (
    <div style={{ marginTop: 20, marginBottom: 10 }}>
      <div style={{ fontFamily: SANS, fontSize: 11, fontWeight: 700, letterSpacing: 2, color: DOC.accent, textTransform: "uppercase", marginBottom: 4 }}>{children}</div>
      <div style={{ height: 1, background: DOC.rule }} />
    </div>
  );
}

export function ResumeTemplate({ resumeData, item, hasLink, C, primaryBtnStyle }) {
  const r = resumeData;
  return (
    <div>
      <div style={{ background: DOC.paper, borderRadius: 6, padding: "36px 40px 32px", margin: "0 0 12px", boxShadow: "0 1px 2px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.08)", fontFamily: SERIF, color: DOC.ink, lineHeight: 1.55 }}>
        <div style={{ textAlign: "center", marginBottom: 6 }}>
          {r.name && <div style={{ fontFamily: SERIF, fontSize: 26, fontWeight: 700, letterSpacing: 1, color: DOC.ink, lineHeight: 1.15, marginBottom: 4 }}>{r.name}</div>}
          {r.title && <div style={{ fontFamily: SANS, fontSize: 12, fontWeight: 600, letterSpacing: 2, textTransform: "uppercase", color: DOC.accent, marginBottom: 8 }}>{r.title}</div>}
          {r.contact && <div style={{ fontFamily: SANS, fontSize: 12, color: DOC.inkSoft }}>{r.contact}</div>}
        </div>
        <div style={{ height: 2, background: DOC.ink, margin: "12px 0 0" }} />
        {r.profile && <><SectionHeader>Profile</SectionHeader><p style={{ fontFamily: SERIF, fontSize: 13.5, lineHeight: 1.6, color: DOC.ink, margin: 0 }}>{r.profile}</p></>}
        {r.experience?.length > 0 && (
          <><SectionHeader>Experience</SectionHeader>
          {r.experience.map((exp, ei) => (
            <div key={ei} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 2 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontFamily: SERIF, fontSize: 14, fontWeight: 700, color: DOC.ink }}>{exp.role}</span>
                  {exp.company && <span style={{ fontFamily: SERIF, fontSize: 14, color: DOC.inkSoft, fontStyle: "italic" }}>{" — "}{exp.company}</span>}
                </div>
                {exp.dates && <div style={{ fontFamily: SANS, fontSize: 11, color: DOC.inkFaint, whiteSpace: "nowrap" }}>{exp.dates}</div>}
              </div>
              {exp.bullets?.length > 0 && (
                <ul style={{ margin: "5px 0 0", paddingLeft: 18, listStyle: "none" }}>
                  {exp.bullets.map((b, bi) => (
                    <li key={bi} style={{ fontFamily: SERIF, fontSize: 13, lineHeight: 1.5, color: DOC.ink, marginBottom: 3, position: "relative", paddingLeft: 2 }}>
                      <span style={{ position: "absolute", left: -14, top: 0, color: DOC.bulletDot, fontWeight: 700 }}>•</span>{b}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}</>
        )}
        {r.skills?.length > 0 && <><SectionHeader>Skills</SectionHeader><p style={{ fontFamily: SERIF, fontSize: 13, lineHeight: 1.6, color: DOC.ink, margin: 0 }}>{r.skills.join("  ·  ")}</p></>}
        {r.education?.length > 0 && (
          <><SectionHeader>Education</SectionHeader>
          {r.education.map((e, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12, marginBottom: 4, fontFamily: SERIF, fontSize: 13, color: DOC.ink }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                {e.degree && <span style={{ fontWeight: 700 }}>{e.degree}</span>}
                {e.institution && <span style={{ color: DOC.inkSoft, fontStyle: "italic" }}>{e.degree ? " — " : ""}{e.institution}</span>}
              </div>
              {e.dates && <div style={{ fontFamily: SANS, fontSize: 11, color: DOC.inkFaint, whiteSpace: "nowrap" }}>{e.dates}</div>}
            </div>
          ))}</>
        )}
        {r.languages?.length > 0 && <><SectionHeader>Languages</SectionHeader><p style={{ fontFamily: SERIF, fontSize: 13, color: DOC.ink, margin: 0 }}>{r.languages.join(", ")}</p></>}
      </div>
      <p style={{ fontSize: 12, color: "#9A9AA0", margin: "0 0 12px" }}>Review before sending — nothing gets submitted automatically.</p>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
        <button onClick={() => navigator.clipboard?.writeText(resumeDataToPlainText(resumeData))} className="wl-btn" style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 13, fontWeight: 500, padding: "9px 16px", borderRadius: 980, border: "1px solid #E5E5EA", background: "#FFFFFF", color: "#1D1D1F", cursor: "pointer" }}>
          <Copy size={12} /> Copy tailored text
        </button>
        {hasLink && (
          <a href={item.url} target="_blank" rel="noreferrer" className="wl-btn" style={{ ...primaryBtnStyle(false), fontSize: 13, padding: "9px 16px", textDecoration: "none" }}>
            Open application <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  );
}
