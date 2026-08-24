import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { createResumeDocxBlob } from "../src/resumeDocx.js";
import { createResumePdfBytes } from "../src/resumePdf.js";
import { getResumeExportReadiness } from "../src/resumeReadiness.js";

const keepArtifacts = process.argv.includes("--keep");
const root = fileURLToPath(new URL("..", import.meta.url));
const outputDir = fileURLToPath(new URL("../tmp/export-verification/", import.meta.url));
const standardFontDataUrl = `${fileURLToPath(new URL("../node_modules/pdfjs-dist/standard_fonts/", import.meta.url))}/`;

const resume = {
  name: { firstName: "Luis", lastName: "Example", metadata: "PRIVATE_NAME_METADATA" },
  title: { text: "SAP Functional Consultant" },
  contact: { email: "luis@example.com", phone: "555-0100", location: { city: "Toronto", region: "Ontario" }, private: "PRIVATE_CONTACT_METADATA" },
  profile: { text: "Evidence-backed SAP delivery profile." },
  skills: [{ name: "SAP S/4HANA" }, { text: "Requirements analysis" }],
  projects: [{ name: "Finance Transformation", description: "Supported a controlled finance-system rollout.", bullets: [{ text: "Documented verified requirements." }] }],
  training: [{ name: "SAP Learning", provider: "SAP", dates: "2024" }],
  experience: [{
    role: { text: "Solution Architect" },
    company: { name: "Example Canada", source: "PRIVATE_COMPANY_METADATA" },
    dates: { start: "2022", end: "2024" },
    bullets: [{ text: "Led integration testing." }, { content: "Coordinated user acceptance testing." }],
  }],
  education: [{ degree: "BCom", institution: "Example University", dates: "2015" }],
  languages: [{ language: "English", proficiency: "Fluent" }],
  metadata: "PRIVATE_ROOT_METADATA",
};

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

async function inspectDocx(blob) {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  assert.ok(zip.file("[Content_Types].xml"), "DOCX package is missing [Content_Types].xml");
  const documentXml = await zip.file("word/document.xml")?.async("string");
  assert.ok(documentXml, "DOCX package is missing word/document.xml");
  return Array.from(documentXml.matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g), (match) => match[1]).join(" ");
}

async function inspectPdf(bytes) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: bytes.slice(), disableWorker: true, standardFontDataUrl });
  const pdf = await task.promise;
  const items = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    items.push(...content.items.filter((item) => typeof item.str === "string" && item.str.trim()).map((item) => item.str.trim()));
  }
  const result = { pages: pdf.numPages, items, text: items.join(" ") };
  await task.destroy();
  return result;
}

function verifyVisibleText(text, format) {
  for (const expected of [
    "Luis Example", "SAP Functional Consultant", "luis@example.com", "Professional Summary", "Skills",
    "Professional Experience", "Solution Architect", "Led integration testing.", "Education", "Languages",
  ]) assert.match(text, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), `${format} is missing ${expected}`);
  assert.doesNotMatch(text, /PRIVATE_|\[object Object\]|undefined|null/i, `${format} exposed an object or metadata artifact`);
  assert.ok(text.indexOf("Professional Summary") < text.indexOf("Professional Experience"), `${format} reading order is incorrect`);
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

  const finalDocx = await createResumeDocxBlob(resume, "professional", { preliminary: false });
  const preliminaryDocx = await createResumeDocxBlob(resume, "professional", { preliminary: true });
  const finalPdf = await createResumePdfBytes(resume, "professional", { preliminary: false });
  const preliminaryPdf = await createResumePdfBytes(resume, "professional", { preliminary: true });

  await Promise.all([
    writeFile(`${outputDir}/final-resume.docx`, new Uint8Array(await finalDocx.arrayBuffer())),
    writeFile(`${outputDir}/preliminary-resume.docx`, new Uint8Array(await preliminaryDocx.arrayBuffer())),
    writeFile(`${outputDir}/final-resume.pdf`, finalPdf),
    writeFile(`${outputDir}/preliminary-resume.pdf`, preliminaryPdf),
  ]);

  const [finalDocxText, preliminaryDocxText, finalPdfInspection, preliminaryPdfInspection] = await Promise.all([
    inspectDocx(finalDocx),
    inspectDocx(preliminaryDocx),
    inspectPdf(finalPdf),
    inspectPdf(preliminaryPdf),
  ]);

  verifyVisibleText(finalDocxText, "DOCX");
  verifyVisibleText(finalPdfInspection.text, "PDF");
  assert.doesNotMatch(finalDocxText, /PRELIMINARY DRAFT/);
  assert.doesNotMatch(finalPdfInspection.text, /PRELIMINARY DRAFT/);
  assert.match(preliminaryDocxText, /PRELIMINARY DRAFT/);
  assert.match(preliminaryPdfInspection.text, /PRELIMINARY DRAFT/);
  assert.ok(finalPdfInspection.items.length > 15, "PDF did not expose enough selectable text items");

  console.log(JSON.stringify({
    status: "passed",
    root,
    outputDir: keepArtifacts ? outputDir : null,
    files: 4,
    pdfPages: finalPdfInspection.pages,
    pdfTextItems: finalPdfInspection.items.length,
    verifiedFinalGate: true,
    staleReadyFlagBlocked: true,
  }, null, 2));
} finally {
  if (!keepArtifacts) await rm(outputDir, { recursive: true, force: true });
}
