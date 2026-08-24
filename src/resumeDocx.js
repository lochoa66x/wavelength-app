import {
  PRELIMINARY_EXPORT_NOTICE,
  assertResumeExportIdentity,
  normalizeResumeForExport,
  safeResumeFilename,
  serializeExportText,
} from "./resumeExport.js";

const DOCX_TEXT_KEYS = [
  "value", "name", "title", "headline", "role", "position", "email", "phone", "location",
  "address", "city", "region", "province", "state", "country", "website", "linkedin", "url",
  "description", "summary", "content", "bullet", "statement", "skill", "language", "proficiency",
  "dates", "date", "period", "year", "provider", "issuer", "institution", "school", "company", "employer",
];

export function serializeDocxText(value, seen = new Set()) {
  return serializeExportText(value, { keys: ["text", ...DOCX_TEXT_KEYS], seen });
}

function joinText(values, separator = " - ") {
  return values.map((value) => serializeDocxText(value).trim()).filter(Boolean).join(separator);
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

export async function createResumeDocxBlob(resumeData, template = "professional", options = {}) {
  assertResumeExportIdentity(resumeData);
  const resume = normalizeResumeForExport(resumeData);
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
      text: heading,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 220, after: 80 },
      keepNext: true,
      border: { bottom: { color: "B8B8B8", size: 4, space: 4, style: "single" } },
    }));
  };
  const addSkills = () => {
    if (!resume.skills.length) return;
    addHeading("Skills");
    addParagraph(joinText(resume.skills, " | "), { spacing: { after: 80 }, keepLines: true });
  };
  const addExperience = () => {
    if (!resume.experience.length) return;
    addHeading("Professional Experience");
    for (const entry of resume.experience) {
      const header = joinText([entry.role, entry.company]);
      addParagraph([
        text(header, { bold: true }),
        ...(entry.dates ? [text(` - ${entry.dates}`, { italics: true })] : []),
      ], { keepNext: entry.bullets.length > 0, spacing: { before: 80, after: 40 } });
      for (const bullet of entry.bullets) {
        addParagraph(bullet, { bullet: { level: 0 }, spacing: { after: 40 }, keepLines: true });
      }
    }
  };
  const addProjects = () => {
    if (!resume.projects.length) return;
    addHeading("Projects");
    for (const project of resume.projects) {
      if (project.name) addParagraph(text(project.name, { bold: true }), { keepNext: Boolean(project.description || project.bullets.length), spacing: { before: 80, after: 30 } });
      if (project.description) addParagraph(project.description, { spacing: { after: 35 }, keepLines: true });
      for (const bullet of project.bullets) addParagraph(bullet, { bullet: { level: 0 }, spacing: { after: 40 }, keepLines: true });
    }
  };
  const addTraining = () => {
    if (!resume.training.length) return;
    addHeading("Training & Certifications");
    for (const training of resume.training) addParagraph(joinText([training.name, training.provider, training.dates]));
  };
  const addCertifications = () => {
    if (!resume.certifications.length) return;
    addHeading("Certifications & Licenses");
    for (const credential of resume.certifications) addParagraph(joinText([credential.name, credential.provider, credential.dates]));
  };
  const addSafety = () => {
    if (!resume.safety_record && !resume.safety_certifications.length) return;
    addHeading("Safety Training");
    if (resume.safety_record) addParagraph(resume.safety_record);
    if (resume.safety_certifications.length) addParagraph(joinText(resume.safety_certifications, " | "));
  };

  addParagraph(text(resume.name, { bold: true, size: 32 }), {
    alignment: AlignmentType.CENTER,
    spacing: { after: 50 },
    keepNext: true,
  });
  if (resume.title) addParagraph(text(resume.title, { bold: true, size: 22 }), { alignment: AlignmentType.CENTER, keepNext: true });
  if (resume.contact) addParagraph(resume.contact, { alignment: AlignmentType.CENTER, spacing: { after: 100 }, keepNext: true });
  if (options.preliminary) {
    addParagraph(text(PRELIMINARY_EXPORT_NOTICE, { bold: true, color: "8A4B08", size: 18 }), {
      alignment: AlignmentType.CENTER,
      spacing: { before: 70, after: 120 },
      shading: { type: ShadingType.CLEAR, color: "auto", fill: "FFF2CC" },
      keepNext: true,
    });
  }
  if (resume.profile) {
    addHeading("Professional Summary");
    addParagraph(resume.profile, { spacing: { after: 80 }, keepLines: true });
  }

  if (template === "trades") {
    addCertifications();
    addSafety();
    addExperience();
    addSkills();
  } else if (template === "career-change") {
    addProjects();
    addTraining();
    addSkills();
    addExperience();
  } else {
    addSkills();
    addProjects();
    addTraining();
    addExperience();
  }

  if (resume.education.length) {
    addHeading("Education");
    for (const education of resume.education) addParagraph(joinText([education.degree, education.institution, education.dates]));
  }
  if (resume.languages.length) {
    addHeading("Languages");
    addParagraph(joinText(resume.languages, ", "));
  }

  const document = new Document({
    styles: {
      default: { document: { run: { font: "Arial", size: 21, color: "111111" }, paragraph: { spacing: { line: 260 } } } },
      paragraphStyles: [{
        id: "Heading2",
        name: "Heading 2",
        basedOn: "Normal",
        next: "Normal",
        quickFormat: true,
        run: { font: "Arial", size: 22, bold: true, color: "111111" },
      }],
    },
    sections: [{
      properties: {
        page: {
          size: { width: 12240, height: 15840 },
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      children,
    }],
  });
  return Packer.toBlob(document);
}

export async function downloadResumeDocx(resumeData, template = "professional", options = {}) {
  const blob = await createResumeDocxBlob(resumeData, template, options);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = safeResumeFilename(resumeData, "docx", options);
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
