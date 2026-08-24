import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { PRELIMINARY_EXPORT_NOTICE } from "./resumeExport.js";
import { createResumePdfBytes, createResumePrintDocument } from "./resumePdf.js";

const fixture = {
  name: { text: "Luis Example", metadata: "PRIVATE_NAME_METADATA" },
  title: { text: "SAP Functional Consultant" },
  contact: { email: "luis@example.com", phone: "555-0100", location: "Toronto, Ontario", debug: "PRIVATE_CONTACT_METADATA" },
  profile: { text: "Evidence-backed SAP delivery profile.", debug: "PRIVATE_PROFILE_METADATA" },
  skills: [{ text: "SAP S/4HANA" }, { skill: "Requirements analysis" }],
  projects: [{ name: "Finance Transformation", description: "Supported a controlled rollout.", bullets: [{ text: "Documented verified requirements." }] }],
  training: [{ name: "SAP Learning", provider: "SAP", dates: "2024" }],
  experience: [{
    role: { text: "Solution Architect" },
    company: { text: "Example Canada" },
    dates: { start: "2022", end: "2024" },
    bullets: [{ text: "Led integration testing." }, { content: "Coordinated user acceptance testing." }],
    metadata: "PRIVATE_EXPERIENCE_METADATA",
  }],
  education: [{ degree: "BCom", institution: "Example University", dates: "2015" }],
  languages: [{ language: "English", proficiency: "Fluent" }],
  metadata: "PRIVATE_ROOT_METADATA",
};

async function extractPdf(bytes) {
  const { getDocument } = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const task = getDocument({
    data: bytes.slice(),
    disableWorker: true,
    standardFontDataUrl: `${fileURLToPath(new URL("../node_modules/pdfjs-dist/standard_fonts/", import.meta.url))}/`,
  });
  const pdf = await task.promise;
  const pages = pdf.numPages;
  const items = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    items.push(...content.items.filter((item) => typeof item.str === "string" && item.str.trim()).map((item) => item.str.trim()));
  }
  await task.destroy();
  return { pages, items, text: items.join(" ") };
}

test("direct PDF contains ordered selectable ATS text and no object artifacts", async () => {
  const bytes = await createResumePdfBytes(fixture, "professional");
  const extracted = await extractPdf(bytes);

  assert.equal(new TextDecoder().decode(bytes.slice(0, 5)), "%PDF-");
  assert.ok(bytes.length > 1_000);
  assert.ok(extracted.pages >= 1);
  assert.ok(extracted.items.length > 15, "expected many independent text items, not a raster-only page");
  for (const expected of [
    "Luis Example", "SAP Functional Consultant", "luis@example.com", "Professional Summary", "Skills", "Projects",
    "Training & Certifications", "Professional Experience", "Solution Architect", "Led integration testing.", "Education", "Languages",
  ]) assert.match(extracted.text, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  assert.ok(extracted.text.indexOf("Professional Summary") < extracted.text.indexOf("Professional Experience"));
  assert.doesNotMatch(extracted.text, /PRIVATE_|\[object Object\]|undefined|null/i);
});

test("preliminary PDF is visibly labeled while final PDF is not", async () => {
  const preliminary = await extractPdf(await createResumePdfBytes(fixture, "professional", { preliminary: true }));
  const final = await extractPdf(await createResumePdfBytes(fixture, "professional", { preliminary: false }));
  assert.match(preliminary.text, /PRELIMINARY DRAFT/);
  assert.match(preliminary.text, new RegExp(PRELIMINARY_EXPORT_NOTICE.split(" - ")[0]));
  assert.doesNotMatch(final.text, /PRELIMINARY DRAFT/);
});

test("direct PDF paginates long resumes without losing first or last experience bullets", async () => {
  const longFixture = {
    ...fixture,
    experience: Array.from({ length: 10 }, (_, roleIndex) => ({
      role: `Verified Role ${roleIndex + 1}`,
      company: `Employer ${roleIndex + 1}`,
      dates: `${2010 + roleIndex} - ${2011 + roleIndex}`,
      bullets: Array.from({ length: 5 }, (_, bulletIndex) => `Verified delivery bullet ${roleIndex + 1}.${bulletIndex + 1} with requirements, testing, and release evidence.`),
    })),
  };
  const extracted = await extractPdf(await createResumePdfBytes(longFixture, "professional"));
  assert.ok(extracted.pages >= 2);
  assert.match(extracted.text, /Verified delivery bullet 1\.1/);
  assert.match(extracted.text, /Verified delivery bullet 10\.5/);
  assert.doesNotMatch(extracted.text, /\[object Object\]/);
});

test("direct PDF rejects missing or placeholder identity", async () => {
  await assert.rejects(createResumePdfBytes({ name: "candidate" }), /Candidate name is required/i);
  await assert.rejects(createResumePdfBytes({ profile: "No identity" }), /Candidate name is required/i);
});

test("browser print fallback preserves preview markup as searchable HTML", () => {
  const preview = '<div data-resume-preview="professional" style="font-family: Georgia"><div>Luis Example</div><p>Evidence-backed SAP delivery profile.</p><ul><li>Led integration testing.</li></ul></div>';
  const html = createResumePrintDocument(preview, 'Luis & SAP <Résumé>');

  assert.ok(html.includes(preview));
  assert.match(html, /<title>Luis &amp; SAP &lt;Résumé&gt;<\/title>/);
  assert.match(html, /@page \{ size: Letter; margin: 0; \}/);
  assert.match(html, /ATS-safe résumé/);
  assert.doesNotMatch(html, /<canvas|data:image\//i);
  assert.doesNotMatch(html, /\[object Object\]/);
});

test("browser print fallback refuses an empty preview", () => {
  assert.throws(() => createResumePrintDocument(""), /preview is unavailable/i);
});
