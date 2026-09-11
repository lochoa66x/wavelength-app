import { coverLetterRecipientAddress } from "./documentIntegrity.js";

export function CoverLetterDocument({ plan, presentation }) {
  const tokens = presentation.tokens;
  const address = coverLetterRecipientAddress(plan.target);
  const keyline = ["keyline", "editorial-v2"].includes(tokens.headerTreatment);
  return (
    <article data-cover-letter-preview aria-label="Cover letter document preview" style={{
      boxSizing: "border-box", width: "100%", maxWidth: `${tokens.pageWidthIn}in`, minHeight: `${tokens.pageHeightIn}in`,
      margin: "0 auto", padding: `${tokens.marginTopIn}in ${tokens.marginRightIn}in ${tokens.marginBottomIn}in ${tokens.marginLeftIn}in`,
      background: tokens.paper, color: tokens.ink, borderRadius: 6, boxShadow: "0 2px 16px rgba(0,0,0,.07)",
      fontFamily: tokens.bodyFontFamily, fontSize: `${tokens.coverLetterBodyFontSizePt}pt`, lineHeight: tokens.coverLetterLineHeight,
    }}>
      <header style={{ textAlign: presentation.headerAlignment, borderTop: keyline ? `3px solid ${tokens.accent}` : 0,
        borderBottom: `1px solid ${tokens.rule}`, padding: keyline ? "10px 0" : "0 0 10px", marginBottom: 22 }}>
        <h1 style={{ margin: "0 0 4px", fontFamily: tokens.displayFontFamily, fontSize: `${tokens.nameFontSizePt}pt`, lineHeight: 1.15 }}>{plan.candidate.fullName}</h1>
        {plan.candidate.contactLine ? <p style={{ margin: 0, fontSize: "9.5pt", color: tokens.muted }}>{plan.candidate.contactLine}</p> : null}
      </header>
      <p style={{ margin: "0 0 13pt" }}>{new Date(plan.createdAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" })}</p>
      {plan.target.company ? <p style={{ margin: "0 0 3pt", fontWeight: 700 }}>{plan.target.company}</p> : null}
      {address ? <p style={{ margin: "0 0 3pt" }}>{address}</p> : null}
      <p style={{ margin: "0 0 16pt", fontWeight: 700 }}>Re: {plan.target.jobTitle}</p>
      <p style={{ margin: "0 0 12pt" }}>{plan.salutation}</p>
      {plan.paragraphs.map((paragraph) => <p key={paragraph.id} data-cover-letter-paragraph={paragraph.id} style={{ margin: `0 0 ${tokens.coverLetterParagraphAfterPt}pt`, breakInside: "avoid" }}>{paragraph.text}</p>)}
      <div style={{ breakInside: "avoid" }}><p style={{ margin: "16pt 0 3pt" }}>{plan.signoff}</p><p style={{ margin: 0, fontWeight: 700 }}>{plan.candidate.fullName}</p></div>
    </article>
  );
}
