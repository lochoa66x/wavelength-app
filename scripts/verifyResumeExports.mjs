import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { createResumeDocxBlob } from "../src/resumeDocx.js";
import { manifestVisibleText, TEMPLATE_IDS } from "../src/resumeModel.js";
import { createResumePdfBytes } from "../src/resumePdf.js";
import { createResumeExportContext, getResumeExportReadiness, validateResumeExportContext } from "../src/resumeReadiness.js";
import { resumeDataToPlainText } from "../src/resumeText.js";
import {
  adminCustomerOperationsResumeFixture,
  adminCustomerTargetItem,
  technicalSoftwareResumeFixture,
  technicalTargetItem,
} from "../tests/fixtures/resumePhaseBFixtures.js";

const keepArtifacts = process.argv.includes("--keep");
const root = fileURLToPath(new URL("..", import.meta.url));
const outputDir = fileURLToPath(new URL("../tmp/export-verification/", import.meta.url));
const standardFontDataUrl = `${fileURLToPath(new URL("../node_modules/pdfjs-dist/standard_fonts/", import.meta.url))}/`;
const templateIds = [
  TEMPLATE_IDS.ATS_CORE,
  TEMPLATE_IDS.SAP_FUNCTIONAL,
  TEMPLATE_IDS.PROJECT_LEADERSHIP,
  TEMPLATE_IDS.CAREER_TRANSITION,
  TEMPLATE_IDS.TECHNICAL_SOFTWARE,
  TEMPLATE_IDS.ADMIN_CUSTOMER_OPERATIONS,
];

const resume = {
  name: { firstName: "Luis", lastName: "Example", metadata: "PRIVATE_NAME_METADATA" },
  title: { text: "SAP Functional Consultant" },
  contact: { email: "luis@example.com", phone: "555-0100", location: { city: "Toronto", region: "Ontario" }, private: "PRIVATE_CONTACT_METADATA" },
  profile: { text: "Evidence-backed SAP functional delivery profile with verified requirements, integration, UAT, and project coordination." },
  skills: [{ name: "SAP S/4HANA" }, { text: "Requirements analysis" }, { text: "UAT" }],
  projects: [{ name: "Finance Transformation", description: "Supported a controlled finance-system rollout.", bullets: [{ text: "Documented verified requirements." }] }],
  training: [{ name: "SAP Learning", provider: "SAP", dates: "2024" }],
  certifications: [{ name: "Project Management Certificate", issuer: "Example Institute", year: "2022" }],
  experience: [{
    role: { text: "Solution Architect" },
    company: { name: "Example Canada", source: "PRIVATE_COMPANY_METADATA" },
    dates: { start: "2022", end: "2024" },
    bullets: [{ text: "Led integration testing.", responsibilityLevel: "led" }, { content: "Coordinated user acceptance testing." }],
  }],
  education: [{ degree: "BCom", institution: "Example University", dates: "2015" }],
  languages: [{ language: "English", proficiency: "Fluent" }],
  metadata: "PRIVATE_ROOT_METADATA",
};

const item = { id: "verification-listing", title: "SAP FICO Functional Consultant", company: "Example Bank", category: "tech" };

const verifiedReview = {
  application_ready: true,
  posting_readiness: { status: "reviewed_complete", fit_allowed: true, application_ready_allowed: true },
  readiness: { status: "strong_fit" },
  integrity: { status: "pass" },
  writing: { status: "pass" },
  export_readiness: { status: "ready", application_ready: true },
};

const partialReviewWithStaleFlags = {
  application_ready: true,
  posting_readiness: { status: "needs_full_posting", fit_allowed: false, application_ready_allowed: false },
  readiness: { status: "needs_full_posting" },
  export_readiness: { status: "ready", application_ready: true },
};

function normalized(value) {
  return String(value)
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/\s+/g, " ")
    .trim();
}

async function inspectDocx(blob) {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  assert.ok(zip.file("[Content_Types].xml"), "DOCX package is missing [Content_Types].xml");
  const documentXml = await zip.file("word/document.xml")?.async("string");
  assert.ok(documentXml, "DOCX package is missing word/document.xml");
  const coreXml = await zip.file("docProps/core.xml")?.async("string");
  assert.doesNotMatch(coreXml || "", /PRIVATE_|sourceReferences|recommendationTrace/i, "DOCX core metadata leaked internal values");
  return normalized(Array.from(documentXml.matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g), (match) => match[1]).join(" "));
}

async function inspectPdf(bytes) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: bytes.slice(), disableWorker: true, standardFontDataUrl });
  const pdf = await task.promise;
  const items = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    items.push(...content.items.filter((entry) => typeof entry.str === "string" && entry.str.trim()).map((entry) => entry.str.trim()));
  }
  const result = { pages: pdf.numPages, items, text: normalized(items.join(" ")) };
  await task.destroy();
  return result;
}

function verifyAgainstManifest(text, context, format) {
  const output = normalized(text);
  for (const expected of manifestVisibleText(context.renderPlan.manifest)) {
    const visible = normalized(expected);
    assert.ok(output.toLowerCase().includes(visible.toLowerCase()), `${format} is missing ${visible}`);
  }
  let previous = -1;
  for (const section of context.renderPlan.sections) {
    const current = output.toLowerCase().indexOf(section.heading.toLowerCase(), previous + 1);
    assert.ok(current > previous, `${format} reading order is incorrect at ${section.heading}`);
    previous = current;
  }
  assert.doesNotMatch(output, /PRIVATE_|\[object Object\]|undefined|null|sourceReferences|recommendationTrace|storage key/i, `${format} exposed an object or metadata artifact`);
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

try {
  const finalReadiness = getResumeExportReadiness(resume, verifiedReview);
  const preliminaryReadiness = getResumeExportReadiness(resume, partialReviewWithStaleFlags);
  assert.deepEqual(
    { canExport: finalReadiness.canExport, applicationReady: finalReadiness.applicationReady, preliminary: finalReadiness.preliminary },
    { canExport: true, applicationReady: true, preliminary: false },
  );
  assert.deepEqual(
    { canExport: preliminaryReadiness.canExport, applicationReady: preliminaryReadiness.applicationReady, preliminary: preliminaryReadiness.preliminary },
    { canExport: true, applicationReady: false, preliminary: true },
  );
  assert.equal(getResumeExportReadiness({ name: "<UNKNOWN>" }, verifiedReview).canExport, false);

  const finalContexts = templateIds.map((templateId) => {
    if (templateId === TEMPLATE_IDS.TECHNICAL_SOFTWARE) {
      return createResumeExportContext(technicalSoftwareResumeFixture, verifiedReview, { item: technicalTargetItem, templateId });
    }
    if (templateId === TEMPLATE_IDS.ADMIN_CUSTOMER_OPERATIONS) {
      return createResumeExportContext(adminCustomerOperationsResumeFixture, verifiedReview, { item: adminCustomerTargetItem, templateId });
    }
    return createResumeExportContext(resume, verifiedReview, { item, templateId });
  });
  const preliminaryContext = createResumeExportContext(resume, partialReviewWithStaleFlags, { item, templateId: TEMPLATE_IDS.ATS_CORE });
  for (const context of [...finalContexts, preliminaryContext]) validateResumeExportContext(context);
  assert.equal(preliminaryContext.authorization.mode, "preliminary");
  assert.equal(preliminaryContext.renderPlan.preliminary, true);

  const outputs = [];
  for (const context of finalContexts) {
    const [docx, pdf] = await Promise.all([createResumeDocxBlob(context), createResumePdfBytes(context)]);
    outputs.push({ prefix: context.renderPlan.templateId, context, docx, pdf });
  }
  const [preliminaryDocx, preliminaryPdf] = await Promise.all([createResumeDocxBlob(preliminaryContext), createResumePdfBytes(preliminaryContext)]);
  outputs.push({ prefix: "preliminary-ats-core-v1", context: preliminaryContext, docx: preliminaryDocx, pdf: preliminaryPdf });

  await Promise.all(outputs.map(async ({ prefix, docx, pdf }) => {
    await Promise.all([
      writeFile(`${outputDir}/${prefix}.docx`, new Uint8Array(await docx.arrayBuffer())),
      writeFile(`${outputDir}/${prefix}.pdf`, pdf),
    ]);
  }));

  let pdfPages = 0;
  let pdfTextItems = 0;
  for (const output of outputs) {
    const [docxText, pdfInspection] = await Promise.all([inspectDocx(output.docx), inspectPdf(output.pdf)]);
    const plainText = resumeDataToPlainText(output.context.renderPlan);
    verifyAgainstManifest(docxText, output.context, `${output.prefix} DOCX`);
    verifyAgainstManifest(pdfInspection.text, output.context, `${output.prefix} PDF`);
    verifyAgainstManifest(plainText, output.context, `${output.prefix} plain text`);
    if (output.context.renderPlan.preliminary) {
      assert.match(docxText, /PRELIMINARY DRAFT/);
      assert.match(pdfInspection.text, /PRELIMINARY DRAFT/);
    } else {
      assert.doesNotMatch(docxText, /PRELIMINARY DRAFT/);
      assert.doesNotMatch(pdfInspection.text, /PRELIMINARY DRAFT/);
    }
    assert.ok(pdfInspection.items.length > 15, `${output.prefix} PDF did not expose enough selectable text items`);
    if ([TEMPLATE_IDS.TECHNICAL_SOFTWARE, TEMPLATE_IDS.ADMIN_CUSTOMER_OPERATIONS].includes(output.context.renderPlan.templateId)) {
      assert.equal(pdfInspection.pages, 2, `${output.prefix} realistic fixture must render as a two-page direct PDF`);
    }
    pdfPages += pdfInspection.pages;
    pdfTextItems += pdfInspection.items.length;
  }

  const staleAuthorization = {
    ...finalContexts[0],
    assessment: { ...finalContexts[0].assessment, posting_readiness: partialReviewWithStaleFlags.posting_readiness },
  };
  assert.throws(() => validateResumeExportContext(staleAuthorization), /stale|does not match/i);
  const missingIdentity = createResumeExportContext({ ...resume, name: "candidate" }, verifiedReview, { item });
  assert.throws(() => validateResumeExportContext(missingIdentity), /Candidate name/i);

  console.log(JSON.stringify({
    status: "passed",
    root,
    outputDir: keepArtifacts ? outputDir : null,
    files: outputs.length * 2,
    templates: templateIds.length,
    pdfPages,
    pdfTextItems,
    manifestParity: true,
    verifiedFinalGate: true,
    staleReadyFlagBlocked: true,
    realisticTwoPageTemplates: [TEMPLATE_IDS.TECHNICAL_SOFTWARE, TEMPLATE_IDS.ADMIN_CUSTOMER_OPERATIONS],
  }, null, 2));
} finally {
  if (!keepArtifacts) await rm(outputDir, { recursive: true, force: true });
}
