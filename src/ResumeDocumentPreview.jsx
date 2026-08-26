import { forwardRef } from "react";

function SectionHeading({ children, tokens }) {
  const treatment = tokens.sectionTreatment || "underline";
  const treatmentStyle = treatment === "accent-edge"
    ? { padding: "2px 0 2px 9px", borderLeft: `4px solid ${tokens.accent}`, borderBottom: 0 }
    : treatment === "soft-band"
      ? { padding: "5px 8px", borderBottom: 0, background: tokens.accentSoft }
      : treatment === "compact-rule"
        ? { paddingBottom: 3, borderBottom: `2px solid ${tokens.accent}` }
        : treatment === "editorial"
          ? { paddingBottom: 3, borderBottom: `1px solid ${tokens.accent}` }
          : { paddingBottom: 4, borderBottom: `1px solid ${tokens.rule}` };
  return (
    <h2 style={{
      margin: treatment === "compact-rule" ? "13px 0 6px" : "18px 0 8px",
      color: tokens.accent,
      fontFamily: tokens.fontFamily,
      fontSize: `${tokens.sectionFontSizePt}pt`,
      fontWeight: 700,
      letterSpacing: `${tokens.sectionLetterSpacingEm ?? 0.04}em`,
      lineHeight: 1.2,
      textTransform: tokens.sectionTextTransform || "uppercase",
      ...treatmentStyle,
    }}>
      {children}
    </h2>
  );
}

const bodyStyle = (tokens) => ({
  margin: 0,
  color: tokens.ink,
  fontFamily: tokens.fontFamily,
  fontSize: `${tokens.bodyFontSizePt}pt`,
  lineHeight: tokens.bodyLineHeight,
});

function BulletList({ bullets, tokens }) {
  if (!bullets.length) return null;
  return (
    <ul style={{ ...bodyStyle(tokens), margin: "5px 0 0", paddingLeft: 20 }}>
      {bullets.map((bullet) => <li key={bullet.id} style={{ marginBottom: tokens.sectionTreatment === "compact-rule" ? 2 : 3, breakInside: "avoid" }}>{bullet.text}</li>)}
    </ul>
  );
}

function SectionBody({ section, tokens }) {
  if (section.type === "paragraph") {
    return section.items.map((item) => <p key={item.id} style={bodyStyle(tokens)}>{item.text}</p>);
  }
  if (section.type === "inline-list") {
    return <p style={bodyStyle(tokens)}>{section.items.map((item) => item.text).join(" | ")}</p>;
  }
  if (section.type === "experience") {
    return section.items.map((entry) => (
      <article key={entry.id} data-resume-entry={entry.id} style={{ marginBottom: tokens.sectionTreatment === "compact-rule" ? 9 : 12, breakInside: "avoid-page" }}>
        <p style={{ ...bodyStyle(tokens), fontWeight: 700 }}>
          {[entry.title, entry.employer].filter(Boolean).join(" - ")}
          {entry.location ? <span style={{ color: tokens.muted, fontWeight: 400 }}> | {entry.location}</span> : null}
          {entry.dateDisplay ? <span style={{ color: tokens.muted, fontWeight: 400 }}> | {entry.dateDisplay}</span> : null}
        </p>
        <BulletList bullets={entry.bullets} tokens={tokens} />
      </article>
    ));
  }
  if (section.type === "projects") {
    return section.items.map((project) => (
      <article key={project.id} data-resume-entry={project.id} style={{ marginBottom: 10, breakInside: "avoid-page" }}>
        <p style={{ ...bodyStyle(tokens), fontWeight: 700 }}>{[project.name, project.organization].filter(Boolean).join(" - ")}</p>
        {(project.startDate || project.endDate) ? <p style={{ ...bodyStyle(tokens), color: tokens.muted }}>{[project.startDate, project.endDate].filter(Boolean).join(" - ")}</p> : null}
        {project.description ? <p style={{ ...bodyStyle(tokens), marginTop: 3 }}>{project.description}</p> : null}
        <BulletList bullets={project.bullets} tokens={tokens} />
      </article>
    ));
  }
  if (section.type === "credentials") {
    return section.items.map((item) => <p key={item.id} style={{ ...bodyStyle(tokens), marginBottom: 4 }}>{[item.name, item.issuer, item.dateDisplay].filter(Boolean).join(" | ")}</p>);
  }
  if (section.type === "education") {
    return section.items.map((item) => (
      <article key={item.id} data-resume-entry={item.id} style={{ marginBottom: 7, breakInside: "avoid-page" }}>
        <p style={{ ...bodyStyle(tokens), fontWeight: 700 }}>{[item.credential, item.field].filter(Boolean).join(" - ")}</p>
        <p style={{ ...bodyStyle(tokens), color: tokens.muted }}>{[item.institution, item.location, item.dateDisplay].filter(Boolean).join(" | ")}</p>
        <BulletList bullets={item.details} tokens={tokens} />
      </article>
    ));
  }
  if (section.type === "languages") {
    return <p style={bodyStyle(tokens)}>{section.items.map((item) => [item.name, item.proficiency].filter(Boolean).join(" - ")).join(", ")}</p>;
  }
  return section.items.map((item) => <p key={item.id} style={{ ...bodyStyle(tokens), marginBottom: 4 }}>{item.text}</p>);
}

export const ResumeDocumentPreview = forwardRef(function ResumeDocumentPreview({ renderPlan }, ref) {
  const tokens = renderPlan.visualTokens;
  const headerBand = tokens.headerTreatment === "accent-band";
  const leftAligned = tokens.headerAlignment === "left";
  const headerStyle = {
    textAlign: leftAligned ? "left" : "center",
    borderBottom: tokens.headerTreatment === "accent-edge"
      ? 0
      : tokens.headerTreatment === "compact-rule"
        ? `3px double ${tokens.ink}`
        : tokens.headerTreatment === "editorial"
          ? `1px solid ${tokens.accent}`
          : `2px solid ${tokens.ink}`,
    borderLeft: tokens.headerTreatment === "accent-edge" ? `6px solid ${tokens.accent}` : 0,
    padding: headerBand ? "14px 16px" : tokens.headerTreatment === "accent-edge" ? "2px 0 10px 14px" : "0 0 10px",
    background: headerBand ? tokens.headerBackground : "transparent",
    borderRadius: headerBand ? 4 : 0,
  };
  return (
    <article
      ref={ref}
      data-resume-preview={renderPlan.designId}
      data-resume-strategy={renderPlan.strategyId}
      data-resume-design={renderPlan.designId}
      data-resume-content-hash={renderPlan.contentHash}
      aria-label={`${renderPlan.designName} design résumé preview using the ${renderPlan.strategyName} content strategy`}
      style={{
        width: "100%",
        maxWidth: `${tokens.pageWidthIn}in`,
        minHeight: `${tokens.pageHeightIn}in`,
        margin: "0 auto 12px",
        padding: `${tokens.marginTopIn}in ${tokens.marginRightIn}in ${tokens.marginBottomIn}in ${tokens.marginLeftIn}in`,
        background: tokens.paper,
        borderRadius: 6,
        boxShadow: "0 1px 2px rgba(0,0,0,0.06), 0 12px 32px rgba(0,0,0,0.08)",
        boxSizing: "border-box",
        color: tokens.ink,
        fontFamily: tokens.fontFamily,
      }}
    >
      <header style={headerStyle}>
        <h1 style={{ margin: 0, color: headerBand ? tokens.headerText : tokens.ink, fontFamily: tokens.fontFamily, fontSize: `${tokens.nameFontSizePt}pt`, lineHeight: 1.15 }}>{renderPlan.header.fullName}</h1>
        {renderPlan.header.headline ? <p style={{ margin: "5px 0 0", color: headerBand ? tokens.headerText : tokens.accent, fontFamily: tokens.fontFamily, fontSize: `${tokens.headlineFontSizePt}pt`, fontWeight: 700, lineHeight: 1.25 }}>{renderPlan.header.headline}</p> : null}
        {renderPlan.header.contactLine ? <p style={{ margin: "5px 0 0", color: headerBand ? tokens.headerText : tokens.muted, fontFamily: tokens.fontFamily, fontSize: "9.2pt", lineHeight: 1.3 }}>{renderPlan.header.contactLine}</p> : null}
      </header>

      {renderPlan.sections.map((section) => (
        <section key={section.id} data-resume-section={section.id}>
          <SectionHeading tokens={tokens}>{section.heading}</SectionHeading>
          <SectionBody section={section} tokens={tokens} />
        </section>
      ))}
    </article>
  );
});
