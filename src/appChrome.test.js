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

  assert.match(source, /Searching available/);
  assert.match(source, /marketDefinition\(marketCode\)/);
  assert.match(source, /Sources may include:/);
  assert.doesNotMatch(source, /Scanning We Work Remotely/);
  assert.doesNotMatch(source, /Live feeds:/);
});

test("job search exposes a visible and accessible in-progress state", async () => {
  const source = await readFile(new URL("./App.jsx", import.meta.url), "utf8");

  assert.match(source, /const searchIsLoading = listingsStatus === "loading"/);
  assert.match(source, /aria-busy=\{searchIsLoading\}/);
  assert.match(source, /role="status"/);
  assert.match(source, /Searching for positions…/);
  assert.match(source, /Searching live listings for “\{activeSearchLabel\}”/);
  assert.match(source, /<Loader2[^>]+className="wl-spin"/);
  assert.match(source, /disabled=\{searchIsDisabled\}/);
  assert.match(source, /searchIsLoading \? "Searching…" : "Search"/);
});

test("availability checks render successful and uncertain feedback outside tailoring", async () => {
  const source = await readFile(new URL("./App.jsx", import.meta.url), "utf8");

  assert.match(source, /availabilityCheck\?\.status === "done" \? "Check again"/);
  assert.match(source, /\{availabilityCheck && \(/);
  assert.match(source, /aria-live="polite"/);
  assert.match(source, /availabilityCheck\.message/);
  assert.match(source, /Open listing to confirm/);
});

test("bring-your-own-posting copy describes an open posting rather than a job already obtained", async () => {
  const source = await readFile(new URL("./App.jsx", import.meta.url), "utf8");

  assert.match(source, /Already have a job posting\?/);
  assert.doesNotMatch(source, /Already found a job\?/);
});

test("the US selector and results surface are fail-closed behind the controlled pilot boundary", async () => {
  const [app, markets, exposure] = await Promise.all([
    readFile(new URL("./App.jsx", import.meta.url), "utf8"),
    readFile(new URL("./markets.js", import.meta.url), "utf8"),
    readFile(new URL("./marketExposure.js", import.meta.url), "utf8"),
  ]);
  assert.match(markets, /United States \(pilot\)/);
  assert.match(exposure, /VITE_US_MARKET_ENABLED/);
  assert.match(exposure, /countryCode: "CA"/);
  assert.match(app, /PUBLIC_COUNTRY_OPTIONS/);
  assert.match(app, /enforceExposedLocationCriteria/);
  assert.match(app, /United States coverage is an early pilot/);
  assert.match(app, /does not infer those facts from your résumé/);
});

test("blocked source enrichment is presented as a calm preliminary-tailoring choice", async () => {
  const source = await readFile(new URL("./App.jsx", import.meta.url), "utf8");

  assert.match(source, /This source shared only a job summary/);
  assert.match(source, /Add the full posting for application-ready tailoring/);
  assert.match(source, /Tailor from summary/);
  assert.doesNotMatch(source, /\{t\.message \|\| "We need more of the original posting/);
});

test("ATS review uses one canonical readiness gate for significant evidence gaps", async () => {
  const source = await readFile(new URL("./AtsReview.jsx", import.meta.url), "utf8");

  assert.match(source, /significant_gap/);
  assert.match(source, /needs_full_posting/);
  assert.match(source, /review\.application_ready/);
  assert.doesNotMatch(source, /exportReadiness\?\.status === "ready"\s*\|\|\s*review\.application_ready/);
});
