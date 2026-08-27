import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("./PrivacyPage.jsx", import.meta.url), "utf8");
const main = readFileSync(new URL("../main.jsx", import.meta.url), "utf8");
const vercelConfig = JSON.parse(readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"));

test("privacy notice is public, versioned, and covers the real processing boundaries", () => {
  assert.match(main, /path="\/privacy"/);
  assert.match(page, /browser storage|saved only in this browser/i);
  assert.match(page, /Supabase/);
  assert.match(page, /Anthropic/);
  assert.match(page, /Vercel Web Analytics/);
  assert.match(page, /not submitted to an employer/i);
  assert.match(page, /query strings and fragments/i);
  assert.match(page, /180 days/i);
  assert.doesNotMatch(page, /privacy@gigscapes\.com|Example Operator/i);
});

test("privacy notice supports direct production navigation", () => {
  assert.ok(vercelConfig.rewrites.some(({ source, destination }) => source === "/privacy" && destination === "/index.html"));
});
