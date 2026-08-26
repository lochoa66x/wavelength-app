import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("Evidence Map exposes progressive disclosure, filters, and separate readiness axes", async () => {
  const source = await readFile(new URL("./EvidenceMap.jsx", import.meta.url), "utf8");

  assert.match(source, /Application outlook/);
  assert.match(source, /Résumé document/);
  assert.match(source, /Application risk/);
  assert.match(source, /Evidence Map/);
  assert.match(source, /aria-pressed/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /The posting text is never used as candidate evidence/);
  assert.doesNotMatch(source, /match percentage|% match|ATS score/i);
});
