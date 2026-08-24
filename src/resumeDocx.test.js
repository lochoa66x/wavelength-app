import assert from "node:assert/strict";
import test from "node:test";

import { createResumeDocxBlob, normalizeDocxRuns, serializeDocxText } from "./resumeDocx.js";

test("DOCX text runs preserve structured text instead of serializing objects", () => {
  const runs = normalizeDocxRuns({ text: "Luis Ochoa Morales", bold: true, size: 32 });
  assert.deepEqual(runs, [{ text: "Luis Ochoa Morales", bold: true, size: 32 }]);
  assert.doesNotMatch(runs[0].text, /\[object Object\]/);
  assert.equal(serializeDocxText({ email: "luis@example.com", phone: "555-0100" }), "luis@example.com · 555-0100");
  assert.equal(serializeDocxText({ nested: { text: "Structured profile" } }), "Structured profile");
});

test("DOCX export accepts structured header runs and creates a non-empty document", async () => {
  const blob = await createResumeDocxBlob({
    name: "Luis Ochoa Morales",
    title: "SAP Functional Consultant",
    contact: "luis@example.com · Montréal, Québec",
    profile: "SAP functional consultant focused on requirements, configuration, testing, and delivery.",
    skills: ["SAP S/4HANA", "SAP FI-CA"],
    experience: [{ role: "Solution Architect", company: "Deloitte Canada", dates: "2022 – 2024", bullets: ["Led SAP integration testing."] }],
  }, "professional");

  assert.ok(blob.size > 500);
  assert.equal(blob.type, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
});

test("generated DOCX XML contains structured values and never object coercion artifacts", async () => {
  const { default: JSZip } = await import("jszip");
  const blob = await createResumeDocxBlob({
    name: { text: "Luis Ochoa Morales" },
    title: { text: "SAP Functional Consultant" },
    contact: { email: "luis@example.com", phone: "555-0100", location: "Montréal, Québec" },
    profile: { text: "Evidence-backed SAP delivery profile." },
    skills: [{ text: "SAP S/4HANA" }, { text: "Requirements analysis" }],
    experience: [{
      role: { text: "Solution Architect" },
      company: { text: "Example Canada" },
      dates: { text: "2022 – 2024" },
      bullets: [{ text: "Led integration testing." }],
    }],
  });
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const documentXml = await zip.file("word/document.xml").async("string");

  assert.doesNotMatch(documentXml, /\[object Object\]/);
  assert.match(documentXml, /Luis Ochoa Morales/);
  assert.match(documentXml, /luis@example\.com/);
  assert.match(documentXml, /Led integration testing\./);
});
