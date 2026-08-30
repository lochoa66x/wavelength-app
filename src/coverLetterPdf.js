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
  const { plan } = validateCoverLetterExportContext(input);
  const { jsPDF } = await prepareCoverLetterPdfExport();
  const doc = new jsPDF({ unit: "pt", format: "letter", orientation: "portrait", compress: true, putOnlyUsedFonts: true });
  const left = 58;
  const width = 496;
  const bottom = 55;
  let y = 58;
  const write = (value, { size = 10.5, style = "normal", color = [23, 25, 28], after = 10, align = "left" } = {}) => {
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.setTextColor(...color);
    const lines = doc.splitTextToSize(pdfText(value), width);
    const leading = size * 1.35;
    if (y + lines.length * leading + after > 792 - bottom) { doc.addPage("letter", "portrait"); y = 58; }
    doc.text(lines, align === "center" ? 306 : left, y, { baseline: "top", align, lineHeightFactor: 1.35 });
    y += lines.length * leading + after;
  };
  write(plan.candidate.fullName, { size: 16, style: "bold", after: 3, align: "center" });
  if (plan.candidate.contactLine) write(plan.candidate.contactLine, { size: 9, color: [81, 88, 97], after: 8, align: "center" });
  doc.setDrawColor(23, 25, 28);
  doc.setLineWidth(1.4);
  doc.line(left, y, left + width, y);
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
