import {
  assertResumePackageIdentity,
  buildResumeRenderPlan,
  createResumePackage,
  safeResumeFilenameFromPackage,
  serializeApprovedValue,
} from "./resumeModel.js";
import { validateResumeExportContext } from "./resumeReadiness.js";

const DOCX_TEXT_KEYS = [
  "value", "name", "title", "headline", "role", "position", "email", "phone", "location",
  "address", "city", "region", "province", "state", "country", "website", "linkedin", "url",
  "description", "summary", "content", "bullet", "statement", "skill", "language", "proficiency",
  "dates", "date", "period", "year", "provider", "issuer", "institution", "school", "company", "employer",
];

let docxModulePromise;

export function prepareResumeDocxExport() {
  docxModulePromise ||= import("docx").catch((error) => {
    docxModulePromise = undefined;
    throw error;
  });
  return docxModulePromise;
}

export function serializeDocxText(value, seen = new Set()) {
  return serializeApprovedValue(value, { keys: ["text", ...DOCX_TEXT_KEYS], seen });
}

function text(value, options = {}) {
  return { text: serializeDocxText(value), ...options };
}

export function normalizeDocxRuns(content) {
  const values = Array.isArray(content) ? content : [content];
  return values.map((value) => {
    if (value && typeof value === "object" && !Array.isArray(value) && Object.prototype.hasOwnProperty.call(value, "text")) {
      return { ...value, text: serializeDocxText(value.text) };
    }
    return text(value);
  });
}

function resolveRenderPlan(input, template, options) {
  if (input?.kind === "resume-export-context") return validateResumeExportContext(input).renderPlan;
  if (input?.kind === "resume-render-plan") return input;
  const resumePackage = createResumePackage(input);
  return buildResumeRenderPlan(resumePackage, template, options);
}

function entryHeader(...values) {
  return values.map((value) => serializeDocxText(value).trim()).filter(Boolean).join(" | ");
}

export async function createResumeDocxBlob(input, template = "professional", options = {}) {
  const renderPlan = resolveRenderPlan(input, template, options);
  assertResumePackageIdentity(createResumePackage({ name: renderPlan.header.fullName }));
  const {
    AlignmentType,
    Document,
    HeadingLevel,
    Packer,
    Paragraph,
    ShadingType,
    TextRun,
  } = await prepareResumeDocxExport();

  const tokens = renderPlan.visualTokens;
  const rhythm = tokens.verticalRhythmScale || 1;
  const space = (value) => Math.round(value * rhythm);
  const color = (value, fallback = "111111") => String(value || fallback).replace("#", "").toUpperCase();
  const headerAlignment = tokens.headerAlignment === "left" ? AlignmentType.LEFT : AlignmentType.CENTER;
  const headerBand = tokens.headerTreatment === "accent-band";
  const children = [];
  const addParagraph = (content, paragraphOptions = {}) => {
    const runs = normalizeDocxRuns(content);
    children.push(new Paragraph({ ...paragraphOptions, children: runs.map((run) => new TextRun(run)) }));
  };
  const addHeading = (heading) => {
    const treatment = tokens.sectionTreatment || "underline";
    const border = treatment === "accent-edge"
      ? { left: { color: color(tokens.accent), size: 18, space: 8, style: "single" } }
      : treatment === "compact-rule"
        ? { bottom: { color: color(tokens.accent), size: 10, space: 4, style: "single" } }
        : treatment === "editorial"
          ? { bottom: { color: color(tokens.accent), size: 5, space: 4, style: "single" } }
          : treatment === "label-rule"
            ? { bottom: { color: color(tokens.accent), size: 10, space: 4, style: "single" } }
            : treatment === "civic-label"
              ? { bottom: { color: color(tokens.accent), size: 8, space: 4, style: "double" } }
              : treatment === "editorial-v2"
                ? { bottom: { color: color(tokens.rule), size: 5, space: 4, style: "single" } }
          : treatment === "soft-band"
            ? undefined
            : { bottom: { color: "B8B8B8", size: 4, space: 4, style: "single" } };
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: space(treatment === "compact-rule" ? 150 : 220), after: space(80) },
      keepNext: true,
      border,
      shading: treatment === "soft-band" ? { type: ShadingType.CLEAR, color: "auto", fill: color(tokens.accentSoft, "F3F4F6") } : undefined,
      indent: treatment === "accent-edge" ? { left: 100 } : undefined,
      children: [new TextRun({
        text: serializeDocxText(heading),
        bold: true,
        font: tokens.docxDisplayFontFamily || tokens.docxFontFamily,
        size: Math.round(tokens.sectionFontSizePt * 2),
        color: color(tokens.accent),
        allCaps: tokens.sectionTextTransform !== "none",
      })],
    }));
  };
  const addBullet = (value, options = {}) => addParagraph(value, {
    bullet: { level: 0 },
    spacing: { after: space(40) },
    keepLines: true,
    ...options,
  });

  const headerRows = [
    { kind: "name", value: renderPlan.header.fullName, run: { bold: true, font: tokens.docxDisplayFontFamily || tokens.docxFontFamily, size: Math.round(tokens.nameFontSizePt * 2) }, after: 35 },
    ...(renderPlan.header.headline ? [{ kind: "headline", value: renderPlan.header.headline, run: { bold: true, size: Math.round(tokens.headlineFontSizePt * 2) }, after: 25 }] : []),
    ...(renderPlan.header.contactLine ? [{ kind: "contact", value: renderPlan.header.contactLine, run: { size: 18 }, after: 100 }] : []),
  ];
  headerRows.forEach((row, index) => {
    const isLast = index === headerRows.length - 1;
    const border = tokens.headerTreatment === "accent-edge"
      ? { left: { color: color(tokens.accent), size: 24, space: 10, style: "single" } }
      : !headerBand && isLast
        ? {
            ...(["keyline", "editorial-v2"].includes(tokens.headerTreatment) ? { top: { color: color(tokens.accent), size: tokens.headerTreatment === "keyline" ? 20 : 8, space: 5, style: "single" } } : {}),
            bottom: { color: color(["editorial", "civic-rule"].includes(tokens.headerTreatment) ? tokens.accent : ["keyline", "editorial-v2"].includes(tokens.headerTreatment) ? tokens.rule : tokens.ink), size: tokens.headerTreatment === "compact-rule" ? 12 : 8, space: 6, style: tokens.headerTreatment === "civic-rule" ? "double" : "single" },
          }
        : undefined;
    addParagraph(text(row.value, {
      ...row.run,
      font: row.run.font || tokens.docxBodyFontFamily || tokens.docxFontFamily,
      color: color(headerBand ? tokens.headerText : row.kind === "headline" ? tokens.accent : row.kind === "contact" ? tokens.muted : tokens.ink),
    }), {
      alignment: headerAlignment,
      spacing: { after: space(isLast ? row.after : headerBand ? 15 : row.after) },
      keepNext: !isLast,
      border,
      shading: headerBand ? { type: ShadingType.CLEAR, color: "auto", fill: color(tokens.headerBackground, color(tokens.accent)) } : undefined,
      indent: tokens.headerTreatment === "accent-edge" ? { left: 120 } : undefined,
    });
  });
  for (const section of renderPlan.sections) {
    addHeading(section.heading);
    if (section.type === "paragraph") {
      for (const item of section.items) addParagraph(item.text, { spacing: { after: space(80) }, keepLines: true });
    } else if (section.type === "inline-list") {
      addParagraph(section.items.map((item) => item.text).join(" | "), { spacing: { after: space(80) }, keepLines: true });
    } else if (section.type === "experience") {
      for (const entry of section.items) {
        const title = [entry.title, entry.employer].filter(Boolean).join(" - ");
        addParagraph(text(entryHeader(title, entry.location, entry.dateDisplay), { bold: true }), {
          keepNext: entry.bullets.length > 0,
          spacing: { before: space(80), after: space(40) },
        });
        for (const bullet of entry.bullets) addBullet(bullet.text);
      }
    } else if (section.type === "projects") {
      for (const project of section.items) {
        const heading = [project.name, project.organization].filter(Boolean).join(" - ");
        if (heading) addParagraph(text(heading, { bold: true }), { keepNext: Boolean(project.description || project.bullets.length), spacing: { before: space(80), after: space(30) } });
        const dates = [project.startDate, project.endDate].filter(Boolean).join(" - ");
        if (dates) addParagraph(text(dates, { italics: true }), { spacing: { after: space(30) }, keepNext: Boolean(project.description || project.bullets.length) });
        if (project.description) addParagraph(project.description, {
          spacing: { after: space(35) },
          keepLines: true,
          keepNext: project.bullets.length > 0,
        });
        project.bullets.forEach((bullet, index) => addBullet(bullet.text, {
          keepNext: index < project.bullets.length - 1,
        }));
      }
    } else if (section.type === "credentials") {
      for (const credential of section.items) addParagraph(entryHeader(credential.name, credential.issuer, credential.dateDisplay), { spacing: { after: space(40) }, keepLines: true });
    } else if (section.type === "education") {
      for (const education of section.items) {
        addParagraph(entryHeader([education.credential, education.field].filter(Boolean).join(" - "), education.institution, education.location, education.dateDisplay), { spacing: { after: space(education.details.length ? 20 : 40) }, keepNext: education.details.length > 0 });
        for (const detail of education.details) addBullet(detail.text);
      }
    } else if (section.type === "languages") {
      addParagraph(section.items.map((language) => [language.name, language.proficiency].filter(Boolean).join(" - ")).join(", "), { spacing: { after: space(40) }, keepLines: true });
    } else {
      for (const item of section.items) addParagraph(item.text, { spacing: { after: space(40) }, keepLines: true });
    }
  }

  const document = new Document({
    creator: "Gigscapes",
    lastModifiedBy: "Gigscapes",
    title: [renderPlan.header.fullName, renderPlan.header.headline].filter(Boolean).join(" - "),
    description: "ATS-readable résumé generated from verified candidate content.",
    styles: {
      default: { document: { run: { font: tokens.docxBodyFontFamily || tokens.docxFontFamily, size: Math.round(tokens.bodyFontSizePt * 2), color: color(tokens.ink) }, paragraph: { spacing: { line: Math.round(tokens.bodyFontSizePt * tokens.bodyLineHeight * 20) } } } },
      paragraphStyles: [{
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { font: tokens.docxDisplayFontFamily || tokens.docxFontFamily, size: Math.round(tokens.sectionFontSizePt * 2), bold: true, color: color(tokens.accent) },
      }],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: {
            top: Math.round(tokens.marginTopIn * 1440),
            right: Math.round(tokens.marginRightIn * 1440),
            bottom: Math.round(tokens.marginBottomIn * 1440),
            left: Math.round(tokens.marginLeftIn * 1440),
          },
        },
      },
      children,
    }],
  });
  return Packer.toBlob(document);
}

export async function downloadResumeDocx(input, template = "professional", options = {}) {
  const context = validateResumeExportContext(input);
  const resumePackage = context.resumePackage;
  assertResumePackageIdentity(resumePackage);
  const blob = await createResumeDocxBlob(context, template, options);
  const preliminary = context.readiness.preliminary;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safeResumeFilenameFromPackage(resumePackage, "docx", { preliminary });
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
