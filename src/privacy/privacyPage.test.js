import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("./PrivacyPage.jsx", import.meta.url), "utf8");
const processingDialog = readFileSync(new URL("../PrivateProcessingDialog.jsx", import.meta.url), "utf8");
const main = readFileSync(new URL("../main.jsx", import.meta.url), "utf8");
const vercelConfig = JSON.parse(readFileSync(new URL("../../vercel.json", import.meta.url), "utf8"));

test("privacy notice is public, versioned, and covers the real processing boundaries", () => {
  assert.match(main, /path="\/privacy"/);
  assert.match(page, /Browser-only storage is the default/i);
  assert.match(page, /explicitly turn on cross-device résumé sync/i);
  assert.match(page, /not end-to-end encrypted/i);
  assert.match(page, /Supabase/);
  assert.match(page, /Anthropic/);
  assert.match(page, /Vercel Web Analytics/);
  assert.match(page, /selected country \(Canada or United States\)/i);
  assert.match(page, /whether the search returned results, returned no results, or failed/i);
  assert.match(page, /never includes your search terms, city, résumé, posting, contact details, or other free-form content/i);
  assert.match(page, /not submitted to an employer/i);
  assert.match(page, /does not send the full résumé/i);
  assert.match(page, /cannot affect tailoring until the person approves it/i);
  assert.match(page, /query strings and fragments/i);
  assert.match(page, /180 days/i);
  assert.doesNotMatch(page, /privacy@gigscapes\.com|Example Operator/i);
});

test("privacy notice supports direct production navigation", () => {
  assert.ok(vercelConfig.rewrites.some(({ source, destination }) => source === "/privacy" && destination === "/index.html"));
});

test("just-in-time processing copy stays provider-neutral while the privacy notice names current subprocessors", () => {
  assert.match(processingDialog, /configured AI processing provider/i);
  assert.match(processingDialog, /Current AI providers and their purposes are identified in the Privacy Notice/i);
  assert.doesNotMatch(processingDialog, /Anthropic|OpenAI/);
  assert.match(page, /Anthropic/);
});
