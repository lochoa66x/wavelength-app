import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import JSZip from "jszip";
import { organizationInput, organizationResume, organizationBase, organizationItem, organizationReview, standardOrganizationLetter, shortOrganizationLetter } from "../tests/fixtures/documentOrganizationFixture.js";
import { createResumeExportContext } from "../src/resumeReadiness.js";
import { createResumeDocxBlob } from "../src/resumeDocx.js";
import { createResumePdfBytes } from "../src/resumePdf.js";
import { createCoverLetterPlan, createCoverLetterExportContext } from "../src/coverLetterModel.js";
import { createCoverLetterDocxBlob } from "../src/coverLetterDocx.js";
import { createCoverLetterPdfBlob } from "../src/coverLetterPdf.js";
import { createApplicationPresentation } from "../src/applicationPresentation.js";
import { TEMPLATE_IDS } from "../src/resumeModel.js";
import { reviewCoverLetterWriting } from "../src/coverLetterWriting.js";

const output = fileURLToPath(new URL("../tmp/organization-editorial/", import.meta.url));
await mkdir(output, { recursive: true });
const normalize = (value) => String(value).normalize("NFC").replace(/[–—]/g, "-").replace(/[’]/g, "'").replace(/\s+/g, " ").trim();
const comparable = (value) => normalize(value).replace(/[^\p{L}\p{N}]+/gu, "").toLowerCase();
const results = [];
for (const [style, designId] of [["essential", TEMPLATE_IDS.ESSENTIAL_ATS], ["bold", TEMPLATE_IDS.BOLD_IMPACT]]) {
  const context = createResumeExportContext(organizationInput, organizationReview, { item: organizationItem, strategyId: TEMPLATE_IDS.CAREER_TRANSITION, designId });
  const sections = context.renderPlan.sections;
  assert.ok(sections.findIndex((section) => section.id === "experience") < sections.findIndex((section) => section.id === "training"));
  assert.equal(context.resumePackage.document.training.length, 3);
  assert.equal(context.resumePackage.document.languages.length, 3);
  assert.ok(sections.some((section) => section.title === "Security Clearance"));
  assert.doesNotMatch(context.renderPlan.header.contactLine, /12 Example Street/);
  const presentation = createApplicationPresentation(context.renderPlan);
  const source = { baseResume: organizationBase, resumeData: organizationInput, item: organizationItem, atsReview: organizationReview, applicationPresentation: presentation };
  const entries = [["resume", await createResumeDocxBlob(context), await createResumePdfBytes(context), organizationResume.experience.flatMap((entry) => [entry.role, ...entry.bullets])]];
  for (const [length, raw] of [["standard", standardOrganizationLetter], ["short", shortOrganizationLetter]]) {
    const plan = createCoverLetterPlan(raw, source);
    const letterContext = createCoverLetterExportContext(plan, source);
    assert.equal(reviewCoverLetterWriting(plan.paragraphs, plan.length).status, "pass");
    entries.push([`${length}-letter`, await createCoverLetterDocxBlob(letterContext), new Uint8Array(await (await createCoverLetterPdfBlob(letterContext)).arrayBuffer()), plan.paragraphs.map((entry) => entry.text)]);
  }
  for (const [kind, blob, bytes, expected] of entries) {
    const docx = new Uint8Array(await blob.arrayBuffer());
    const zip = await JSZip.loadAsync(docx);
    const xml = await zip.file("word/document.xml").async("string");
    const docxText = normalize([...xml.matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g)].map((match) => match[1]).join(" ").replaceAll("&amp;", "&").replaceAll("&apos;", "'").replaceAll("&quot;", '"'));
    const task = getDocument({ data: new Uint8Array(bytes), standardFontDataUrl: fileURLToPath(new URL("../node_modules/pdfjs-dist/standard_fonts/", import.meta.url)) + "/" });
    const pdf = await task.promise;
    const pages = [];
    for (let number = 1; number <= pdf.numPages; number++) {
      const items = (await (await pdf.getPage(number)).getTextContent()).items;
      for (const item of items) if (item.str.trim()) assert.ok(item.transform[4] >= 35 && item.transform[4] + item.width <= 582 && item.transform[5] >= 35 && item.transform[5] <= 770, `${style} ${kind}: text outside page`);
      pages.push(items.map((item) => item.str).join(" "));
    }
    if (kind === "resume") {
      const groupedPage = pages.find((page) => page.includes("North American Software"));
      assert.ok(groupedPage?.includes("QA Consultant") && groupedPage?.includes("Prepared functional specifications and supported testing for banking implementations."), "grouped role detached from employer across pages");
    }
    const pdfText = normalize(pages.join(" "));
    for (const value of expected) { assert.ok(pdfText.includes(normalize(value)), `PDF missing ${value}`); assert.ok(docxText.includes(normalize(value)), `DOCX missing ${value}`); }
    assert.equal(comparable(pdfText), comparable(docxText), `${style} ${kind}: DOCX/PDF text mismatch`);
    assert.doesNotMatch(pdfText, /Why this paragraph exists|Sources and relevance|Regenerate|candidate-selected|Transferable Strengths|undefined/);
    assert.ok(pdf.numPages <= (kind === "resume" ? 2 : 1));
    for (const [extension, data] of [["pdf", bytes], ["docx", docx], ["txt", pdfText]]) await writeFile(`${output}/${style}-${kind}.${extension}`, data);
    results.push({ style, kind, pages: pdf.numPages, contentParity: true, bounds: "pass", preservedRoleCount: kind === "resume" ? organizationResume.experience.length : undefined });
    await task.destroy();
  }
}
const report = { fixture: "Reconstructed editorial examples, not live generation", results, writing: { standard: reviewCoverLetterWriting(standardOrganizationLetter.paragraphs), short: reviewCoverLetterWriting(shortOrganizationLetter.paragraphs, "short") } };
await writeFile(`${output}/verification.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify({ output, ...report }, null, 2));
