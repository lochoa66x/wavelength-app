import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("template selector is compact, responsive, keyboard-semantic, and network-free", async () => {
  const source = await readFile(new URL("./ResumeTemplateSelector.jsx", import.meta.url), "utf8");
  assert.match(source, /Recommended:/);
  assert.match(source, /Change template/);
  assert.match(source, /aria-expanded/);
  assert.match(source, /aria-pressed/);
  assert.match(source, /<ul aria-label="ATS-safe résumé templates"/);
  assert.match(source, /<li key=\{template\.id\}/);
  assert.doesNotMatch(source, /<button[\s\S]{0,160}role="listitem"/);
  assert.match(source, /repeat\(auto-fit, minmax\(min\(210px, 100%\), 1fr\)\)/);
  assert.match(source, /minHeight: 40/);
  assert.match(source, /ATS-safe/);
  assert.match(source, /recommended/);
  assert.doesNotMatch(source, /tailorResume|authenticatedPost|fetch\s*\(/);
});

test("feed and bring-your-own-job flows share the canonical selector experience", async () => {
  const [experienceSource, customFlowSource] = await Promise.all([
    readFile(new URL("./ResumeExperience.jsx", import.meta.url), "utf8"),
    readFile(new URL("./CustomJobFlow.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(experienceSource, /<ResumeTemplateSelector/);
  assert.match(customFlowSource, /<ResumeExperience/);
  assert.doesNotMatch(customFlowSource, /ResumeTemplateProfessional|ResumeTemplateCareerChange|resumeTemplateKind/);
});

test("browser preview is single-column semantic text with print-friendly markers", async () => {
  const source = await readFile(new URL("./ResumeDocumentPreview.jsx", import.meta.url), "utf8");
  assert.match(source, /data-resume-preview/);
  assert.match(source, /data-resume-section/);
  assert.match(source, /data-resume-entry/);
  assert.match(source, /maxWidth: `\$\{tokens\.pageWidthIn\}in`/);
  assert.doesNotMatch(source, /<table|<canvas|<img|gridTemplateColumns/);
});

test("preliminary guidance stays outside the résumé while DOCX dependencies warm in advance", async () => {
  const [experienceSource, previewSource, actionsSource] = await Promise.all([
    readFile(new URL("./ResumeExperience.jsx", import.meta.url), "utf8"),
    readFile(new URL("./ResumeDocumentPreview.jsx", import.meta.url), "utf8"),
    readFile(new URL("./ResumeActions.jsx", import.meta.url), "utf8"),
  ]);
  const guidanceIndex = experienceSource.indexOf("Preliminary résumé");
  const previewIndex = experienceSource.indexOf("<ResumeDocumentPreview");

  assert.ok(guidanceIndex >= 0 && guidanceIndex < previewIndex);
  assert.match(experienceSource, /import\("\.\/resumeDocx\.js"\)/);
  assert.match(experienceSource, /prepareResumeDocxExport/);
  assert.match(experienceSource, /guidance is not included in the résumé file/i);
  assert.doesNotMatch(previewSource, /preliminaryNotice|PRELIMINARY DRAFT/);
  assert.match(actionsSource, /updated while this draft was open/i);
});
