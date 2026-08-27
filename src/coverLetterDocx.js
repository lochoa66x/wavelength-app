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
  const { plan } = validateCoverLetterExportContext(input);
  const { AlignmentType, BorderStyle, Document, Packer, Paragraph, TextRun } = await prepareCoverLetterDocxExport();
  const children = [];
  const headerRule = { bottom: { color: "17191C", style: BorderStyle.SINGLE, size: 12, space: 1 } };
  const paragraph = (value, options = {}) => children.push(new Paragraph({
    spacing: { line: 276, after: 150, ...(options.spacing || {}) },
    ...options,
    children: [new TextRun({ text: safeText(value), font: "Arial", size: 22, ...(options.run || {}) })],
  }));
  paragraph(plan.candidate.fullName, { alignment: AlignmentType.CENTER, spacing: { after: 45 }, ...(plan.candidate.contactLine ? {} : { border: headerRule }), run: { bold: true, size: 30 } });
  if (plan.candidate.contactLine) paragraph(plan.candidate.contactLine, { alignment: AlignmentType.CENTER, border: headerRule, spacing: { after: 240 }, run: { color: "565B61", size: 19 } });
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
    styles: { default: { document: { run: { font: "Arial", size: 22 }, paragraph: { spacing: { line: 276 } } } } },
    sections: [{
      properties: { page: { size: { width: 12240, height: 15840 }, margin: { top: 900, right: 980, bottom: 900, left: 980 } } },
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
