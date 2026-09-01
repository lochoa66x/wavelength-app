import { safeCoverLetterFilename, validateCoverLetterExportContext } from "./coverLetterModel.js";

let pdfModulePromise;

export function prepareCoverLetterPdfExport() {
  pdfModulePromise ||= import("jspdf").catch((error) => {
    pdfModulePromise = undefined;
    throw error;
  });
  return pdfModulePromise;
}

function pdfText(value) {
  return String(value || "").replace(/[–—]/g, "-").replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/\u00a0/g, " ");
}

export async function createCoverLetterPdfBlob(input) {
  const { plan, applicationPresentation } = validateCoverLetterExportContext(input);
  const { jsPDF } = await prepareCoverLetterPdfExport();
  const tokens = applicationPresentation.tokens;
  const doc = new jsPDF({ unit: "pt", format: "letter", orientation: "portrait", compress: true, putOnlyUsedFonts: true });
  const rgb = (value, fallback = [23, 25, 28]) => String(value || "").match(/[a-f\d]{2}/gi)?.slice(0, 3).map((entry) => Number.parseInt(entry, 16)) || fallback;
  const bodyFont = ["helvetica", "times", "courier"].includes(tokens.pdfBodyFontFamily) ? tokens.pdfBodyFontFamily : "helvetica";
  const displayFont = ["helvetica", "times", "courier"].includes(tokens.pdfDisplayFontFamily) ? tokens.pdfDisplayFontFamily : bodyFont;
  const left = tokens.marginLeftIn * 72;
  const width = tokens.pageWidthIn * 72 - left - tokens.marginRightIn * 72;
  const bottom = tokens.marginBottomIn * 72;
  let y = tokens.marginTopIn * 72;
  const write = (value, { size = tokens.coverLetterBodyFontSizePt, style = "normal", color = rgb(tokens.ink), after = tokens.coverLetterParagraphAfterPt, align = "left", font = bodyFont } = {}) => {
    doc.setFont(font, style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(pdfText(value), width);
    const leading = size * tokens.coverLetterLineHeight;
    if (y + lines.length * leading + after > tokens.pageHeightIn * 72 - bottom) { doc.addPage("letter", "portrait"); y = tokens.marginTopIn * 72; }
    doc.text(lines, align === "center" ? tokens.pageWidthIn * 36 : left, y, { baseline: "top", align, lineHeightFactor: tokens.coverLetterLineHeight });
    y += lines.length * leading + after;
  };
  const headerAlign = applicationPresentation.headerAlignment;
  if (["keyline", "editorial-v2"].includes(tokens.headerTreatment)) {
    doc.setDrawColor(...rgb(tokens.accent));
    doc.setLineWidth(tokens.headerTreatment === "keyline" ? 2.6 : 1);
    doc.line(left, y, left + width, y);
    y += 9;
  }
  write(plan.candidate.fullName, { size: tokens.nameFontSizePt, style: "bold", after: 3, align: headerAlign, font: displayFont });
  if (plan.candidate.contactLine) write(plan.candidate.contactLine, { size: 9.5, color: rgb(tokens.muted, [81, 88, 97]), after: 8, align: headerAlign });
  doc.setDrawColor(...rgb(tokens.headerTreatment === "civic-rule" ? tokens.accent : tokens.rule));
  doc.setLineWidth(tokens.headerTreatment === "civic-rule" ? 1.3 : 0.7);
  doc.line(left, y, left + width, y);
  if (tokens.headerTreatment === "civic-rule") doc.line(left, y + 3, left + width, y + 3);
  y += 18;
  write(new Date(plan.createdAt).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" }), { after: 13 });
  if (plan.target.company) write(plan.target.company, { style: "bold", after: 3 });
  if (plan.target.jobTitle) write(`Re: ${plan.target.jobTitle}`, { style: "bold", after: 16 });
  write(plan.salutation, { after: 12 });
  plan.paragraphs.forEach((entry) => write(entry.text, { after: 12 }));
  write(plan.signoff, { after: 3 });
  write(plan.candidate.fullName, { style: "bold", after: 0 });
  doc.setProperties({ title: `${plan.candidate.fullName} - ${plan.target.jobTitle} cover letter`, author: plan.candidate.fullName, creator: "Gigscapes" });
  return doc.output("blob");
}

export async function downloadCoverLetterPdf(context) {
  const trusted = validateCoverLetterExportContext(context);
  const blob = await createCoverLetterPdfBlob(trusted);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safeCoverLetterFilename(trusted.plan, "pdf", { preliminary: trusted.readiness.preliminary });
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1_000);
}
