import assert from "node:assert/strict";
import test from "node:test";

import { classifyDocxExportError, docxExportErrorMessage } from "./resumeExportErrors.js";

test("DOCX export errors expose actionable categories without résumé content", () => {
  const cases = [
    [new Error("Failed to fetch dynamically imported module"), "stale_exporter", /refresh the page/i],
    [new Error("The résumé export authorization is stale"), "invalid_content", /verified export state/i],
    [new Error("URL.createObjectURL is unavailable"), "browser_download", /download permissions/i],
    [new Error("DOCX Packer serialization failed"), "serialization", /serialize safely/i],
    [new Error("Unexpected failure"), "unknown", /draft is unchanged/i],
  ];

  for (const [error, category, messagePattern] of cases) {
    assert.equal(classifyDocxExportError(error), category);
    const message = docxExportErrorMessage(error);
    assert.match(message, messagePattern);
    assert.doesNotMatch(message, /\[object Object\]|undefined|null/i);
  }
});
