import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { createCoverLetterDocxBlob } from "../src/coverLetterDocx.js";
import { createCoverLetterPdfBlob } from "../src/coverLetterPdf.js";
import { coverLetterToPlainText, createCoverLetterExportContext, createCoverLetterPlan, validateCoverLetterExportContext } from "../src/coverLetterModel.js";

const keep = process.argv.includes("--keep");
const outputDir = fileURLToPath(new URL("../tmp/cover-letter-verification/", import.meta.url));
const standardFontDataUrl = `${fileURLToPath(new URL("../node_modules/pdfjs-dist/standard_fonts/", import.meta.url))}/`;

const baseResume = "Jordan Lee\njordan@example.com | Hamilton, Ontario\nIndustrial Electrician\nInstalled and maintained electrical panels.\nDocumented preventive maintenance work in a CMMS.";
const resumeData = { name: "Jordan Lee", contact: "jordan@example.com | Hamilton, Ontario", title: "Industrial Electrician", profile: "Industrial electrician focused on safe maintenance.", experience: [{ role: "Industrial Electrician", company: "North Plant", dates: "2021 - 2025", bullets: ["Installed and maintained electrical panels.", "Documented preventive maintenance work in a CMMS."] }], skills: ["Electrical maintenance", "CMMS"] };
const item = { id: "cover-verification", title: "Facilities Electrician", company: "Northline Manufacturing", location: "Hamilton, Ontario" };
const verifiedReview = { posting_readiness: { status: "reviewed_complete", fit_allowed: true, application_ready_allowed: true }, readiness: { status: "strong_fit" }, requirements: [{ id: "R1" }, { id: "R2" }], coverage: { direct: 2, adjacent: 0, transferable: 0, missing: 0 }, integrity: { status: "pass" }, writing: { status: "pass" }, export_readiness: { status: "ready", blockers: [] } };
const preliminaryReview = { ...verifiedReview, readiness: { status: "significant_gap" } };
const raw = { createdAt: "2026-08-27T12:00:00.000Z", voice: "direct", length: "standard", salutation: "Dear Hiring Team,", paragraphs: [{ id: "opening", purpose: "opening", text: "I am applying for the Facilities Electrician role with evidence grounded in plant electrical maintenance. My background combines hands-on electrical panel work, preventive maintenance, and practical documentation in a CMMS, which aligns directly with the core responsibilities described for this opportunity at Northline Manufacturing.", evidence_refs: ["Installed and maintained electrical panels."], requirement_refs: ["Install and maintain electrical panels"], explanation: "Connects direct maintenance evidence to the role.", evidence_match: "direct" }, { id: "evidence-1", purpose: "evidence", text: "In my recent work, I installed and maintained electrical panels while supporting safe, reliable plant operations. That experience required careful troubleshooting, disciplined execution, and clear communication with the people relying on the equipment. It gives me a practical foundation for maintaining electrical systems while respecting established procedures and production priorities.", evidence_refs: ["Installed and maintained electrical panels."], requirement_refs: ["Install and maintain electrical panels"], explanation: "Shows direct electrical maintenance evidence.", evidence_match: "direct" }, { id: "evidence-2", purpose: "evidence", text: "My maintenance work also included documenting preventive tasks in a CMMS. I understand that accurate records are part of the maintenance itself: they make completed work visible, support follow-up, and help the next person understand equipment history. I would bring that same attention to documentation and dependable execution to this role.", evidence_refs: ["Documented preventive maintenance work in a CMMS."], requirement_refs: ["Document work in the CMMS"], explanation: "Shows documentation evidence.", evidence_match: "direct" }, { id: "transition", purpose: "transition", text: "The evidence I am presenting is deliberately focused on the work I can verify: electrical panel maintenance and preventive-maintenance documentation. I would approach any site-specific systems or procedures as requirements to learn carefully rather than as experience I already claim, while contributing the maintenance habits and practical judgment demonstrated in my existing work.", evidence_refs: ["Installed and maintained electrical panels.", "Documented preventive maintenance work in a CMMS."], requirement_refs: ["Industrial electrical maintenance experience"], explanation: "Keeps the boundary between verified experience and site-specific learning explicit.", evidence_match: "boundary" }, { id: "closing", purpose: "closing", text: "Thank you for considering my application. I would welcome a conversation about the Facilities Electrician role and how my verified maintenance experience could contribute to Northline Manufacturing's team.", evidence_refs: [], requirement_refs: [], explanation: "Closes without adding a claim.", evidence_match: "neutral" }], signoff: "Sincerely," };

function normalized(value) { return String(value || "").replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&apos;", "'").replaceAll("&quot;", '"').replace(/\s+/g, " ").trim(); }

async function docxText(blob) {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const xml = await zip.file("word/document.xml")?.async("string");
  assert.ok(xml, "DOCX document.xml missing");
  return normalized(Array.from(xml.matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g), (match) => match[1]).join(" "));
}

async function pdfInspection(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: bytes.slice(), disableWorker: true, standardFontDataUrl });
  const pdf = await task.promise;
  const items = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const content = await (await pdf.getPage(pageNumber)).getTextContent();
    items.push(...content.items.filter((entry) => typeof entry.str === "string").map((entry) => entry.str));
  }
  const inspection = { pages: pdf.numPages, text: normalized(items.join(" ")), bytes };
  await task.destroy();
  return inspection;
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
let selectableItems = 0;
for (const [mode, atsReview] of [["final", verifiedReview], ["preliminary", preliminaryReview]]) {
  const contextInput = { baseResume, resumeData, item, atsReview, candidateEvidence: [] };
  const plan = createCoverLetterPlan(raw, contextInput);
  const context = validateCoverLetterExportContext(createCoverLetterExportContext(plan, contextInput));
  assert.equal(context.readiness.preliminary, mode === "preliminary");
  const docx = await createCoverLetterDocxBlob(context);
  const pdf = await createCoverLetterPdfBlob(context);
  const [docxVisible, pdfVisible] = await Promise.all([docxText(docx), pdfInspection(pdf)]);
  const plain = coverLetterToPlainText(plan);
  for (const expected of [plan.candidate.fullName, plan.target.company, plan.target.jobTitle, plan.salutation, ...plan.paragraphs.map(({ text }) => text), plan.signoff]) {
    assert.ok(docxVisible.toLowerCase().includes(normalized(expected).toLowerCase()), `DOCX missing: ${expected}`);
    assert.ok(pdfVisible.text.toLowerCase().includes(normalized(expected).toLowerCase()), `PDF missing: ${expected}`);
    assert.ok(plain.toLowerCase().includes(normalized(expected).toLowerCase()), `plain text missing: ${expected}`);
  }
  for (const output of [docxVisible, pdfVisible.text, plain]) assert.doesNotMatch(output, /\[object Object\]|undefined|null|application-ready|preliminary letter/i);
  assert.equal(pdfVisible.pages, 1, `${mode} cover letter should fit one page`);
  selectableItems += pdfVisible.text.split(/\s+/).length;
  if (keep) {
    await writeFile(`${outputDir}/${mode}-cover-letter.docx`, Buffer.from(await docx.arrayBuffer()));
    await writeFile(`${outputDir}/${mode}-cover-letter.pdf`, Buffer.from(pdfVisible.bytes));
    await writeFile(`${outputDir}/${mode}-cover-letter.txt`, plain, "utf8");
  }
}

if (!keep) await rm(outputDir, { recursive: true, force: true });
console.log(JSON.stringify({ coverLetters: 2, docxFiles: 2, pdfFiles: 2, pdfPages: 2, selectableTextTokens: selectableItems, finalGate: "passed", preliminaryGate: "passed", staleAuthorization: "covered-by-unit-test", artifactsKept: keep }, null, 2));
