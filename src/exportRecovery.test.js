import assert from "node:assert/strict";
import test from "node:test";

import { createExportModuleLoader } from "./exportModules.js";
import { classifyExportError, createExportErrorNotice } from "./exportRecovery.js";

test("export failures use safe actionable categories for every file format", () => {
  const cases = [
    [new TypeError("Failed to fetch dynamically imported module: https://gigscapes.com/assets/coverLetterPdf-DvrBhq1C.js"), "stale_exporter"],
    [new Error("ChunkLoadError: Loading chunk 714 failed"), "stale_exporter"],
    [new Error("The résumé export authorization is stale"), "invalid_content"],
    [new Error("URL.createObjectURL is unavailable"), "browser_download"],
    [new Error("jsPDF serialization failed"), "serialization"],
    [new Error("Unexpected failure"), "unknown"],
  ];

  for (const [error, category] of cases) {
    assert.equal(classifyExportError(error), category);
    const notice = createExportErrorNotice(error, { artifact: "cover letter", format: "PDF" });
    assert.equal(notice.category, category);
    assert.equal(notice.type, "error");
    assert.ok(notice.text.length > 20);
    assert.doesNotMatch(notice.text, /https?:\/\/|assets\/|DvrBhq1C|dynamically imported module|ChunkLoadError/i);
  }
});

test("stale résumé recovery preserves wording before an explicit refresh", () => {
  const notice = createExportErrorNotice(new Error("Importing a module script failed"), { artifact: "résumé", format: "DOCX/PDF" });
  assert.equal(notice.refreshRequired, true);
  assert.match(notice.text, /saved base résumé is safe/i);
  assert.match(notice.text, /copy it before refreshing/i);
  assert.match(notice.text, /regenerate the draft/i);
});

test("stale cover-letter recovery explains browser-saved draft safety", () => {
  const notice = createExportErrorNotice(new Error("Failed to fetch dynamically imported module"), { artifact: "cover letter", format: "DOCX" });
  assert.equal(notice.refreshRequired, true);
  assert.match(notice.text, /browser-saved cover-letter draft are safe/i);
  assert.match(notice.text, /refresh Gigscapes/i);
});

test("export module loaders cache success and reset after a failed load", async () => {
  let successfulCalls = 0;
  const successfulLoader = createExportModuleLoader(async () => {
    successfulCalls += 1;
    return { ready: true };
  });
  const [first, second] = await Promise.all([successfulLoader(), successfulLoader()]);
  assert.equal(successfulCalls, 1);
  assert.equal(first, second);
  assert.deepEqual(await successfulLoader.preload(), { status: "ready", error: null });
  assert.equal(successfulCalls, 1);

  let retryCalls = 0;
  const retryableLoader = createExportModuleLoader(async () => {
    retryCalls += 1;
    if (retryCalls === 1) throw new Error("Failed to fetch dynamically imported module");
    return { ready: true };
  });
  const preloadResult = await retryableLoader.preload();
  assert.equal(preloadResult.status, "failed");
  assert.equal(classifyExportError(preloadResult.error), "stale_exporter");
  assert.deepEqual(await retryableLoader(), { ready: true });
  assert.equal(retryCalls, 2);
});
