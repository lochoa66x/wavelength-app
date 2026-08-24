import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { createResumeDocxBlob } from "./resumeDocx.js";
import { manifestVisibleText, TEMPLATE_IDS } from "./resumeModel.js";
import { createResumePdfBytes } from "./resumePdf.js";
import { createResumeExportContext } from "./resumeReadiness.js";
import { resumeDataToPlainText } from "./resumeText.js";

const fixture = {
  name: "Avery Chen",
  title: "Senior SAP Functional Consultant",
  contact: "avery@example.com | 416-555-0199 | Toronto, Ontario",
  profile: "SAP functional consultant with verified requirements, configuration, integration, UAT, and delivery leadership experience.",
  skills: ["SAP S/4HANA", "FI-CA", "Requirements Gathering", "UAT", "Stakeholder Coordination"],
  experience: [{
    role: "Senior SAP Functional Consultant",
    company: "Example Consulting",
    dates: "2020 - Present",
    bullets: [
      "Led verified requirements workshops for an SAP finance transformation.",
      "Coordinated integration testing, UAT, and cutover preparation.",
    ],
  }, {
    role: "SAP Functional Analyst",
    company: "Example Services",
    dates: "2016 - 2020",
    bullets: ["Documented functional specifications and supported post-production issues."],
  }],
  projects: [{ name: "Finance Transformation", description: "Supported a verified enterprise rollout.", bullets: ["Prepared requirements and test evidence for release review."] }],
  training: [{ name: "SAP S/4HANA Learning", provider: "SAP", dates: "2024" }],
  certifications: [{ name: "Project Management Certificate", issuer: "Example Institute", year: "2022" }],
  education: [{ degree: "Bachelor of Commerce", institution: "Example University", dates: "2015" }],
  languages: [{ language: "English", proficiency: "Fluent" }],
  content_strategy: "direct",
};

const finalReview = {
  posting_readiness: { status: "reviewed_complete", fit_allowed: true, application_ready_allowed: true },
  readiness: { status: "strong_fit" },
  integrity: { status: "passed" },
  application_ready: true,
};

function normalizeText(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

async function docxVisibleText(blob) {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const xml = await zip.file("word/document.xml").async("string");
  return normalizeText(Array.from(xml.matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g), (match) => match[1])
    .join(" ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">"));
}

async function pdfVisibleText(bytes) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({
    data: bytes.slice(),
    disableWorker: true,
    standardFontDataUrl: `${fileURLToPath(new URL("../node_modules/pdfjs-dist/standard_fonts/", import.meta.url))}/`,
  });
  const pdf = await task.promise;
  const items = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    items.push(...content.items.filter((item) => typeof item.str === "string" && item.str.trim()).map((item) => item.str));
  }
  const result = { pages: pdf.numPages, text: normalizeText(items.join(" ")) };
  await task.destroy();
  return result;
}

for (const templateId of [
  TEMPLATE_IDS.ATS_CORE,
  TEMPLATE_IDS.SAP_FUNCTIONAL,
  TEMPLATE_IDS.PROJECT_LEADERSHIP,
  TEMPLATE_IDS.CAREER_TRANSITION,
  TEMPLATE_IDS.TECHNICAL_SOFTWARE,
  TEMPLATE_IDS.ADMIN_CUSTOMER_OPERATIONS,
  TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES,
  TEMPLATE_IDS.MARKETING_COMMUNICATIONS,
  TEMPLATE_IDS.CREATIVE_DESIGN,
]) {
  test(`${templateId} keeps DOCX, PDF, and text aligned with the canonical manifest`, async () => {
    const context = createResumeExportContext(fixture, finalReview, {
      item: { title: "SAP FICO Functional Consultant", company: "Example Bank", category: "tech" },
      templateId,
    });
    const [docxText, pdf] = await Promise.all([
      docxVisibleText(await createResumeDocxBlob(context)),
      pdfVisibleText(await createResumePdfBytes(context)),
    ]);
    const plainText = normalizeText(resumeDataToPlainText(context.renderPlan));
    const expectedVisibleValues = manifestVisibleText(context.renderPlan.manifest);

    for (const expected of expectedVisibleValues) {
      const normalized = normalizeText(expected);
      assert.ok(docxText.includes(normalized), `DOCX missing: ${normalized}`);
      assert.ok(pdf.text.includes(normalized), `PDF missing: ${normalized}`);
      assert.ok(plainText.toLowerCase().includes(normalized.toLowerCase()), `plain text missing: ${normalized}`);
    }

    for (const output of [docxText, pdf.text, plainText]) {
      let previous = -1;
      for (const section of context.renderPlan.sections) {
        const current = output.toLowerCase().indexOf(section.heading.toLowerCase(), previous + 1);
        assert.ok(current > previous, `${section.heading} is out of order for ${templateId}`);
        previous = current;
      }
      assert.doesNotMatch(output, /\[object Object\]|undefined|null|sourceReferences|recommendationTrace/i);
    }
    assert.ok(pdf.pages >= 1);
  });
}
