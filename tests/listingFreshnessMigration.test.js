import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationUrl = new URL("../supabase/migrations/20260830112954_add_listing_freshness_state.sql", import.meta.url);

test("listing freshness migration is drift-safe, least-privilege, and idempotent", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  for (const column of [
    "availability_status", "first_seen_at", "last_seen_at", "last_checked_at",
    "closed_at", "consecutive_misses", "availability_reason", "source_run_id",
    "source_scope", "last_miss_run_id", "valid_through",
  ]) {
    assert.match(sql, new RegExp(`add column if not exists ${column}\\b`, "i"));
  }
  assert.match(sql, /with \(security_invoker = true, security_barrier = true\)/i);
  assert.match(sql, /last_miss_run_id is distinct from p_run_id/i);
  assert.match(sql, /source_run_id is distinct from p_run_id/i);
  assert.match(sql, /revoke all on function public\.finalize_listing_source_run[\s\S]*from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function public\.finalize_listing_source_run[\s\S]*to service_role/i);
  assert.doesNotMatch(sql, /grant[\s\S]{0,80}(source_run_id|source_scope|consecutive_misses)[\s\S]{0,80}to anon/i);
  assert.doesNotMatch(sql, /delete\s+from\s+public\.listings/i);
});
