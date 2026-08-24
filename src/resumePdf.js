import {
  PRELIMINARY_EXPORT_NOTICE,
  assertResumeExportIdentity,
  normalizeResumeForExport,
  safeResumeFilename,
} from "./resumeExport.js";

const PRINT_STYLES = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body { width: 8.5in; min-height: 11in; margin: 0; padding: 0; background: #fff; }
  body { color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  main { width: 8.5in; min-height: 11in; margin: 0 auto; }
  [data-resume-preview] {
    width: 100% !important;
    min-height: 11in;
    margin: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }
  [data-resume-preview] p,
  [data-resume-preview] li { orphans: 2; widows: 2; }
  [data-resume-preview] li { break-inside: avoid; page-break-inside: avoid; }
  @page { size: Letter; margin: 0; }
  @media print {
    html, body, main { width: 8.5in; }
  }
`;

function escapeHtml(value) {
  return String(value || "Tailored resume")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function pdfSafeText(value) {
  return String(value || "")
    .replace(/[–—]/g, "-")
    .replace(/[•·]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function joined(values, separator = " - ") {
  return values.map(pdfSafeText).filter(Boolean).join(separator);
}

export async function createResumePdfBytes(resumeData, template = "professional", options = {}) {
  assertResumeExportIdentity(resumeData);
  const resume = normalizeResumeForExport(resumeData);
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter", orientation: "portrait", compress: true, putOnlyUsedFonts: true });
  const page = { width: 612, height: 792, left: 46, right: 46, top: 44, bottom: 44 };
  const contentWidth = page.width - page.left - page.right;
  let y = page.top;

  const newPage = () => {
    doc.addPage("letter", "portrait");
    y = page.top;
  };
  const ensureSpace = (height) => {
    if (y + height > page.height - page.bottom) newPage();
  };
  const wrappedLines = (value, width, size = 10) => {
    doc.setFontSize(size);
    const text = pdfSafeText(value);
    return text ? doc.splitTextToSize(text, width) : [];
  };
  const writeLines = (value, {
    x = page.left,
    width = contentWidth,
    size = 10,
    style = "normal",
    color = [25, 25, 28],
    leading = size * 1.28,
    after = 4,
    align = "left",
    ensure = true,
  } = {}) => {
    doc.setFont("helvetica", style);
    doc.setTextColor(...color);
    doc.setFontSize(size);
    const lines = wrappedLines(value, width, size);
    if (!lines.length) return 0;
    const height = lines.length * leading;
    if (ensure) ensureSpace(height + after);
    const textX = align === "center" ? page.width / 2 : x;
    doc.text(lines, textX, y, { baseline: "top", align, lineHeightFactor: leading / size });
    y += height + after;
    return height + after;
  };
  const heading = (value) => {
    ensureSpace(34);
    y += 10;
    writeLines(value, { size: 10.5, style: "bold", color: [29, 95, 122], leading: 13, after: 4, ensure: false });
    doc.setDrawColor(205, 205, 198);
    doc.setLineWidth(0.6);
    doc.line(page.left, y, page.width - page.right, y);
    y += 7;
  };
  const paragraph = (value, optionsOverride = {}) => writeLines(value, { size: 10, leading: 13.2, after: 4, ...optionsOverride });
  const bullet = (value) => {
    const bulletX = page.left + 2;
    const textX = page.left + 14;
    const width = page.width - page.right - textX;
    const lines = wrappedLines(value, width, 10);
    if (!lines.length) return;
    const height = lines.length * 13.2;
    ensureSpace(height + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(25, 25, 28);
    doc.text("-", bulletX, y, { baseline: "top" });
    doc.text(lines, textX, y, { baseline: "top", lineHeightFactor: 1.32 });
    y += height + 4;
  };
  const emitSkills = () => {
    if (!resume.skills.length) return;
    heading("Skills");
    paragraph(joined(resume.skills, " | "));
  };
  const emitExperience = () => {
    if (!resume.experience.length) return;
    heading("Professional Experience");
    for (const entry of resume.experience) {
      const header = joined([entry.role, entry.company]);
      const firstBullet = entry.bullets[0] || "";
      const firstBulletHeight = wrappedLines(firstBullet, contentWidth - 14, 10).length * 13.2;
      ensureSpace(19 + firstBulletHeight);
      writeLines(joined([header, entry.dates]), { size: 10.2, style: "bold", leading: 13.2, after: 3, ensure: false });
      for (const value of entry.bullets) bullet(value);
      y += 2;
    }
  };
  const emitProjects = () => {
    if (!resume.projects.length) return;
    heading("Projects");
    for (const project of resume.projects) {
      const firstContent = project.description || project.bullets[0] || "";
      ensureSpace(18 + wrappedLines(firstContent, contentWidth, 10).length * 13.2);
      if (project.name) writeLines(project.name, { size: 10.2, style: "bold", leading: 13.2, after: 3, ensure: false });
      if (project.description) paragraph(project.description);
      for (const value of project.bullets) bullet(value);
    }
  };
  const emitTraining = () => {
    if (!resume.training.length) return;
    heading("Training & Certifications");
    for (const entry of resume.training) paragraph(joined([entry.name, entry.provider, entry.dates]));
  };
  const emitCertifications = () => {
    if (!resume.certifications.length) return;
    heading("Certifications & Licenses");
    for (const entry of resume.certifications) paragraph(joined([entry.name, entry.provider, entry.dates]));
  };
  const emitSafety = () => {
    if (!resume.safety_record && !resume.safety_certifications.length) return;
    heading("Safety Training");
    if (resume.safety_record) paragraph(resume.safety_record);
    if (resume.safety_certifications.length) paragraph(joined(resume.safety_certifications, " | "));
  };

  writeLines(resume.name, { size: 17, style: "bold", leading: 20, after: 4, align: "center" });
  if (resume.title) writeLines(resume.title, { size: 11.5, style: "bold", color: [55, 55, 60], leading: 14, after: 3, align: "center" });
  if (resume.contact) writeLines(resume.contact, { size: 9.2, color: [65, 65, 70], leading: 11.5, after: 8, align: "center" });
  if (options.preliminary) {
    const noticeLines = wrappedLines(PRELIMINARY_EXPORT_NOTICE, contentWidth - 20, 9);
    const noticeHeight = noticeLines.length * 11.5 + 12;
    ensureSpace(noticeHeight + 5);
    doc.setFillColor(255, 242, 204);
    doc.roundedRect(page.left, y, contentWidth, noticeHeight, 2, 2, "F");
    y += 6;
    writeLines(PRELIMINARY_EXPORT_NOTICE, { x: page.left + 10, width: contentWidth - 20, size: 9, style: "bold", color: [120, 65, 8], leading: 11.5, after: 6, align: "center", ensure: false });
  }
  if (resume.profile) {
    heading("Professional Summary");
    paragraph(resume.profile);
  }

  if (template === "trades") {
    emitCertifications();
    emitSafety();
    emitExperience();
    emitSkills();
  } else if (template === "career-change") {
    emitProjects();
    emitTraining();
    emitSkills();
    emitExperience();
  } else {
    emitSkills();
    emitProjects();
    emitTraining();
    emitExperience();
  }

  if (resume.education.length) {
    heading("Education");
    for (const entry of resume.education) paragraph(joined([entry.degree, entry.institution, entry.dates]));
  }
  if (resume.languages.length) {
    heading("Languages");
    paragraph(joined(resume.languages, ", "));
  }

  doc.setProperties({ title: joined([resume.name, resume.title]), subject: "ATS-readable tailored resume", creator: "Gigscapes" });
  return new Uint8Array(doc.output("arraybuffer"));
}

export async function createResumePdfBlob(resumeData, template = "professional", options = {}) {
  const bytes = await createResumePdfBytes(resumeData, template, options);
  return new Blob([bytes], { type: "application/pdf" });
}

export async function downloadResumePdf(resumeData, template = "professional", options = {}) {
  const blob = await createResumePdfBlob(resumeData, template, options);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safeResumeFilename(resumeData, "pdf", options);
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function createResumePrintDocument(previewMarkup, title = "Tailored resume") {
  const markup = String(previewMarkup || "").trim();
  if (!markup) throw new Error("The résumé preview is unavailable for PDF export.");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)}</title>
    <style>${PRINT_STYLES}</style>
  </head>
  <body>
    <main aria-label="ATS-safe résumé">${markup}</main>
  </body>
</html>`;
}

export async function printResumePdf(previewElement, title = "Tailored resume", documentRef = globalThis.document) {
  if (!previewElement?.outerHTML) throw new Error("The résumé preview is unavailable for PDF export.");
  if (!documentRef?.body?.appendChild) throw new Error("PDF export requires a browser window.");

  const frame = documentRef.createElement("iframe");
  frame.title = "Résumé PDF export";
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "1px",
    height: "1px",
    border: "0",
    opacity: "0",
    pointerEvents: "none",
  });

  const loaded = new Promise((resolve, reject) => {
    frame.addEventListener("load", resolve, { once: true });
    frame.addEventListener("error", () => reject(new Error("The PDF print preview could not be prepared.")), { once: true });
  });
  frame.srcdoc = createResumePrintDocument(previewElement.outerHTML, title);
  documentRef.body.appendChild(frame);
  await loaded;

  const printWindow = frame.contentWindow;
  if (!printWindow) {
    frame.remove();
    throw new Error("The PDF print preview could not be opened.");
  }

  try {
    await frame.contentDocument?.fonts?.ready;
  } catch {
    // System font fallbacks are intentionally safe for ATS-readable output.
  }

  let removed = false;
  const cleanup = () => {
    if (removed) return;
    removed = true;
    frame.remove();
  };
  printWindow.addEventListener("afterprint", cleanup, { once: true });
  globalThis.setTimeout?.(cleanup, 120_000);
  printWindow.focus();
  printWindow.print();
}
