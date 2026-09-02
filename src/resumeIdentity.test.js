import test from "node:test";
import assert from "node:assert/strict";

import { resumeIdentityFromText } from "./resumeIdentity.js";

test("resume identity uses only exact header text", () => {
  assert.deepEqual(resumeIdentityFromText("Avery Chen\navery@example.com · 416-555-1234\nProfessional Summary\nCoordinator"), {
    name: "Avery Chen",
    contact: "avery@example.com · 416-555-1234",
  });
});

test("resume identity refuses headings and placeholders as names", () => {
  assert.equal(resumeIdentityFromText("RESUME\nPROFESSIONAL SUMMARY\nExperience").name, "");
  assert.equal(resumeIdentityFromText("Candidate\ncandidate@example.com").name, "");
  assert.equal(resumeIdentityFromText("RESUME\nIndustrial Electrician\nworker@example.com").name, "");
});
