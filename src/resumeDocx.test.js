import assert from "node:assert/strict";
import test from "node:test";

import { createResumeDocxBlob, normalizeDocxRuns } from "./resumeDocx.js";

test("DOCX text runs preserve structured text instead of serializing objects", () => {
  const runs = normalizeDocxRuns({ text: "Luis Ochoa Morales", bold: true, size: 32 });
  assert.deepEqual(runs, [{ text: "Luis Ochoa Morales", bold: true, size: 32 }]);
  assert.doesNotMatch(runs[0].text, /\[object Object\]/);
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
