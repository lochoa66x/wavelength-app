import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("design selector separates strategy from visual choice and stays network-free", async () => {
  const source = await readFile(new URL("./ResumeDesignSelector.jsx", import.meta.url), "utf8");
  assert.match(source, /Content approach:/);
  assert.match(source, /Choose résumé style/);
  assert.match(source, /aria-expanded/);
  assert.match(source, /aria-pressed/);
  assert.match(source, /Changing the résumé style below never changes your facts/);
  assert.match(source, /Available visual résumé styles/);
  assert.match(source, /Colour palette/);
  assert.match(source, /Evidence density/);
  assert.match(source, /Header alignment/);
  assert.match(source, /Target length/);
  assert.match(source, /never permission to delete evidence/);
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

test("preliminary guidance stays outside the résumé while all export dependencies warm safely", async () => {
  const [experienceSource, previewSource, actionsSource, coverLetterSource, modulesSource, recoverySource, noticeSource] = await Promise.all([
    readFile(new URL("./ResumeExperience.jsx", import.meta.url), "utf8"),
    readFile(new URL("./ResumeDocumentPreview.jsx", import.meta.url), "utf8"),
    readFile(new URL("./ResumeActions.jsx", import.meta.url), "utf8"),
    readFile(new URL("./CoverLetterWorkspace.jsx", import.meta.url), "utf8"),
    readFile(new URL("./exportModules.js", import.meta.url), "utf8"),
    readFile(new URL("./exportRecovery.js", import.meta.url), "utf8"),
    readFile(new URL("./ExportStatusNotice.jsx", import.meta.url), "utf8"),
  ]);
  const guidanceIndex = experienceSource.indexOf("data-export-state");
  const previewIndex = experienceSource.indexOf("<ResumeDocumentPreview");

  assert.ok(guidanceIndex >= 0 && guidanceIndex < previewIndex);
  assert.match(experienceSource, /getResumeExportNotice/);
  assert.match(experienceSource, /data-export-state/);
  assert.match(experienceSource, /guidance is not included in the résumé file/i);
  assert.doesNotMatch(previewSource, /preliminaryNotice|PRELIMINARY DRAFT/);
  assert.match(actionsSource, /preloadResumeExporters/);
  assert.match(actionsSource, /loadResumeDocxExporter/);
  assert.match(actionsSource, /loadResumePdfExporter/);
  assert.match(coverLetterSource, /preloadCoverLetterExporters/);
  assert.match(coverLetterSource, /loadCoverLetterDocxExporter/);
  assert.match(coverLetterSource, /loadCoverLetterPdfExporter/);
  assert.match(modulesSource, /import\("\.\/resumeDocx\.js"\)/);
  assert.match(modulesSource, /import\("\.\/resumePdf\.js"\)/);
  assert.match(modulesSource, /import\("\.\/coverLetterDocx\.js"\)/);
  assert.match(modulesSource, /import\("\.\/coverLetterPdf\.js"\)/);
  assert.match(recoverySource, /copy it before refreshing/i);
  assert.doesNotMatch(recoverySource, /https?:\/\//i);
  assert.match(noticeSource, /Refresh Gigscapes/);
  assert.match(noticeSource, /globalThis\.location\?\.reload/);
});
