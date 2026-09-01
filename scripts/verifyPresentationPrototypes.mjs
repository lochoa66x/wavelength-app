import assert from "node:assert/strict";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { createApplicationPresentation } from "../src/applicationPresentation.js";
import { createCoverLetterDocxBlob } from "../src/coverLetterDocx.js";
import { createCoverLetterPdfBlob } from "../src/coverLetterPdf.js";
import { createCoverLetterExportContext, createCoverLetterPlan } from "../src/coverLetterModel.js";
import { createResumeDocxBlob } from "../src/resumeDocx.js";
import { DESIGN_IDS, TEMPLATE_IDS, buildResumeRenderPlan, createResumePackage, manifestVisibleText } from "../src/resumeModel.js";
import { createResumePdfBytes } from "../src/resumePdf.js";

const keep = process.argv.includes("--keep");
const outputDir = fileURLToPath(new URL("../tmp/presentation-prototypes/", import.meta.url));
const standardFontDataUrl = `${fileURLToPath(new URL("../node_modules/pdfjs-dist/standard_fonts/", import.meta.url))}/`;
const familyIds = [TEMPLATE_IDS.NORTHSTAR, TEMPLATE_IDS.CIVIC, TEMPLATE_IDS.STUDIO_EDITORIAL_V2, DESIGN_IDS.ESSENTIAL_ATS];

const verifiedReview = {
  application_ready: true,
  posting_readiness: { status: "reviewed_complete", fit_allowed: true, application_ready_allowed: true },
  requirements: [{ id: "R1", requirement: "Document operating procedures", evidence_match: "direct" }],
  coverage: { direct: 1, adjacent: 0, transferable: 0, missing: 0 },
  readiness: { status: "strong_fit" },
  integrity: { status: "pass" },
  writing: { status: "pass" },
  export_readiness: { status: "ready", application_ready: true, blockers: [] },
};

const fixtures = [
  {
    id: "ca-short",
    item: { id: "ca-role", title: "Operations Analyst", company: "Harbour Cooperative", location: "Toronto, Ontario, Canada" },
    resume: {
      name: "Avery Morgan",
      title: "Operations Analyst",
      contact: "avery.morgan@example.com | Toronto, Ontario | linkedin.com/in/avery-morgan",
      profile: "Operations analyst with verified process documentation, reporting, and service-improvement experience.",
      skills: ["Process analysis", "Operational reporting", "Stakeholder communication", "Microsoft Excel"],
      experience: [{ role: "Operations Coordinator", company: "North Harbour Cooperative", dates: "2023 - Present", bullets: ["Documented operating procedures for a multi-site service team.", "Prepared weekly reporting and coordinated issue follow-up with internal partners."] }],
      education: [{ degree: "Business Administration Diploma", institution: "Ontario College", dates: "2022" }],
      languages: [{ language: "English", proficiency: "Fluent" }, { language: "French", proficiency: "Intermediate" }],
    },
  },
  {
    id: "us-long",
    item: { id: "us-role", title: "Senior Program Operations Manager", company: "Cedar Public Services", location: "Chicago, Illinois, United States" },
    resume: {
      name: "Jordan Reyes",
      title: "Program Operations Leader",
      contact: "jordan.reyes@example.com | Chicago, Illinois | linkedin.com/in/jordan-reyes",
      profile: "Program operations leader with verified experience in service delivery, process governance, reporting, and cross-functional implementation.",
      skills: ["Program operations", "Process governance", "Service delivery", "Risk tracking", "Executive reporting", "Change enablement"],
      experience: Array.from({ length: 5 }, (_, index) => ({
        role: ["Program Operations Lead", "Operations Manager", "Senior Operations Analyst", "Implementation Analyst", "Service Coordinator"][index],
        company: ["Cedar Public Services", "Lakefront Health Network", "Union Research Institute", "Westline Services", "City Learning Partnership"][index],
        dates: [`2022 - Present`, `2019 - 2022`, `2016 - 2019`, `2013 - 2016`, `2010 - 2013`][index],
        bullets: [
          `Documented operating procedures and governance checkpoints for program ${index + 1}.`,
          `Prepared status reporting and coordinated decisions across delivery partners for program ${index + 1}.`,
          `Tracked implementation risks and supported a controlled transition into service for program ${index + 1}.`,
        ],
      })),
      education: [{ degree: "Bachelor of Public Administration", institution: "Midwest State University", dates: "2010" }],
      certifications: [{ name: "Project Management Professional", issuer: "PMI", year: "2018" }],
      languages: [{ language: "English", proficiency: "Fluent" }, { language: "Spanish", proficiency: "Fluent" }],
    },
  },
];

function normalized(value) {
  return String(value || "").replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&apos;", "'").replaceAll("&quot;", '"').replace(/\s+/g, " ").trim();
}

async function inspectDocx(blob) {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const xml = await zip.file("word/document.xml")?.async("string");
  assert.ok(xml, "DOCX document.xml missing");
  return { xml, text: normalized(Array.from(xml.matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g), (match) => match[1]).join(" ")) };
}

async function inspectPdf(bytesOrBlob) {
  const bytes = bytesOrBlob instanceof Uint8Array ? bytesOrBlob : new Uint8Array(await bytesOrBlob.arrayBuffer());
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({ data: bytes.slice(), disableWorker: true, standardFontDataUrl });
  const pdf = await task.promise;
  const items = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const content = await (await pdf.getPage(pageNumber)).getTextContent();
    items.push(...content.items.filter((entry) => typeof entry.str === "string").map((entry) => entry.str));
  }
  const result = { pages: pdf.numPages, text: normalized(items.join(" ")), bytes };
  await task.destroy();
  return result;
}

function letterDraft(item, fixture) {
  const firstBullet = fixture.resume.experience[0].bullets[0];
  return {
    createdAt: "2026-08-31T12:00:00.000Z",
    voice: "direct",
    length: "short",
    salutation: "Dear Hiring Team,",
    paragraphs: [
      { id: "opening", purpose: "opening", text: `I am applying for the ${item.title} role at ${item.company}.`, evidence_refs: [firstBullet], requirement_refs: ["Document operating procedures"], explanation: "Connects the verified operating-procedure evidence to the role.", evidence_match: "direct" },
      { id: "evidence", purpose: "evidence", text: `My recent work includes ${firstBullet.charAt(0).toLowerCase()}${firstBullet.slice(1)}`, evidence_refs: [firstBullet], requirement_refs: ["Document operating procedures"], explanation: "Uses the candidate's verified wording.", evidence_match: "direct" },
      { id: "closing", purpose: "closing", text: "Thank you for considering my application. I would welcome a conversation about the role.", evidence_refs: [], requirement_refs: [], explanation: "Closes without adding a personal claim.", evidence_match: "neutral" },
    ],
    signoff: "Sincerely,",
  };
}

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
const results = [];

for (const fixture of fixtures) {
  const baseResume = [fixture.resume.name, fixture.resume.contact, fixture.resume.title, ...fixture.resume.experience.flatMap((entry) => entry.bullets)].join("\n");
  const resumePackage = createResumePackage(fixture.resume, { item: fixture.item, atsReview: verifiedReview });
  let baselineManifest = null;
  for (const designId of familyIds) {
    const renderPlan = buildResumeRenderPlan(resumePackage, { designId }, { allowPrototypeDesigns: true });
    const visible = manifestVisibleText(renderPlan.manifest);
    baselineManifest ||= visible;
    assert.deepEqual(visible, baselineManifest, `${fixture.id}/${designId} changed canonical résumé content`);
    const presentation = createApplicationPresentation(renderPlan);
    const letterContextInput = { baseResume, resumeData: fixture.resume, item: fixture.item, atsReview: verifiedReview, candidateEvidence: [] };
    const letterPlan = createCoverLetterPlan(letterDraft(fixture.item, fixture), letterContextInput);
    const letterContext = createCoverLetterExportContext(letterPlan, { ...letterContextInput, applicationPresentation: presentation });

    const [resumeDocx, resumePdfBytes, letterDocx, letterPdf] = await Promise.all([
      createResumeDocxBlob(renderPlan),
      createResumePdfBytes(renderPlan),
      createCoverLetterDocxBlob(letterContext),
      createCoverLetterPdfBlob(letterContext),
    ]);
    const [resumeDocxInspection, resumePdfInspection, letterDocxInspection, letterPdfInspection] = await Promise.all([
      inspectDocx(resumeDocx),
      inspectPdf(resumePdfBytes),
      inspectDocx(letterDocx),
      inspectPdf(letterPdf),
    ]);
    for (const expected of visible) {
      assert.ok(resumeDocxInspection.text.toLowerCase().includes(normalized(expected).toLowerCase()), `Résumé DOCX missing ${expected}`);
      assert.ok(resumePdfInspection.text.toLowerCase().includes(normalized(expected).toLowerCase()), `Résumé PDF missing ${expected}`);
    }
    for (const expected of [letterPlan.candidate.fullName, letterPlan.target.company, letterPlan.target.jobTitle, ...letterPlan.paragraphs.map((entry) => entry.text)]) {
      assert.ok(letterDocxInspection.text.toLowerCase().includes(normalized(expected).toLowerCase()), `Letter DOCX missing ${expected}`);
      assert.ok(letterPdfInspection.text.toLowerCase().includes(normalized(expected).toLowerCase()), `Letter PDF missing ${expected}`);
    }
    assert.match(resumeDocxInspection.xml, new RegExp(presentation.tokens.docxBodyFontFamily, "i"));
    assert.match(letterDocxInspection.xml, new RegExp(presentation.tokens.docxBodyFontFamily, "i"));
    assert.equal(letterPdfInspection.pages, 1, `${fixture.id}/${designId} letter should fit one page`);
    const prefix = `${fixture.id}-${designId}`;
    if (keep) {
      await Promise.all([
        writeFile(`${outputDir}/${prefix}-resume.docx`, Buffer.from(await resumeDocx.arrayBuffer())),
        writeFile(`${outputDir}/${prefix}-resume.pdf`, resumePdfInspection.bytes),
        writeFile(`${outputDir}/${prefix}-letter.docx`, Buffer.from(await letterDocx.arrayBuffer())),
        writeFile(`${outputDir}/${prefix}-letter.pdf`, letterPdfInspection.bytes),
      ]);
    }
    results.push({ fixture: fixture.id, designId, safety: presentation.atsSafetyLevel, resumePages: resumePdfInspection.pages, letterPages: letterPdfInspection.pages, contentHash: renderPlan.contentHash, presentationHash: presentation.presentationHash });
  }
}

if (!keep) await rm(outputDir, { recursive: true, force: true });
console.log(JSON.stringify({ status: "passed", artifactsKept: keep, outputDir: keep ? outputDir : null, packages: results.length, files: results.length * 4, results }, null, 2));
