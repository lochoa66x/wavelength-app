function safeFilename(value) {
  const cleaned = String(value || "tailored-resume")
    .normalize("NFKD")
    .replace(/[^a-z0-9 -]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
  return cleaned || "tailored-resume";
}

function text(value, options = {}) {
  return { text: String(value || ""), ...options };
}

const PLACEHOLDER_IDENTITY = /^(?:<\s*)?(?:unknown|unnamed|name unavailable|candidate|n\/?a|null|undefined)(?:\s*>)?$/i;

export async function createResumeDocxBlob(resumeData, template = "professional") {
  const candidateName = String(resumeData?.name || "").trim();
  if (!candidateName || PLACEHOLDER_IDENTITY.test(candidateName)) {
    throw new Error("Candidate name is required before DOCX export.");
  }
  const {
    AlignmentType,
    Document,
    HeadingLevel,
    Packer,
    Paragraph,
    TextRun,
  } = await import("docx");

  const children = [];
  const addParagraph = (content, options = {}) => {
    const runs = Array.isArray(content) ? content : [text(content)];
    children.push(new Paragraph({ ...options, children: runs.map((run) => new TextRun(run)) }));
  };
  const addHeading = (heading) => {
    children.push(new Paragraph({
      text: heading,
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 220, after: 80 },
      border: { bottom: { color: "B8B8B8", size: 4, space: 4, style: "single" } },
    }));
  };
  const addSkills = () => {
    if (!resumeData.skills?.length) return;
    addHeading(template === "trades" ? "SKILLS & EQUIPMENT" : template === "career-change" ? "RELEVANT CAPABILITIES" : "SKILLS");
    addParagraph(resumeData.skills.join(" | "), { spacing: { after: 80 } });
  };
  const addExperience = () => {
    if (!resumeData.experience?.length) return;
    addHeading(template === "career-change" ? "PROFESSIONAL EXPERIENCE" : "EXPERIENCE");
    for (const entry of resumeData.experience) {
      const header = [entry.role, entry.company].filter(Boolean).join(" — ");
      addParagraph([
        text(header, { bold: true }),
        ...(entry.dates ? [text(`    ${entry.dates}`, { italics: true })] : []),
      ], { keepNext: true, spacing: { before: 80, after: 40 } });
      for (const bullet of entry.bullets || []) {
        addParagraph(bullet, { bullet: { level: 0 }, spacing: { after: 40 }, keepLines: true });
      }
    }
  };
  const addProjects = () => {
    if (!resumeData.projects?.length) return;
    addHeading("PROJECTS");
    for (const project of resumeData.projects) {
      addParagraph(text(project.name, { bold: true }), { keepNext: true, spacing: { before: 80, after: 30 } });
      if (project.description) addParagraph(project.description, { spacing: { after: 35 }, keepLines: true });
      for (const bullet of project.bullets || []) addParagraph(bullet, { bullet: { level: 0 }, spacing: { after: 40 }, keepLines: true });
    }
  };
  const addTraining = () => {
    if (!resumeData.training?.length) return;
    addHeading("TRAINING & CERTIFICATIONS");
    for (const training of resumeData.training) addParagraph([training.name, training.provider, training.dates].filter(Boolean).join(" — "));
  };

  if (candidateName) {
    addParagraph(text(candidateName, { bold: true, size: 32 }), {
      alignment: AlignmentType.CENTER,
      spacing: { after: 50 },
    });
  }
  if (resumeData.title) addParagraph(text(resumeData.title, { bold: true, size: 22 }), { alignment: AlignmentType.CENTER });
  if (resumeData.contact) addParagraph(resumeData.contact, { alignment: AlignmentType.CENTER, spacing: { after: 140 } });
  if (resumeData.profile) {
    addHeading(template === "career-change" ? "CAREER TRANSITION SUMMARY" : "PROFESSIONAL SUMMARY");
    addParagraph(resumeData.profile, { spacing: { after: 80 } });
  }

  if (template === "trades") {
    if (resumeData.certifications?.length) {
      addHeading("CERTIFICATIONS & LICENSES");
      for (const credential of resumeData.certifications) {
        addParagraph([credential.name, credential.issuer, credential.year].filter(Boolean).join(" — "));
      }
    }
    if (resumeData.safety_record || resumeData.safety_certifications?.length) {
      addHeading("SAFETY TRAINING");
      if (resumeData.safety_record) addParagraph(resumeData.safety_record);
      if (resumeData.safety_certifications?.length) addParagraph(resumeData.safety_certifications.join(" | "));
    }
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

  if (resumeData.education?.length) {
    addHeading("EDUCATION");
    for (const education of resumeData.education) {
      addParagraph([education.degree, education.institution, education.dates].filter(Boolean).join(" — "));
    }
  }
  if (resumeData.languages?.length) {
    addHeading("LANGUAGES");
    addParagraph(resumeData.languages.join(", "));
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
          margin: { top: 720, right: 720, bottom: 720, left: 720 },
        },
      },
      children,
    }],
  });
  return Packer.toBlob(document);
}

export async function downloadResumeDocx(resumeData, template = "professional") {
  const blob = await createResumeDocxBlob(resumeData, template);
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeFilename(`${resumeData.name || "candidate"}-${resumeData.title || "tailored-resume"}`)}.docx`;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
