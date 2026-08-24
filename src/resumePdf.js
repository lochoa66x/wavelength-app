import {
  assertResumePackageIdentity,
  buildResumeRenderPlan,
  cleanScalar,
  createResumePackage,
  safeResumeFilenameFromPackage,
} from "./resumeModel.js";
import { validateResumeExportContext } from "./resumeReadiness.js";

const PRINT_STYLES = `
  *, *::before, *::after { box-sizing: border-box; }
  html, body { width: 8.5in; min-height: 11in; margin: 0; padding: 0; background: #fff; }
  body { color: #17191c; font-family: Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  main { width: 8.5in; min-height: 11in; margin: 0 auto; }
  [data-resume-preview] { width: 8.5in !important; min-height: 11in; margin: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
  [data-resume-section], [data-resume-entry] { break-inside: avoid-page; page-break-inside: avoid; }
  [data-resume-preview] p, [data-resume-preview] li { orphans: 2; widows: 2; }
  [data-resume-preview] li { break-inside: avoid; page-break-inside: avoid; }
  @page { size: Letter; margin: 0; }
`;

function escapeHtml(value) {
  return cleanScalar(value || "Tailored resume")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function pdfSafeText(value) {
  return cleanScalar(value)
    .replace(/[–—]/g, "-")
    .replace(/[•·]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\u00a0/g, " ");
}

function joined(values, separator = " | ") {
  return values.map(pdfSafeText).filter(Boolean).join(separator);
}

function resolveRenderPlan(input, template, options) {
  if (input?.kind === "resume-export-context") return validateResumeExportContext(input).renderPlan;
  if (input?.kind === "resume-render-plan") return input;
  return buildResumeRenderPlan(createResumePackage(input), template, options);
}

export async function createResumePdfBytes(input, template = "professional", options = {}) {
  const renderPlan = resolveRenderPlan(input, template, options);
  assertResumePackageIdentity(createResumePackage({ name: renderPlan.header.fullName }));
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "letter", orientation: "portrait", compress: true, putOnlyUsedFonts: true });
  const tokens = renderPlan.visualTokens;
  const page = {
    width: tokens.pageWidthIn * 72,
    height: tokens.pageHeightIn * 72,
    left: tokens.marginLeftIn * 72,
    right: tokens.marginRightIn * 72,
    top: tokens.marginTopIn * 72,
    bottom: tokens.marginBottomIn * 72,
  };
  const contentWidth = page.width - page.left - page.right;
  const accent = tokens.accent.match(/[a-f\d]{2}/gi)?.map((value) => Number.parseInt(value, 16)) || [29, 95, 122];
  let y = page.top;

  const newPage = () => {
    doc.addPage("letter", "portrait");
    y = page.top;
  };
  const ensureSpace = (height) => {
    if (y + height > page.height - page.bottom) newPage();
  };
  const wrappedLines = (value, width, size = tokens.bodyFontSizePt) => {
    doc.setFontSize(size);
    const safe = pdfSafeText(value);
    return safe ? doc.splitTextToSize(safe, width) : [];
  };
  const writeLines = (value, {
    x = page.left,
    width = contentWidth,
    size = tokens.bodyFontSizePt,
    style = "normal",
    color = [23, 25, 28],
    leading = size * tokens.bodyLineHeight,
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
    writeLines(value, { size: tokens.sectionFontSizePt, style: "bold", color: accent, leading: 13, after: 4, ensure: false });
    doc.setDrawColor(201, 205, 209);
    doc.setLineWidth(0.6);
    doc.line(page.left, y, page.width - page.right, y);
    y += 7;
  };
  const paragraph = (value, overrides = {}) => writeLines(value, { size: tokens.bodyFontSizePt, leading: 13.2, after: 4, ...overrides });
  const bullet = (value) => {
    const bulletX = page.left + 2;
    const textX = page.left + 14;
    const width = page.width - page.right - textX;
    const lines = wrappedLines(value, width, tokens.bodyFontSizePt);
    if (!lines.length) return;
    const height = lines.length * 13.2;
    ensureSpace(height + 4);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(tokens.bodyFontSizePt);
    doc.setTextColor(23, 25, 28);
    doc.text("-", bulletX, y, { baseline: "top" });
    doc.text(lines, textX, y, { baseline: "top", lineHeightFactor: 1.32 });
    y += height + 4;
  };

  writeLines(renderPlan.header.fullName, { size: tokens.nameFontSizePt, style: "bold", leading: 20, after: 4, align: "center" });
  if (renderPlan.header.headline) writeLines(renderPlan.header.headline, { size: tokens.headlineFontSizePt, style: "bold", color: [55, 55, 60], leading: 14, after: 3, align: "center" });
  if (renderPlan.header.contactLine) writeLines(renderPlan.header.contactLine, { size: 9.2, color: [65, 65, 70], leading: 11.5, after: 8, align: "center" });
  if (renderPlan.preliminaryNotice) {
    const noticeLines = wrappedLines(renderPlan.preliminaryNotice, contentWidth - 20, 9);
    const noticeHeight = noticeLines.length * 11.5 + 12;
    ensureSpace(noticeHeight + 5);
    doc.setFillColor(255, 242, 204);
    doc.roundedRect(page.left, y, contentWidth, noticeHeight, 2, 2, "F");
    y += 6;
    writeLines(renderPlan.preliminaryNotice, { x: page.left + 10, width: contentWidth - 20, size: 9, style: "bold", color: [120, 65, 8], leading: 11.5, after: 6, align: "center", ensure: false });
  }

  for (const section of renderPlan.sections) {
    heading(section.heading);
    if (section.type === "paragraph") {
      for (const item of section.items) paragraph(item.text);
    } else if (section.type === "inline-list") {
      paragraph(section.items.map((item) => item.text).join(" | "));
    } else if (section.type === "experience") {
      for (const entry of section.items) {
        const firstBullet = entry.bullets[0]?.text || "";
        ensureSpace(19 + wrappedLines(firstBullet, contentWidth - 14).length * 13.2);
        writeLines(joined([[entry.title, entry.employer].filter(Boolean).join(" - "), entry.location, entry.dateDisplay]), { size: 10.2, style: "bold", leading: 13.2, after: 3, ensure: false });
        for (const value of entry.bullets) bullet(value.text);
        y += 2;
      }
    } else if (section.type === "projects") {
      for (const project of section.items) {
        const firstContent = project.description || project.bullets[0]?.text || "";
        ensureSpace(18 + wrappedLines(firstContent, contentWidth).length * 13.2);
        const projectHeading = [project.name, project.organization].filter(Boolean).join(" - ");
        if (projectHeading) writeLines(projectHeading, { size: 10.2, style: "bold", leading: 13.2, after: 3, ensure: false });
        const dates = [project.startDate, project.endDate].filter(Boolean).join(" - ");
        if (dates) paragraph(dates, { style: "italic" });
        if (project.description) paragraph(project.description);
        for (const value of project.bullets) bullet(value.text);
      }
    } else if (section.type === "credentials") {
      for (const item of section.items) paragraph(joined([item.name, item.issuer, item.dateDisplay]));
    } else if (section.type === "education") {
      for (const item of section.items) {
        paragraph(joined([[item.credential, item.field].filter(Boolean).join(" - "), item.institution, item.location, item.dateDisplay]));
        for (const detail of item.details) bullet(detail.text);
      }
    } else if (section.type === "languages") {
      paragraph(section.items.map((item) => [item.name, item.proficiency].filter(Boolean).join(" - ")).join(", "));
    } else {
      for (const item of section.items) paragraph(item.text);
    }
  }

  doc.setProperties({
    title: joined([renderPlan.header.fullName, renderPlan.header.headline], " - "),
    subject: "ATS-readable résumé generated from verified candidate content",
    creator: "Gigscapes",
  });
  return new Uint8Array(doc.output("arraybuffer"));
}

export async function createResumePdfBlob(input, template = "professional", options = {}) {
  const bytes = await createResumePdfBytes(input, template, options);
  return new Blob([bytes], { type: "application/pdf" });
}

export async function downloadResumePdf(input, template = "professional", options = {}) {
  const context = validateResumeExportContext(input);
  const resumePackage = context.resumePackage;
  assertResumePackageIdentity(resumePackage);
  const blob = await createResumePdfBlob(context, template, options);
  const preliminary = context.readiness.preliminary;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safeResumeFilenameFromPackage(resumePackage, "pdf", { preliminary });
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
  Object.assign(frame.style, { position: "fixed", right: "0", bottom: "0", width: "1px", height: "1px", border: "0", opacity: "0", pointerEvents: "none" });
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
    // The export uses ATS-safe system font fallbacks.
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
