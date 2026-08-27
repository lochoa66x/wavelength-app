import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(new URL("./App.jsx", import.meta.url), "utf8");

test("listing tailoring uses honest action copy and keeps generation explicit", () => {
  assert.match(source, /Review & tailor résumé/);
  assert.match(source, /Hide tailoring options/);
  assert.match(source, /Generate tailored version/);
  assert.doesNotMatch(source, /Tailor résumé & apply/);
});

test("listing tailoring controls expose and label the exact panel they toggle", () => {
  assert.match(source, /aria-expanded=\{isExpanded\}/);
  assert.match(source, /aria-controls=\{panelId\}/);
  assert.match(source, /id=\{panelId\}/);
  assert.match(source, /role="region"/);
  assert.match(source, /aria-labelledby=\{headingId\}/);
  assert.match(source, /tabIndex=\{-1\}/);
  assert.match(source, /Review and tailor for \{item\.title\}/);
});

test("signed-in and restored account actions reveal the selected listing panel", () => {
  assert.match(source, /showTailoringPanel\(listingStateKey\(listing\)\)/);
  assert.match(source, /continuation: \(\) => showTailoringPanel\(stateKey\)/);
  assert.match(source, /scheduleTailoringPanelReveal/);
  assert.match(source, /The selected listing is no longer in this search/);
});
