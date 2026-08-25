import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("the app wordmark is a flat home link rather than an oversized glass pill", async () => {
  const source = await readFile(new URL("./App.jsx", import.meta.url), "utf8");
  const shellBrand = source.match(/<Link to="\/" className="wl-brand-link"[\s\S]*?<\/Link>/)?.[0] || "";

  assert.match(shellBrand, /aria-label="Gigscapes home"/);
  assert.match(shellBrand, /<BrandMark size=\{24\}/);
  assert.doesNotMatch(shellBrand, /wl-glass|borderRadius|boxShadow|background:/);
  assert.match(source, /\.wl-brand-link\s*\{[\s\S]*min-height:\s*44px/);
});

test("workspace source copy does not claim unconfigured feeds are live", async () => {
  const source = await readFile(new URL("./App.jsx", import.meta.url), "utf8");

  assert.match(source, /Searching available Canadian and remote sources/);
  assert.match(source, /Sources may include:/);
  assert.doesNotMatch(source, /Scanning We Work Remotely/);
  assert.doesNotMatch(source, /Live feeds:/);
});
