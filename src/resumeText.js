import { buildResumeRenderPlan, createResumePackage } from "./resumeModel.js";
import { validateResumeExportContext } from "./resumeReadiness.js";

function itemLines(section, item) {
  if (section.type === "experience") {
    const header = [item.title, item.employer].filter(Boolean).join(" - ");
    return [[header, item.location, item.dateDisplay].filter(Boolean).join(" | "), ...item.bullets.map((bullet) => `- ${bullet.text}`)];
  }
  if (section.type === "projects") {
    return [[item.name, item.organization].filter(Boolean).join(" - "), [item.startDate, item.endDate].filter(Boolean).join(" - "), item.description, ...item.bullets.map((bullet) => `- ${bullet.text}`)];
  }
  if (section.type === "credentials") return [[item.name, item.issuer, item.dateDisplay].filter(Boolean).join(" | ")];
  if (section.type === "education") {
    return [[item.credential, item.field].filter(Boolean).join(" - "), [item.institution, item.location, item.dateDisplay].filter(Boolean).join(" | "), ...item.details.map((detail) => `- ${detail.text}`)];
  }
  if (section.type === "languages") return [[item.name, item.proficiency].filter(Boolean).join(" - ")];
  return [item.text];
}

export function resumeRenderPlanToPlainText(renderPlan) {
  const lines = [renderPlan.header.fullName, renderPlan.header.headline, renderPlan.header.contactLine].filter(Boolean);
  if (renderPlan.preliminaryNotice) lines.push("", renderPlan.preliminaryNotice);
  for (const section of renderPlan.sections) {
    lines.push("", section.heading.toUpperCase());
    if (section.type === "inline-list") {
      lines.push(section.items.map((item) => item.text).join(" | "));
      continue;
    }
    for (const item of section.items) lines.push(...itemLines(section, item).filter(Boolean));
  }
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function resumeDataToPlainText(resumeData, template = "professional", options = {}) {
  const renderPlan = resumeData?.kind === "resume-render-plan"
    ? resumeData
    : resumeData?.kind === "resume-export-context"
      ? validateResumeExportContext(resumeData).renderPlan
      : buildResumeRenderPlan(createResumePackage(resumeData), template, options);
  return resumeRenderPlanToPlainText(renderPlan);
}
