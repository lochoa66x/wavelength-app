import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { QUALITY_SIGNAL_VALUES } from "../src/qualitySignalContract.js";

const migrationUrl = new URL("../supabase/migrations/20260825222730_quality_signal_daily_aggregates.sql", import.meta.url);

test("quality aggregate migration keeps data private and the RPC service-only", async () => {
  const sql = await readFile(migrationUrl, "utf8");
  assert.match(sql, /gigscapes_private\.quality_signal_daily_aggregates/);
  assert.match(sql, /enable row level security/i);
  assert.match(sql, /revoke all on table[\s\S]+from public, anon, authenticated/i);
  assert.match(sql, /security invoker/i);
  assert.match(sql, /set search_path = ''/i);
  assert.match(sql, /revoke all on function[\s\S]+from public, anon, authenticated/i);
  assert.match(sql, /grant execute on function[\s\S]+to service_role/i);
  assert.doesNotMatch(sql, /security definer/i);
  assert.doesNotMatch(sql, /^\s*(?:user_id|listing_id|resume|email|phone|url|description)\s+/im);
  for (const value of Object.values(QUALITY_SIGNAL_VALUES).flat()) {
    assert.equal(sql.includes(`'${value}'`), true, `migration is missing allowlisted value ${value}`);
  }
});
