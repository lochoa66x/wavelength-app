import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("design selector separates strategy from visual choice and stays network-free", async () => {
  const source = await readFile(new URL("./ResumeDesignSelector.jsx", import.meta.url), "utf8");
  assert.match(source, /Recommended content strategy:/);
  assert.match(source, /Choose résumé design/);
  assert.match(source, /aria-expanded/);
  assert.match(source, /aria-pressed/);
  assert.match(source, /Changing the design below never changes your facts/);
  assert.match(source, /Available visual résumé designs/);
  assert.match(source, /ResumeDesignThumbnail/);
  assert.match(source, /<li key=\{design\.id\}/);
  assert.doesNotMatch(source, /<button[\s\S]{0,160}role="listitem"/);
  assert.match(source, /repeat\(auto-fit, minmax\(min\(250px, 100%\), 1fr\)\)/);
  assert.match(source, /minHeight: 44/);
  assert.match(source, /Application-safe/);
  assert.match(source, /Networking-forward/);
  assert.match(source, /recommended/);
  assert.doesNotMatch(source, /tailorResume|authenticatedPost|fetch\s*\(/);
});

test("feed and bring-your-own-job flows share the canonical selector experience", async () => {
  const [experienceSource, customFlowSource] = await Promise.all([
    readFile(new URL("./ResumeExperience.jsx", import.meta.url), "utf8"),
    readFile(new URL("./CustomJobFlow.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(experienceSource, /<ResumeDesignSelector/);
  assert.match(customFlowSource, /<ResumeExperience/);
  assert.doesNotMatch(customFlowSource, /ResumeTemplateProfessional|ResumeTemplateCareerChange|resumeTemplateKind/);
  assert.match(experienceSource, /<TailoringChangeReview/);
  assert.match(experienceSource, /onTailoringChangeDecision/);
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
  const [experienceSource, previewSource, actionsSource, errorSource] = await Promise.all([
    readFile(new URL("./ResumeExperience.jsx", import.meta.url), "utf8"),
    readFile(new URL("./ResumeDocumentPreview.jsx", import.meta.url), "utf8"),
    readFile(new URL("./ResumeActions.jsx", import.meta.url), "utf8"),
    readFile(new URL("./resumeExportErrors.js", import.meta.url), "utf8"),
  ]);
  const guidanceIndex = experienceSource.indexOf("data-export-state");
  const previewIndex = experienceSource.indexOf("<ResumeDocumentPreview");

  assert.ok(guidanceIndex >= 0 && guidanceIndex < previewIndex);
  assert.match(experienceSource, /import\("\.\/resumeDocx\.js"\)/);
  assert.match(experienceSource, /prepareResumeDocxExport/);
  assert.match(experienceSource, /getResumeExportNotice/);
  assert.match(experienceSource, /data-export-state/);
  assert.match(experienceSource, /guidance is not included in the résumé file/i);
  assert.doesNotMatch(previewSource, /preliminaryNotice|PRELIMINARY DRAFT/);
  assert.match(actionsSource, /docxExportErrorMessage/);
  assert.match(errorSource, /updated while this draft was open/i);
});
