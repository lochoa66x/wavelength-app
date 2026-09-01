import {
  assertResumePackageIdentity,
  buildResumeRenderPlan,
  cleanScalar,
  createResumePackage,
  safeResumeFilenameFromPackage,
} from "./resumeModel.js";
import { validateResumeExportContext } from "./resumeReadiness.js";

let pdfModulePromise;

export function prepareResumePdfExport() {
  pdfModulePromise ||= import("jspdf").catch((error) => {
    pdfModulePromise = undefined;
    throw error;
  });
  return pdfModulePromise;
}

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

async function createResumePdfDocument(input, template = "professional", options = {}, { allowMissingIdentity = false } = {}) {
  const renderPlan = resolveRenderPlan(input, template, options);
  if (!allowMissingIdentity) assertResumePackageIdentity(createResumePackage({ name: renderPlan.header.fullName }));
  const { jsPDF } = await prepareResumePdfExport();
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
  const rgb = (value, fallback = [23, 25, 28]) => String(value || "").match(/[a-f\d]{2}/gi)?.slice(0, 3).map((entry) => Number.parseInt(entry, 16)) || fallback;
  const accent = rgb(tokens.accent, [29, 95, 122]);
  const accentSoft = rgb(tokens.accentSoft, [237, 244, 247]);
  const headerBackground = rgb(tokens.headerBackground, accent);
  const headerText = rgb(tokens.headerText, [255, 255, 255]);
  const pdfFont = tokens.pdfBodyFontFamily || tokens.pdfFontFamily || "helvetica";
  const pdfDisplayFont = tokens.pdfDisplayFontFamily || tokens.pdfFontFamily || pdfFont;
  const rhythm = tokens.verticalRhythmScale || 1;
  const gap = (value) => value * rhythm;
  const bodyLeading = tokens.bodyFontSizePt * tokens.bodyLineHeight;
  let y = page.top;

  const newPage = () => {
    doc.addPage("letter", "portrait");
    y = page.top;
  };
  const ensureSpace = (height) => {
    if (y + height > page.height - page.bottom) newPage();
  };
  const wrappedLines = (value, width, size = tokens.bodyFontSizePt, style = "normal", font = pdfFont) => {
    doc.setFont(font, style);
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
    font = pdfFont,
  } = {}) => {
    doc.setFont(font, style);
    doc.setTextColor(...color);
    doc.setFontSize(size);
    const lines = wrappedLines(value, width, size, style, font);
    if (!lines.length) return 0;
    const height = lines.length * leading;
    if (ensure) ensureSpace(height + after);
    const textX = align === "center" ? page.width / 2 : x;
    doc.text(lines, textX, y, { baseline: "top", align, lineHeightFactor: leading / size });
    y += height + after;
    return height + after;
  };
  const heading = (value) => {
    const treatment = tokens.sectionTreatment || "underline";
    // Keep the selectable text identical to the canonical manifest. Browser
    // and DOCX may apply visual capitalization without rewriting content.
    const headingText = value;
    const headingLeading = tokens.sectionFontSizePt * 1.2;
    const lines = wrappedLines(headingText, treatment === "accent-edge" ? contentWidth - 10 : contentWidth, tokens.sectionFontSizePt, "bold", pdfDisplayFont);
    const textHeight = Math.max(headingLeading, lines.length * headingLeading);
    ensureSpace(textHeight + 26);
    y += gap(treatment === "compact-rule" ? 7 : 10);
    if (treatment === "soft-band") {
      doc.setFillColor(...accentSoft);
      doc.rect(page.left, y - 3, contentWidth, textHeight + 6, "F");
      writeLines(headingText, { x: page.left + 7, width: contentWidth - 14, size: tokens.sectionFontSizePt, style: "bold", color: accent, leading: headingLeading, after: gap(8), ensure: false, font: pdfDisplayFont });
      return;
    }
    if (treatment === "accent-edge") {
      doc.setDrawColor(...accent);
      doc.setLineWidth(3);
      doc.line(page.left + 1.5, y - 1, page.left + 1.5, y + textHeight - 1);
      writeLines(headingText, { x: page.left + 10, width: contentWidth - 10, size: tokens.sectionFontSizePt, style: "bold", color: accent, leading: headingLeading, after: gap(7), ensure: false, font: pdfDisplayFont });
      return;
    }
    writeLines(headingText, { size: tokens.sectionFontSizePt, style: "bold", color: accent, leading: headingLeading, after: gap(4), ensure: false, font: pdfDisplayFont });
    doc.setDrawColor(...(["underline", "editorial-v2"].includes(treatment) ? rgb(tokens.rule, [201, 205, 209]) : accent));
    doc.setLineWidth(treatment === "compact-rule" || treatment === "label-rule" ? 1.15 : 0.6);
    doc.line(page.left, y, page.width - page.right, y);
    if (treatment === "civic-label") doc.line(page.left, y + 2.5, page.width - page.right, y + 2.5);
    y += gap(treatment === "compact-rule" ? 5 : 7);
  };
  const paragraph = (value, overrides = {}) => writeLines(value, { size: tokens.bodyFontSizePt, leading: bodyLeading, after: gap(4), ...overrides });
  const bullet = (value) => {
    const bulletX = page.left + 2;
    const textX = page.left + 14;
    const width = page.width - page.right - textX;
    const lines = wrappedLines(value, width, tokens.bodyFontSizePt);
    if (!lines.length) return;
    const height = lines.length * bodyLeading;
    ensureSpace(height + gap(4));
    doc.setFont(pdfFont, "normal");
    doc.setFontSize(tokens.bodyFontSizePt);
    doc.setTextColor(23, 25, 28);
    doc.text("-", bulletX, y, { baseline: "top" });
    doc.text(lines, textX, y, { baseline: "top", lineHeightFactor: tokens.bodyLineHeight });
    y += height + gap(4);
  };
  const projectBlockHeight = (project) => {
    const projectHeading = [project.name, project.organization].filter(Boolean).join(" - ");
    const dates = [project.startDate, project.endDate].filter(Boolean).join(" - ");
    return [
      projectHeading ? wrappedLines(projectHeading, contentWidth, 10.2).length * (10.2 * tokens.bodyLineHeight) + 3 : 0,
      dates ? wrappedLines(dates, contentWidth).length * bodyLeading + 4 : 0,
      project.description ? wrappedLines(project.description, contentWidth).length * bodyLeading + 4 : 0,
      ...project.bullets.map((value) => wrappedLines(value.text, contentWidth - 14).length * bodyLeading + 4),
    ].reduce((total, height) => total + height, 0);
  };
  const firstSectionBlockHeight = (section) => {
    const first = section.items[0];
    if (!first) return 0;
    if (section.type === "paragraph") return wrappedLines(first.text, contentWidth).length * bodyLeading + 4;
    if (section.type === "inline-list") return wrappedLines(section.items.map((item) => item.text).join(" | "), contentWidth).length * bodyLeading + 4;
    if (section.type === "experience") {
      const firstBullet = first.bullets[0]?.text || "";
      return 19 + wrappedLines(firstBullet, contentWidth - 14).length * bodyLeading;
    }
    if (section.type === "projects") {
      // Keep a small renderer buffer so the section heading and the first
      // compact project move together instead of splitting by a few points.
      return projectBlockHeight(first) + 10;
    }
    if (section.type === "credentials") return wrappedLines(joined([first.name, first.issuer, first.dateDisplay]), contentWidth).length * bodyLeading + 4;
    if (section.type === "education") {
      const educationLine = joined([[first.credential, first.field].filter(Boolean).join(" - "), first.institution, first.location, first.dateDisplay]);
      return wrappedLines(educationLine, contentWidth).length * bodyLeading + 4;
    }
    if (section.type === "languages") {
      const languages = section.items.map((item) => [item.name, item.proficiency].filter(Boolean).join(" - ")).join(", ");
      return wrappedLines(languages, contentWidth).length * bodyLeading + 4;
    }
    return wrappedLines(first.text, contentWidth).length * bodyLeading + 4;
  };

  const headerAlign = tokens.headerAlignment === "left" ? "left" : "center";
  const headerX = headerAlign === "center" ? page.width / 2 : page.left;
  const headerBand = tokens.headerTreatment === "accent-band";
  const headerRows = [
    { value: renderPlan.header.fullName, size: tokens.nameFontSizePt, style: "bold", leading: tokens.nameFontSizePt * 1.15, after: 4, color: headerBand ? headerText : rgb(tokens.ink), font: pdfDisplayFont },
    ...(renderPlan.header.headline ? [{ value: renderPlan.header.headline, size: tokens.headlineFontSizePt, style: "bold", leading: tokens.headlineFontSizePt * 1.25, after: 3, color: headerBand ? headerText : accent }] : []),
    ...(renderPlan.header.contactLine ? [{ value: renderPlan.header.contactLine, size: 9.2, style: "normal", leading: 11.5, after: 8, color: headerBand ? headerText : rgb(tokens.muted, [65, 65, 70]) }] : []),
  ];
  const headerHeight = headerRows.reduce((total, row) => total + Math.max(row.leading, wrappedLines(row.value, contentWidth - (headerBand ? 24 : 0), row.size, row.style, row.font || pdfFont).length * row.leading) + row.after, 0);
  if (headerBand) {
    doc.setFillColor(...headerBackground);
    doc.rect(page.left, y - 8, contentWidth, headerHeight + 16, "F");
    y += 4;
  }
  if (tokens.headerTreatment === "accent-edge") {
    doc.setDrawColor(...accent);
    doc.setLineWidth(4);
    doc.line(page.left + 2, y, page.left + 2, y + headerHeight - 2);
  }
  if (["keyline", "editorial-v2"].includes(tokens.headerTreatment)) {
    doc.setDrawColor(...accent);
    doc.setLineWidth(tokens.headerTreatment === "keyline" ? 2.5 : 1);
    doc.line(page.left, y, page.width - page.right, y);
    y += 8;
  }
  for (const row of headerRows) {
    writeLines(row.value, {
      x: headerX + (tokens.headerTreatment === "accent-edge" ? 12 : headerBand && headerAlign === "left" ? 10 : 0),
      width: contentWidth - (tokens.headerTreatment === "accent-edge" ? 12 : headerBand ? 20 : 0),
      size: row.size,
      style: row.style,
      color: row.color,
      leading: row.leading,
      after: row.after,
      align: headerAlign,
      ensure: false,
      font: row.font || pdfFont,
    });
  }
  if (!headerBand && tokens.headerTreatment !== "accent-edge") {
    doc.setDrawColor(...(["editorial", "civic-rule"].includes(tokens.headerTreatment) ? accent : ["keyline", "editorial-v2"].includes(tokens.headerTreatment) ? rgb(tokens.rule) : rgb(tokens.ink)));
    doc.setLineWidth(tokens.headerTreatment === "compact-rule" ? 1.2 : ["editorial", "editorial-v2", "keyline"].includes(tokens.headerTreatment) ? 0.6 : tokens.headerTreatment === "civic-rule" ? 1 : 1.4);
    doc.line(page.left, y, page.width - page.right, y);
    if (tokens.headerTreatment === "civic-rule") doc.line(page.left, y + 3, page.width - page.right, y + 3);
    y += 7;
  } else {
    y += 5;
  }
  for (const section of renderPlan.sections) {
    const compactProjectsHeight = section.type === "projects" && section.items.every((project) => project.bullets.length <= 3)
      ? section.items.reduce((total, project) => total + projectBlockHeight(project), 0) + 10
      : 0;
    const leadBlockHeight = compactProjectsHeight > 0 && compactProjectsHeight <= page.height - page.top - page.bottom - 34
      ? compactProjectsHeight
      : firstSectionBlockHeight(section);
    ensureSpace(34 + leadBlockHeight);
    heading(section.heading);
    if (section.type === "paragraph") {
      for (const item of section.items) paragraph(item.text);
    } else if (section.type === "inline-list") {
      paragraph(section.items.map((item) => item.text).join(" | "));
    } else if (section.type === "experience") {
      for (const entry of section.items) {
        const firstBullet = entry.bullets[0]?.text || "";
        ensureSpace(19 + wrappedLines(firstBullet, contentWidth - 14).length * bodyLeading);
        writeLines(joined([[entry.title, entry.employer].filter(Boolean).join(" - "), entry.location, entry.dateDisplay]), { size: 10.2, style: "bold", leading: 10.2 * tokens.bodyLineHeight, after: 3, ensure: false });
        for (const value of entry.bullets) bullet(value.text);
        y += 2;
      }
    } else if (section.type === "projects") {
      for (const project of section.items) {
        const blockHeight = projectBlockHeight(project);
        if (blockHeight <= page.height - page.top - page.bottom) ensureSpace(blockHeight);
        const projectHeading = [project.name, project.organization].filter(Boolean).join(" - ");
        if (projectHeading) writeLines(projectHeading, { size: 10.2, style: "bold", leading: 10.2 * tokens.bodyLineHeight, after: 3, ensure: false });
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
  return doc;
}

export async function getResumePdfPageCount(input, template = "professional", options = {}) {
  const doc = await createResumePdfDocument(input, template, options, { allowMissingIdentity: true });
  return doc.getNumberOfPages();
}

export async function createResumePdfBytes(input, template = "professional", options = {}) {
  const doc = await createResumePdfDocument(input, template, options);
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
