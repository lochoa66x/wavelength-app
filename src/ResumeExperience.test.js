import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("template selector is compact, responsive, keyboard-semantic, and network-free", async () => {
  const source = await readFile(new URL("./ResumeExperience.jsx", import.meta.url), "utf8");
  assert.match(source, /Recommended:/);
  assert.match(source, /Change template/);
  assert.match(source, /aria-expanded/);
  assert.match(source, /aria-pressed/);
  assert.match(source, /<ul aria-label="ATS-safe résumé templates"/);
  assert.match(source, /<li key=\{template\.id\}/);
  assert.doesNotMatch(source, /<button[\s\S]{0,160}role="listitem"/);
  assert.match(source, /repeat\(auto-fit, minmax\(210px, 1fr\)\)/);
  assert.match(source, /minHeight: 40/);
  assert.match(source, /ATS-safe/);
  assert.doesNotMatch(source, /tailorResume|authenticatedPost|fetch\s*\(/);
});

test("browser preview is single-column semantic text with print-friendly markers", async () => {
  const source = await readFile(new URL("./ResumeDocumentPreview.jsx", import.meta.url), "utf8");
  assert.match(source, /data-resume-preview/);
  assert.match(source, /data-resume-section/);
  assert.match(source, /data-resume-entry/);
  assert.match(source, /maxWidth: `\$\{tokens\.pageWidthIn\}in`/);
  assert.doesNotMatch(source, /<table|<canvas|<img|gridTemplateColumns/);
});
