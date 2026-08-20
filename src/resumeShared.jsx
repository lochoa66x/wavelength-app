// Document-style palette — muted, professional, warmer than the app UI palette.
// Shared by both the Professional and Trades templates. If we ever need
// per-template accents, override DOC.accent in the template itself.
export const DOC = {
  paper: "#FDFDF9",
  ink: "#1A1A1F",
  inkSoft: "#4A4A52",
  inkFaint: "#7A7A82",
  accent: "#1D5F7A",
  rule: "#D8D4C4",
  bulletDot: "#1D5F7A",
};

export const SERIF = "'Iowan Old Style', 'Palatino Linotype', 'Palatino', 'Georgia', serif";
export const SANS = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Segoe UI', Roboto, sans-serif";

// Small helper for uppercase-tracked section titles. Takes an optional accent
// override so a template can tint its own headers without changing DOC.accent.
export function SectionHeader({ children, accent }) {
  return (
    <div style={{ marginTop: 20, marginBottom: 10 }}>
      <div style={{
        fontFamily: SANS,
        fontSize: 11,
        fontWeight: 700,
        letterSpacing: 2,
        color: accent || DOC.accent,
        textTransform: "uppercase",
        marginBottom: 4,
      }}>
        {children}
      </div>
      <div style={{ height: 1, background: DOC.rule }} />
    </div>
  );
}

// Plain-text serializer for the "Copy tailored text" button. The template arg
// controls section order to mirror the corresponding visual template — skills
// above experience for professional, and certs + safety above experience for
// trades. Sections are skipped when their data is empty so a lean base résumé
// doesn't produce empty headers.
export function resumeDataToPlainText(r, template = "professional") {
  const lines = [];
  if (r.name) lines.push(r.name);
  if (r.title) lines.push(r.title);
  if (r.contact) lines.push(r.contact);
  lines.push("");

  if (r.profile) {
    lines.push("PROFILE");
    lines.push(r.profile);
    lines.push("");
  }

  const emitSkills = () => {
    if (r.skills?.length) {
      lines.push(template === "trades" ? "SKILLS & EQUIPMENT" : "SKILLS");
      lines.push(r.skills.join(" · "));
      lines.push("");
    }
  };

  const emitExperience = () => {
    if (r.experience?.length) {
      lines.push("EXPERIENCE");
      for (const exp of r.experience) {
        const header = [exp.role, exp.company].filter(Boolean).join(" — ") + (exp.dates ? ` (${exp.dates})` : "");
        lines.push(header);
        for (const b of exp.bullets || []) lines.push(`• ${b}`);
        lines.push("");
      }
    }
  };

  const emitCertifications = () => {
    if (r.certifications?.length) {
      lines.push("CERTIFICATIONS & LICENSES");
      for (const c of r.certifications) {
        const parts = [c.name];
        if (c.issuer) parts.push(c.issuer);
        if (c.year) parts.push(c.year);
        lines.push(parts.join(" — "));
      }
      lines.push("");
    }
  };

  const emitSafety = () => {
    if (r.safety_record || r.safety_certifications?.length) {
      lines.push("SAFETY TRAINING");
      if (r.safety_record) {
        lines.push(r.safety_record);
      }
      if (r.safety_certifications?.length) {
        lines.push(r.safety_certifications.join(" · "));
      }
      lines.push("");
    }
  };

  // Section order — mirrors the visual layout of each template.
  if (template === "trades") {
    emitCertifications();
    emitSafety();
    emitExperience();
    emitSkills();
  } else {
    // professional
    emitSkills();
    emitExperience();
  }

  if (r.education?.length) {
    lines.push("EDUCATION");
    for (const e of r.education) {
      lines.push([e.degree, e.institution, e.dates].filter(Boolean).join(" — "));
    }
    lines.push("");
  }

  if (r.languages?.length) {
    lines.push("LANGUAGES");
    lines.push(r.languages.join(", "));
  }

  return lines.join("\n").trim();
}
