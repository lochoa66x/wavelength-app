import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import JSZip from "jszip";
import { qualityResume, qualityBase, qualityItem, qualityReview, qualityLetter } from "../tests/fixtures/documentQualityFixture.js";
import { createResumeExportContext } from "../src/resumeReadiness.js";
import { createResumeDocxBlob } from "../src/resumeDocx.js";
import { createResumePdfBytes } from "../src/resumePdf.js";
import { createCoverLetterPlan, createCoverLetterExportContext, coverLetterToPlainText } from "../src/coverLetterModel.js";
import { createCoverLetterDocxBlob } from "../src/coverLetterDocx.js";
import { createCoverLetterPdfBlob } from "../src/coverLetterPdf.js";
import { createApplicationPresentation } from "../src/applicationPresentation.js";
import { TEMPLATE_IDS } from "../src/resumeModel.js";

const output = fileURLToPath(new URL("../tmp/document-quality/", import.meta.url));
await mkdir(output, { recursive: true });
const normalized = (text) => String(text).replace(/[–—]/g, "-").replace(/[’]/g, "'").replace(/\s+/g, " ").trim();
const results = [];
for (const [name, designId] of [["bold", TEMPLATE_IDS.BOLD_IMPACT], ["ats", TEMPLATE_IDS.ESSENTIAL_ATS]]) {
  const context = createResumeExportContext(qualityResume, qualityReview, { item: qualityItem, strategyId: TEMPLATE_IDS.PROJECT_LEADERSHIP, designId });
  const presentation = createApplicationPresentation(context.renderPlan);
  const source = { baseResume: qualityBase, resumeData: qualityResume, item: qualityItem, atsReview: qualityReview, applicationPresentation: presentation };
  const plan = createCoverLetterPlan(qualityLetter, source);
  const letterContext = createCoverLetterExportContext(plan, source);
  const resumePdf = await createResumePdfBytes(context);
  const entries = [
    ["resume", await createResumeDocxBlob(context), resumePdf.bytes || resumePdf, qualityResume.experience.map((entry) => entry.role).concat(["Bachelor of Business Finance", "SAP Finance Certification"])],
    ["letter", await createCoverLetterDocxBlob(letterContext), new Uint8Array(await (await createCoverLetterPdfBlob(letterContext)).arrayBuffer()), plan.paragraphs.map((paragraph) => paragraph.text)],
  ];
  for (const [kind, docx, pdfBytes, expected] of entries) {
    const docxBytes = new Uint8Array(await docx.arrayBuffer());
    const zip = await JSZip.loadAsync(docxBytes);
    const xml = await zip.file("word/document.xml").async("string");
    const xmlText = normalized([...xml.matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g)].map((match) => match[1]).join(" ").replaceAll("&amp;", "&").replaceAll("&apos;", "'").replaceAll("&quot;", '"'));
    const task = getDocument({ data: new Uint8Array(pdfBytes).slice(), standardFontDataUrl: fileURLToPath(new URL("../node_modules/pdfjs-dist/standard_fonts/", import.meta.url)) + "/" });
    const pdf = await task.promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) pages.push((await (await pdf.getPage(pageNumber)).getTextContent()).items.map((item) => item.str || "").join(" "));
    const text = normalized(pages.join(" "));
    for (const expectedText of expected) {
      assert.ok(xmlText.includes(normalized(expectedText)), `DOCX missing ${kind} content: ${expectedText}`);
      assert.ok(text.includes(normalized(expectedText)), `PDF missing ${kind} content: ${expectedText}`);
    }
    for (const value of [text, xmlText]) assert.doesNotMatch(value, /\[object Object\]|\bundefined\b|Why this paragraph exists|candidate-selected capabilities|Sources and relevance|Regenerate|Remote \(Pakistan\)/i);
    assert.ok(pdf.numPages <= (kind === "letter" ? 1 : 2), `${name} ${kind}: unexpected ${pdf.numPages} pages`);
    await writeFile(`${output}/${name}-${kind}.docx`, docxBytes);
    await writeFile(`${output}/${name}-${kind}.pdf`, new Uint8Array(pdfBytes));
    await writeFile(`${output}/${name}-${kind}.txt`, text);
    results.push({ style: name, kind, pages: pdf.numPages, expectedContent: "preserved", selectableText: true });
    await task.destroy();
  }
  assert.doesNotMatch(coverLetterToPlainText(plan), /Pakistan|Why this paragraph exists/);
}
await writeFile(`${output}/verification.json`, JSON.stringify({ fixture: "reconstructed, not a live candidate record", results }, null, 2));
console.log(JSON.stringify({ output, results }, null, 2));
