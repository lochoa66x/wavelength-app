import { forwardRef } from "react";

function SectionHeading({ children, tokens }) {
  return (
    <h2 style={{
      margin: "18px 0 8px",
      paddingBottom: 4,
      borderBottom: `1px solid ${tokens.rule}`,
      color: tokens.accent,
      fontFamily: tokens.fontFamily,
      fontSize: `${tokens.sectionFontSizePt}pt`,
      fontWeight: 700,
      letterSpacing: "0.04em",
      lineHeight: 1.2,
      textTransform: "uppercase",
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
      {bullets.map((bullet) => <li key={bullet.id} style={{ marginBottom: 3, breakInside: "avoid" }}>{bullet.text}</li>)}
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
      <article key={entry.id} data-resume-entry={entry.id} style={{ marginBottom: 12, breakInside: "avoid-page" }}>
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
  return (
    <article
      ref={ref}
      data-resume-preview={renderPlan.templateId}
      data-resume-content-hash={renderPlan.contentHash}
      aria-label={`${renderPlan.templateName} résumé preview`}
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
      <header style={{ textAlign: "center", borderBottom: `2px solid ${tokens.ink}`, paddingBottom: 10 }}>
        <h1 style={{ margin: 0, color: tokens.ink, fontFamily: tokens.fontFamily, fontSize: `${tokens.nameFontSizePt}pt`, lineHeight: 1.15 }}>{renderPlan.header.fullName}</h1>
        {renderPlan.header.headline ? <p style={{ margin: "5px 0 0", color: tokens.accent, fontFamily: tokens.fontFamily, fontSize: `${tokens.headlineFontSizePt}pt`, fontWeight: 700, lineHeight: 1.25 }}>{renderPlan.header.headline}</p> : null}
        {renderPlan.header.contactLine ? <p style={{ margin: "5px 0 0", color: tokens.muted, fontFamily: tokens.fontFamily, fontSize: "9.2pt", lineHeight: 1.3 }}>{renderPlan.header.contactLine}</p> : null}
      </header>

      {renderPlan.preliminaryNotice ? (
        <p role="note" style={{ margin: "12px 0 0", padding: "7px 10px", background: "#fff2cc", color: "#784108", fontFamily: tokens.fontFamily, fontSize: "9pt", fontWeight: 700, lineHeight: 1.3, textAlign: "center" }}>
          {renderPlan.preliminaryNotice}
        </p>
      ) : null}

      {renderPlan.sections.map((section) => (
        <section key={section.id} data-resume-section={section.id}>
          <SectionHeading tokens={tokens}>{section.heading}</SectionHeading>
          <SectionBody section={section} tokens={tokens} />
        </section>
      ))}
    </article>
  );
});
