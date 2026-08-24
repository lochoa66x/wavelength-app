import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const mainSource = readFileSync(new URL("../src/main.jsx", import.meta.url), "utf8");
const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const authSource = readFileSync(new URL("../src/auth.jsx", import.meta.url), "utf8");
const actionsSource = readFileSync(new URL("../src/ResumeActions.jsx", import.meta.url), "utf8");
const querySource = readFileSync(new URL("../src/listingQuery.js", import.meta.url), "utf8");
const configSource = readFileSync(new URL("../src/supabaseConfig.js", import.meta.url), "utf8");
const migrationSource = readFileSync(new URL("../supabase/migrations/20260824015935_expose_public_listing_discovery.sql", import.meta.url), "utf8");

test("/app renders the shared application without ProtectedRoute", () => {
  assert.match(mainSource, /path=\{`\$\{APP_PATH\}\/\*`\} element=\{<Gigscapes \/>\}/);
  assert.doesNotMatch(mainSource, /ProtectedRoute>[\s\S]*?<Gigscapes/);
});

test("guest discovery renders immediately and does not use a full-page auth loading step", () => {
  assert.match(appSource, /useState\("digest"\)/);
  assert.match(appSource, /Public search never waits for account initialization/);
});

test("guest search, geographic filters, workplace filters, pagination, and public links remain wired", () => {
  for (const marker of ["job-search-keyword", "LocationPreferenceFields", "WorkplaceTypeChips", "loadMoreListings", "View listing"]) {
    assert.match(appSource, new RegExp(marker));
  }
  assert.match(appSource, /target="_blank" rel="noreferrer"/);
});

test("guest profile synchronization has an explicit verified-user guard", () => {
  assert.match(appSource, /if \(!shouldLoadPrivateProfile\(session\)\)/);
  assert.match(appSource, /\.eq\("id", session\.user\.id\)/);
});

test("all private application entry points use the centralized account gate", () => {
  for (const action of [
    "save_job", "unsave_job", "edit_resume", "import_posting", "upload_posting_screenshots",
    "paste_posting", "tailor_resume", "add_evidence", "view_saved_jobs",
  ]) {
    assert.ok(appSource.includes(`"${action}"`), `${action} must be represented in the app gate`);
  }
  assert.ok((appSource.match(/requestAccountAction\(/g) || []).length >= 7);
});

test("DOCX, PDF, and copied text use the centralized account gate", () => {
  for (const action of ["download_docx", "download_pdf", "copy_tailored_text"]) {
    assert.match(actionsSource, new RegExp(`requestAccountAction\\(\\"${action}\\"`));
  }
});

test("account-action dialog has labels, modal semantics, escape handling, and focus containment", () => {
  assert.match(authSource, /role="dialog"/);
  assert.match(authSource, /aria-modal="true"/);
  assert.match(authSource, /aria-labelledby="account-action-title"/);
  assert.match(authSource, /event\.key === "Escape"/);
  assert.match(authSource, /event\.key !== "Tab"/);
});

test("public listing queries use an explicit view projection without wildcard selection", () => {
  assert.match(querySource, /PUBLIC_LISTING_RELATION = "public_listings"/);
  assert.doesNotMatch(querySource, /\.select\("\*"/);
  assert.doesNotMatch(querySource, /description_enrichment_error_code|description_content_hash|external_id/);
});

test("public listing migration combines explicit grants, RLS, and security-invoker view", () => {
  assert.match(migrationSource, /security_invoker = true/i);
  assert.match(migrationSource, /grant select[\s\S]*to anon, authenticated/i);
  assert.match(migrationSource, /enable row level security/i);
  assert.match(migrationSource, /for select\s+to anon, authenticated\s+using/i);
});

test("profile migration denies guests and enforces same-user SELECT and UPDATE", () => {
  assert.match(migrationSource, /revoke all on table public\.profiles from anon, authenticated/i);
  assert.match(migrationSource, /for select\s+to authenticated\s+using \(\(select auth\.uid\(\)\) = id\)/i);
  assert.match(migrationSource, /for update\s+to authenticated\s+using \(\(select auth\.uid\(\)\) = id\)\s+with check \(\(select auth\.uid\(\)\) = id\)/i);
  assert.doesNotMatch(migrationSource, /auth\.role\(\)|user_metadata|security definer/i);
});

test("frontend configuration has no service-role or secret-key fallback", () => {
  assert.doesNotMatch(configSource, /SERVICE_ROLE|SUPABASE_SECRET_KEY|sb_secret_/);
});
