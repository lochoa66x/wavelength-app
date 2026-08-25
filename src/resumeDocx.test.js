import assert from "node:assert/strict";
import test from "node:test";

import { normalizeResumeForExport } from "./resumeExport.js";
import { createResumeDocxBlob, normalizeDocxRuns, serializeDocxText } from "./resumeDocx.js";

async function inspectDocx(blob) {
  const { default: JSZip } = await import("jszip");
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const documentXml = await zip.file("word/document.xml").async("string");
  const visibleText = Array.from(documentXml.matchAll(/<w:t(?: [^>]*)?>([\s\S]*?)<\/w:t>/g), (match) => match[1])
    .join(" ")
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
  return { zip, documentXml, visibleText };
}

function structuredFixture() {
  const cycle = { text: "" };
  cycle.text = cycle;
  return {
    name: { firstName: "Luis", lastName: "Example", metadata: "PRIVATE_NAME_METADATA" },
    title: { text: "SAP Functional Consultant", source: "PRIVATE_TITLE_METADATA" },
    contact: {
      email: { text: "luis@example.com" },
      phone: "555-0100",
      location: { city: "Toronto", region: "Ontario", debug: "PRIVATE_LOCATION_METADATA" },
      arbitrary: "PRIVATE_CONTACT_METADATA",
    },
    profile: { text: "Evidence-backed SAP delivery profile.", internal_note: "PRIVATE_PROFILE_METADATA" },
    skills: [{ name: "SAP S/4HANA", id: "PRIVATE_SKILL_METADATA" }, { text: "Requirements analysis" }, null, cycle],
    projects: [{
      title: { text: "Finance Transformation" },
      description: { content: "Supported a controlled finance-system rollout." },
      bullets: [{ description: "Documented verified requirements." }],
      metadata: "PRIVATE_PROJECT_METADATA",
    }],
    training: [{ name: "SAP Learning", provider: { name: "SAP" }, dates: { year: 2024 }, private: "PRIVATE_TRAINING_METADATA" }],
    experience: [{
      role: { text: "Solution Architect" },
      company: { name: "Example Canada", metadata: "PRIVATE_COMPANY_METADATA" },
      dates: { start: "2022", end: "2024" },
      bullets: [{ text: "Led integration testing." }, { content: "Coordinated user acceptance testing." }, cycle],
      raw_model_response: "PRIVATE_EXPERIENCE_METADATA",
    }],
    education: [{ degree: { name: "BCom" }, institution: { text: "Example University" }, dates: 2015 }],
    languages: [{ language: "English", proficiency: "Fluent", metadata: "PRIVATE_LANGUAGE_METADATA" }],
    metadata: "PRIVATE_ROOT_METADATA",
  };
}

test("DOCX text runs serialize approved structured text without object coercion", () => {
  const runs = normalizeDocxRuns({ text: "Luis Example", bold: true, size: 32 });
  assert.deepEqual(runs, [{ text: "Luis Example", bold: true, size: 32 }]);
  assert.equal(serializeDocxText({ email: "luis@example.com", phone: "555-0100", metadata: "PRIVATE" }), "luis@example.com · 555-0100");
  assert.equal(serializeDocxText({ arbitrary: { text: "PRIVATE" } }), "");
  assert.doesNotMatch(runs[0].text, /\[object Object\]/);
});

test("field-aware resume normalization is deterministic, cycle-safe, and metadata-safe", () => {
  const normalized = normalizeResumeForExport(structuredFixture());
  assert.equal(normalized.name, "Luis Example");
  assert.equal(normalized.contact, "luis@example.com | 555-0100 | Toronto | Ontario");
  assert.deepEqual(normalized.skills, ["SAP S/4HANA", "Requirements analysis"]);
  assert.equal(normalized.experience[0].dates, "2022 - 2024");
  assert.deepEqual(normalized.languages, ["English · Fluent"]);
  assert.doesNotMatch(JSON.stringify(normalized), /PRIVATE_|\[object Object\]|undefined|null/);
});

test("generated DOCX is a valid package with complete ordered visible text", async () => {
  const blob = await createResumeDocxBlob(structuredFixture(), "professional");
  const { zip, visibleText } = await inspectDocx(blob);

  assert.ok(blob.size > 500);
  assert.equal(blob.type, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  assert.ok(zip.file("[Content_Types].xml"));
  assert.ok(zip.file("word/document.xml"));
  for (const expected of [
    "Luis Example", "SAP Functional Consultant", "luis@example.com", "Professional Summary", "Skills",
    "Projects", "Professional Training", "Professional Experience", "Solution Architect", "Led integration testing.",
    "Education", "BCom", "Languages", "English",
  ]) assert.match(visibleText, new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"));
  assert.ok(visibleText.indexOf("Professional Summary") < visibleText.indexOf("Professional Experience"));
  assert.doesNotMatch(visibleText, /PRIVATE_|\[object Object\]|undefined|null/i);
});

test("DOCX keeps compact project paragraphs together when Word paginates", async () => {
  const fixture = structuredFixture();
  fixture.projects[0].bullets.push({ text: "Recorded approved project outcomes." });
  const { documentXml } = await inspectDocx(await createResumeDocxBlob(fixture, "professional"));
  const paragraphs = Array.from(documentXml.matchAll(/<w:p>([\s\S]*?)<\/w:p>/g), (match) => match[0]);
  const firstBulletParagraph = paragraphs.find((paragraph) => paragraph.includes("Documented verified requirements."));
  const finalBulletParagraph = paragraphs.find((paragraph) => paragraph.includes("Recorded approved project outcomes."));

  assert.match(firstBulletParagraph || "", /<w:keepNext\/>/);
  assert.doesNotMatch(finalBulletParagraph || "", /<w:keepNext\/>/);
  assert.match(finalBulletParagraph || "", /<w:keepNext w:val="false"\/>/);
});

test("preliminary state stays outside both preliminary and final DOCX content", async () => {
  const preliminary = await inspectDocx(await createResumeDocxBlob(structuredFixture(), "professional", { preliminary: true }));
  const final = await inspectDocx(await createResumeDocxBlob(structuredFixture(), "professional", { preliminary: false }));
  assert.doesNotMatch(preliminary.visibleText, /PRELIMINARY DRAFT/);
  assert.doesNotMatch(final.visibleText, /PRELIMINARY DRAFT/);
});

test("DOCX export rejects missing or placeholder identity", async () => {
  await assert.rejects(createResumeDocxBlob({ name: { text: "<UNKNOWN>" } }), /Candidate name is required/i);
  await assert.rejects(createResumeDocxBlob({ profile: "No identity" }), /Candidate name is required/i);
});
