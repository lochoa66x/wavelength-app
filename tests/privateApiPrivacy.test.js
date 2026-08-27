import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const tailor = readFileSync(new URL("../api/tailor.js", import.meta.url), "utf8");
const intake = readFileSync(new URL("../api/job-intake.js", import.meta.url), "utf8");
const coverLetter = readFileSync(new URL("../api/cover-letter.js", import.meta.url), "utf8");
const tailorClient = readFileSync(new URL("../src/tailorClient.js", import.meta.url), "utf8");
const coverLetterClient = readFileSync(new URL("../src/coverLetterClient.js", import.meta.url), "utf8");

test("private APIs disable response and browser caching", () => {
  for (const source of [tailor, intake, coverLetter]) assert.match(source, /applyPrivateResponseHeaders\(res\)/);
  assert.match(tailorClient, /cache:\s*"no-store"/);
  assert.match(coverLetterClient, /cache:\s*"no-store"/);
});

test("private API operational logs do not serialize resume or upstream bodies", () => {
  assert.doesNotMatch(tailor, /Incomplete structured resume[\s\S]*JSON\.stringify\(resumeData\)/);
  assert.doesNotMatch(tailor, /message:\s*error\.message/);
  assert.doesNotMatch(tailor, /console\.(?:warn|error)[^\n]*item\.title/);
  assert.doesNotMatch(intake, /console\.error\("Job intake failed:",\s*error\.message\)/);
  assert.doesNotMatch(coverLetter, /console\.(?:warn|error)[^\n]*(?:resume|postingCorpus|candidateCorpus|item\.title)/i);
});
