import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("application intake exposes package, resume-only, and cover-letter-only choices", async () => {
  const [chooser, flow] = await Promise.all([
    readFile(new URL("./ApplicationWorkflowChooser.jsx", import.meta.url), "utf8"),
    readFile(new URL("./CustomJobFlow.jsx", import.meta.url), "utf8"),
  ]);

  assert.match(chooser, /What would you like to prepare\?/);
  assert.match(chooser, /APPLICATION_WORKFLOW_INTENTS/);
  assert.match(chooser, /role="radiogroup"/);
  assert.match(chooser, /minHeight: 44/);
  assert.match(flow, /<ApplicationWorkflowChooser/);
  assert.match(flow, /Prepare documents for a posting you found/);
});

test("cover-letter-only performs evidence analysis without creating a hidden resume", async () => {
  const [flow, client, api] = await Promise.all([
    readFile(new URL("./CustomJobFlow.jsx", import.meta.url), "utf8"),
    readFile(new URL("./tailorClient.js", import.meta.url), "utf8"),
    readFile(new URL("../api/tailor.js", import.meta.url), "utf8"),
  ]);

  assert.match(flow, /requestedIntent === "cover_letter_only"[\s\S]*analyzeResumeForApplication/);
  assert.match(flow, /tailored\.documentIntent !== "cover_letter_only" \? <ResumeExperience/);
  assert.match(flow, /resumeStatus="not_created"/);
  assert.match(flow, /Add tailored résumé/);
  assert.match(client, /analysisOnly: true/);
  assert.match(api, /if \(analysisOnly === true\)/);
  assert.ok(api.indexOf("if (analysisOnly === true)") < api.indexOf("const baseDraftPrompt"));
});

test("resume results surface the application summary and cover-letter action before the long preview", async () => {
  const [experience, actions] = await Promise.all([
    readFile(new URL("./ResumeExperience.jsx", import.meta.url), "utf8"),
    readFile(new URL("./ResumeActions.jsx", import.meta.url), "utf8"),
  ]);

  const summaryIndex = experience.indexOf("<ApplicationPackageSummary");
  const previewIndex = experience.indexOf("<ResumeDocumentPreview");
  assert.ok(summaryIndex >= 0 && summaryIndex < previewIndex);
  assert.match(experience, /<CoverLetterWorkspace/);
  assert.match(actions, /Create matching cover letter/);
  assert.match(actions, /Review cover letter/);
});

test("application package metadata stays browser-local and joins scoped deletion", async () => {
  const [storage, privacy] = await Promise.all([
    readFile(new URL("./applicationPackageStorage.js", import.meta.url), "utf8"),
    readFile(new URL("./privacyStorage.js", import.meta.url), "utf8"),
  ]);

  assert.match(storage, /globalThis\.localStorage/);
  assert.doesNotMatch(storage, /supabase|fetch\s*\(/i);
  assert.match(storage, /legacyCoverLetterPackages/);
  assert.match(privacy, /APPLICATION_PACKAGE_STORAGE_PREFIX/);
});
