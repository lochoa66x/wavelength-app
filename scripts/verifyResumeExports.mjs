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
  apprenticeTargetItem,
  creativeAdjacentResumeFixture,
  creativeDesignResumeFixture,
  creativeTargetItem,
  fieldServiceTargetItem,
  fieldServiceTechnicianResumeFixture,
  technicalSoftwareResumeFixture,
  technicalTargetItem,
  tradeApprenticeResumeFixture,
  marketingCareerChangerResumeFixture,
  marketingCommunicationsResumeFixture,
  marketingTargetItem,
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
  TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES,
  TEMPLATE_IDS.MARKETING_COMMUNICATIONS,
  TEMPLATE_IDS.CREATIVE_DESIGN,
  TEMPLATE_IDS.ESSENTIAL_ATS,
  TEMPLATE_IDS.CLASSIC_LEDGER,
  TEMPLATE_IDS.MODERN_SIGNAL,
  TEMPLATE_IDS.COMPACT_FOCUS,
  TEMPLATE_IDS.BOLD_IMPACT,
  TEMPLATE_IDS.STUDIO_EDITORIAL,
  TEMPLATE_IDS.FIELD_READY,
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
  requirements: [{
    id: "R1",
    requirement: "Lead integration testing",
    priority: "responsibility",
    evidence_match: "direct",
    resume_evidence: "Led integration testing.",
  }],
  coverage: { direct: 1, adjacent: 0, transferable: 0, missing: 0 },
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
  const pageTexts = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    const pageItems = content.items.filter((entry) => typeof entry.str === "string" && entry.str.trim()).map((entry) => entry.str.trim());
    items.push(...pageItems);
    pageTexts.push(normalized(pageItems.join(" ")));
  }
  const result = { pages: pdf.numPages, items, pageTexts, text: normalized(items.join(" ")) };
  await task.destroy();
  return result;
}

function firstManifestValue(section) {
  const first = section.items[0];
  if (!first) return "";
  return first.text || first.values?.[0] || first.bullets?.[0]?.text || first.details?.[0]?.text || "";
}

function verifyPdfSectionStarts(pdfInspection, context, format) {
  for (const section of context.renderPlan.manifest.sections) {
    const heading = normalized(section.heading).toLowerCase();
    const firstValue = normalized(firstManifestValue(section)).toLowerCase();
    if (!firstValue) continue;
    const headingPage = pdfInspection.pageTexts.findIndex((page) => page.toLowerCase().includes(heading));
    assert.notEqual(headingPage, -1, `${format} is missing the ${section.heading} heading`);
    assert.ok(
      pdfInspection.pageTexts[headingPage].toLowerCase().includes(firstValue),
      `${format} strands the ${section.heading} heading away from its first content item`,
    );
  }
}

function verifyCompactProjectsStayTogether(pdfInspection, context, format) {
  const projectSections = context.renderPlan.sections.filter((section) => section.type === "projects");
  for (const section of projectSections) {
    for (const project of section.items) {
      if (!project.name || !project.bullets.length || project.bullets.length > 3) continue;
      const projectPage = pdfInspection.pageTexts.find((page) => page.toLowerCase().includes(normalized(project.name).toLowerCase()));
      assert.ok(projectPage, `${format} is missing the ${project.name} project`);
      for (const bullet of project.bullets) {
        assert.ok(
          projectPage.toLowerCase().includes(normalized(bullet.text).toLowerCase()),
          `${format} strands a compact ${project.name} project bullet on another page`,
        );
      }
    }
  }
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
    if (templateId === TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES) {
      return createResumeExportContext(fieldServiceTechnicianResumeFixture, verifiedReview, { item: fieldServiceTargetItem, templateId });
    }
    if (templateId === TEMPLATE_IDS.MARKETING_COMMUNICATIONS) {
      return createResumeExportContext(marketingCommunicationsResumeFixture, verifiedReview, { item: marketingTargetItem, templateId });
    }
    if (templateId === TEMPLATE_IDS.CREATIVE_DESIGN) {
      return createResumeExportContext(creativeDesignResumeFixture, verifiedReview, { item: creativeTargetItem, templateId });
    }
    return createResumeExportContext(resume, verifiedReview, { item, templateId });
  });
  const apprenticeContext = createResumeExportContext(tradeApprenticeResumeFixture, verifiedReview, {
    item: apprenticeTargetItem,
    templateId: TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES,
  });
  const preliminaryContext = createResumeExportContext(resume, partialReviewWithStaleFlags, { item, templateId: TEMPLATE_IDS.ATS_CORE });
  const marketingTransitionContext = createResumeExportContext(marketingCareerChangerResumeFixture, verifiedReview, {
    item: marketingTargetItem,
    templateId: TEMPLATE_IDS.MARKETING_COMMUNICATIONS,
  });
  const creativeAdjacentContext = createResumeExportContext(creativeAdjacentResumeFixture, verifiedReview, {
    item: creativeTargetItem,
    templateId: TEMPLATE_IDS.CREATIVE_DESIGN,
  });
  for (const context of [...finalContexts, apprenticeContext, marketingTransitionContext, creativeAdjacentContext, preliminaryContext]) validateResumeExportContext(context);
  assert.equal(preliminaryContext.authorization.mode, "preliminary");
  assert.equal(preliminaryContext.renderPlan.preliminary, true);

  const outputs = [];
  for (const context of finalContexts) {
    const [docx, pdf] = await Promise.all([createResumeDocxBlob(context), createResumePdfBytes(context)]);
    outputs.push({ prefix: `${context.renderPlan.strategyId}--${context.renderPlan.designId}`, context, docx, pdf });
  }
  const [apprenticeDocx, apprenticePdf] = await Promise.all([createResumeDocxBlob(apprenticeContext), createResumePdfBytes(apprenticeContext)]);
  outputs.push({ prefix: "apprentice-skilled-trades-field-services-v1", context: apprenticeContext, docx: apprenticeDocx, pdf: apprenticePdf });
  const [marketingTransitionDocx, marketingTransitionPdf] = await Promise.all([createResumeDocxBlob(marketingTransitionContext), createResumePdfBytes(marketingTransitionContext)]);
  outputs.push({ prefix: "marketing-transition-marketing-communications-v1", context: marketingTransitionContext, docx: marketingTransitionDocx, pdf: marketingTransitionPdf });
  const [creativeAdjacentDocx, creativeAdjacentPdf] = await Promise.all([createResumeDocxBlob(creativeAdjacentContext), createResumePdfBytes(creativeAdjacentContext)]);
  outputs.push({ prefix: "creative-adjacent-creative-design-v1", context: creativeAdjacentContext, docx: creativeAdjacentDocx, pdf: creativeAdjacentPdf });
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
    verifyPdfSectionStarts(pdfInspection, output.context, `${output.prefix} PDF`);
    verifyCompactProjectsStayTogether(pdfInspection, output.context, `${output.prefix} PDF`);
    verifyAgainstManifest(plainText, output.context, `${output.prefix} plain text`);
    assert.doesNotMatch(docxText, /PRELIMINARY DRAFT/);
    assert.doesNotMatch(pdfInspection.text, /PRELIMINARY DRAFT/);
    assert.doesNotMatch(plainText, /PRELIMINARY DRAFT/);
    assert.ok(pdfInspection.items.length > 15, `${output.prefix} PDF did not expose enough selectable text items`);
    if ([
      TEMPLATE_IDS.TECHNICAL_SOFTWARE,
      TEMPLATE_IDS.ADMIN_CUSTOMER_OPERATIONS,
      TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES,
      TEMPLATE_IDS.MARKETING_COMMUNICATIONS,
      TEMPLATE_IDS.CREATIVE_DESIGN,
    ].includes(output.context.renderPlan.strategyId)
      && ![
        "apprentice-skilled-trades-field-services-v1",
        "marketing-transition-marketing-communications-v1",
        "creative-adjacent-creative-design-v1",
      ].includes(output.prefix)) {
      assert.equal(pdfInspection.pages, 2, `${output.prefix} realistic fixture must render as a two-page direct PDF`);
    }
    if ([
      "apprentice-skilled-trades-field-services-v1",
      "marketing-transition-marketing-communications-v1",
      "creative-adjacent-creative-design-v1",
    ].includes(output.prefix)) {
      assert.equal(pdfInspection.pages, 1, `${output.prefix} must render as a one-page direct PDF`);
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
    realisticTwoPageTemplates: [
      TEMPLATE_IDS.TECHNICAL_SOFTWARE,
      TEMPLATE_IDS.ADMIN_CUSTOMER_OPERATIONS,
      TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES,
      TEMPLATE_IDS.MARKETING_COMMUNICATIONS,
      TEMPLATE_IDS.CREATIVE_DESIGN,
    ],
    realisticOnePageFixtures: [
      "apprentice-skilled-trades-field-services-v1",
      "marketing-transition-marketing-communications-v1",
      "creative-adjacent-creative-design-v1",
    ],
  }, null, 2));
} finally {
  if (!keepArtifacts) await rm(outputDir, { recursive: true, force: true });
}
