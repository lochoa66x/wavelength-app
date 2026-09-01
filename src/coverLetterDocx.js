import { coverLetterToPlainText, safeCoverLetterFilename, validateCoverLetterExportContext } from "./coverLetterModel.js";

let modulePromise;
export function prepareCoverLetterDocxExport() {
  modulePromise ||= import("docx").catch((error) => { modulePromise = undefined; throw error; });
  return modulePromise;
}

function safeText(value) {
  return typeof value === "string" ? value : "";
}

export async function createCoverLetterDocxBlob(input) {
  const { plan, applicationPresentation } = validateCoverLetterExportContext(input);
  const { AlignmentType, BorderStyle, Document, Packer, Paragraph, TextRun } = await prepareCoverLetterDocxExport();
  const tokens = applicationPresentation.tokens;
  const color = (value, fallback = "17191C") => String(value || fallback).replace("#", "").toUpperCase();
  const headerAlignment = applicationPresentation.headerAlignment === "left" ? AlignmentType.LEFT : AlignmentType.CENTER;
  const headerTreatment = tokens.headerTreatment;
  const children = [];
  const headerRule = headerTreatment === "civic-rule"
    ? { bottom: { color: color(tokens.accent), style: BorderStyle.DOUBLE, size: 10, space: 1 } }
    : ["keyline", "editorial-v2"].includes(headerTreatment)
      ? {
          top: { color: color(tokens.accent), style: BorderStyle.SINGLE, size: headerTreatment === "keyline" ? 20 : 8, space: 4 },
          bottom: { color: color(tokens.rule), style: BorderStyle.SINGLE, size: 5, space: 4 },
        }
      : { bottom: { color: color(tokens.ink), style: BorderStyle.SINGLE, size: 12, space: 1 } };
  const paragraph = (value, options = {}) => children.push(new Paragraph({
    spacing: { line: Math.round(tokens.coverLetterBodyFontSizePt * tokens.coverLetterLineHeight * 20), after: Math.round(tokens.coverLetterParagraphAfterPt * 20), ...(options.spacing || {}) },
    ...options,
    children: [new TextRun({ text: safeText(value), font: tokens.docxBodyFontFamily, size: Math.round(tokens.coverLetterBodyFontSizePt * 2), color: color(tokens.ink), ...(options.run || {}) })],
  }));
  paragraph(plan.candidate.fullName, { alignment: headerAlignment, spacing: { after: 45 }, ...(plan.candidate.contactLine ? {} : { border: headerRule }), run: { bold: true, font: tokens.docxDisplayFontFamily, size: Math.round(tokens.nameFontSizePt * 2) } });
  if (plan.candidate.contactLine) paragraph(plan.candidate.contactLine, { alignment: headerAlignment, border: headerRule, spacing: { after: 240 }, run: { color: color(tokens.muted), size: 19 } });
  paragraph(new Date(plan.createdAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" }), { spacing: { after: 180 } });
  if (plan.target.company) paragraph(plan.target.company, { spacing: { after: 30 }, run: { bold: true } });
  if (plan.target.jobTitle) paragraph(`Re: ${plan.target.jobTitle}`, { spacing: { after: 210 }, run: { bold: true } });
  paragraph(plan.salutation, { spacing: { after: 170 } });
  plan.paragraphs.forEach((entry) => paragraph(entry.text, { spacing: { after: 170 } }));
  paragraph(plan.signoff, { spacing: { before: 80, after: 35 } });
  paragraph(plan.candidate.fullName, { spacing: { after: 0 }, run: { bold: true } });
  const document = new Document({
    creator: "Gigscapes",
    title: `${plan.candidate.fullName} - ${plan.target.jobTitle} cover letter`,
    description: "Evidence-first cover letter generated from candidate-confirmed content.",
    styles: { default: { document: { run: { font: tokens.docxBodyFontFamily, size: Math.round(tokens.coverLetterBodyFontSizePt * 2) }, paragraph: { spacing: { line: Math.round(tokens.coverLetterBodyFontSizePt * tokens.coverLetterLineHeight * 20) } } } } },
    sections: [{
      properties: { page: { size: { width: Math.round(tokens.pageWidthIn * 1440), height: Math.round(tokens.pageHeightIn * 1440) }, margin: { top: Math.round(tokens.marginTopIn * 1440), right: Math.round(tokens.marginRightIn * 1440), bottom: Math.round(tokens.marginBottomIn * 1440), left: Math.round(tokens.marginLeftIn * 1440) } } },
      children,
    }],
  });
  return Packer.toBlob(document);
}

export async function downloadCoverLetterDocx(context) {
  const trusted = validateCoverLetterExportContext(context);
  const blob = await createCoverLetterDocxBlob(trusted);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safeCoverLetterFilename(trusted.plan, "docx", { preliminary: trusted.readiness.preliminary });
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}

export { coverLetterToPlainText };
