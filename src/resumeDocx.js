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
  } = await import("docx");

  const children = [];
  const addParagraph = (content, paragraphOptions = {}) => {
    const runs = normalizeDocxRuns(content);
    children.push(new Paragraph({ ...paragraphOptions, children: runs.map((run) => new TextRun(run)) }));
  };
  const addHeading = (heading) => {
    children.push(new Paragraph({
      text: serializeDocxText(heading),
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 220, after: 80 },
      keepNext: true,
      border: { bottom: { color: "B8B8B8", size: 4, space: 4, style: "single" } },
    }));
  };
  const addBullet = (value) => addParagraph(value, { bullet: { level: 0 }, spacing: { after: 40 }, keepLines: true });

  addParagraph(text(renderPlan.header.fullName, { bold: true, size: 32 }), { alignment: AlignmentType.CENTER, spacing: { after: 50 }, keepNext: true });
  if (renderPlan.header.headline) addParagraph(text(renderPlan.header.headline, { bold: true, size: 22 }), { alignment: AlignmentType.CENTER, keepNext: true });
  if (renderPlan.header.contactLine) addParagraph(renderPlan.header.contactLine, { alignment: AlignmentType.CENTER, spacing: { after: 100 }, keepNext: true });
  if (renderPlan.preliminaryNotice) {
    addParagraph(text(renderPlan.preliminaryNotice, { bold: true, color: "8A4B08", size: 18 }), {
      alignment: AlignmentType.CENTER,
      spacing: { before: 70, after: 120 },
      shading: { type: ShadingType.CLEAR, color: "auto", fill: "FFF2CC" },
      keepNext: true,
    });
  }

  for (const section of renderPlan.sections) {
    addHeading(section.heading);
    if (section.type === "paragraph") {
      for (const item of section.items) addParagraph(item.text, { spacing: { after: 80 }, keepLines: true });
    } else if (section.type === "inline-list") {
      addParagraph(section.items.map((item) => item.text).join(" | "), { spacing: { after: 80 }, keepLines: true });
    } else if (section.type === "experience") {
      for (const entry of section.items) {
        const title = [entry.title, entry.employer].filter(Boolean).join(" - ");
        addParagraph(text(entryHeader(title, entry.location, entry.dateDisplay), { bold: true }), {
          keepNext: entry.bullets.length > 0,
          spacing: { before: 80, after: 40 },
        });
        for (const bullet of entry.bullets) addBullet(bullet.text);
      }
    } else if (section.type === "projects") {
      for (const project of section.items) {
        const heading = [project.name, project.organization].filter(Boolean).join(" - ");
        if (heading) addParagraph(text(heading, { bold: true }), { keepNext: Boolean(project.description || project.bullets.length), spacing: { before: 80, after: 30 } });
        const dates = [project.startDate, project.endDate].filter(Boolean).join(" - ");
        if (dates) addParagraph(text(dates, { italics: true }), { spacing: { after: 30 }, keepNext: Boolean(project.description || project.bullets.length) });
        if (project.description) addParagraph(project.description, { spacing: { after: 35 }, keepLines: true });
        for (const bullet of project.bullets) addBullet(bullet.text);
      }
    } else if (section.type === "credentials") {
      for (const credential of section.items) addParagraph(entryHeader(credential.name, credential.issuer, credential.dateDisplay), { spacing: { after: 40 }, keepLines: true });
    } else if (section.type === "education") {
      for (const education of section.items) {
        addParagraph(entryHeader([education.credential, education.field].filter(Boolean).join(" - "), education.institution, education.location, education.dateDisplay), { spacing: { after: education.details.length ? 20 : 40 }, keepNext: education.details.length > 0 });
        for (const detail of education.details) addBullet(detail.text);
      }
    } else if (section.type === "languages") {
      addParagraph(section.items.map((language) => [language.name, language.proficiency].filter(Boolean).join(" - ")).join(", "), { spacing: { after: 40 }, keepLines: true });
    } else {
      for (const item of section.items) addParagraph(item.text, { spacing: { after: 40 }, keepLines: true });
    }
  }

  const tokens = renderPlan.visualTokens;
  const document = new Document({
    creator: "Gigscapes",
    lastModifiedBy: "Gigscapes",
    title: [renderPlan.header.fullName, renderPlan.header.headline].filter(Boolean).join(" - "),
    description: "ATS-readable résumé generated from verified candidate content.",
    styles: {
      default: { document: { run: { font: "Arial", size: 20, color: "111111" }, paragraph: { spacing: { line: 260 } } } },
      paragraphStyles: [{
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { font: "Arial", size: 21, bold: true, color: tokens.accent.replace("#", "").toUpperCase() },
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
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
