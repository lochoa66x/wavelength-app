import assert from "node:assert/strict";
import test from "node:test";

import { createResumePrintDocument } from "./resumePdf.js";

test("PDF print document preserves the rendered preview as searchable HTML", () => {
  const preview = '<div data-resume-preview="professional" style="font-family: Georgia"><div>Luis Ochoa Morales</div><p>Evidence-backed SAP delivery profile.</p><ul><li>Led integration testing.</li></ul></div>';
  const html = createResumePrintDocument(preview, 'Luis & SAP <Résumé>');

  assert.ok(html.includes(preview));
  assert.match(html, /<title>Luis &amp; SAP &lt;Résumé&gt;<\/title>/);
  assert.match(html, /@page \{ size: Letter; margin: 0; \}/);
  assert.match(html, /ATS-safe résumé/);
  assert.doesNotMatch(html, /<canvas|data:image\//i);
  assert.doesNotMatch(html, /\[object Object\]/);
});

test("PDF export refuses to print without the browser preview", () => {
  assert.throws(() => createResumePrintDocument(""), /preview is unavailable/i);
});
