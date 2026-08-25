import { createClient } from "@supabase/supabase-js";
import { loadEnv } from "vite";

import { auditPublicListingQuality } from "../src/listingQualityAudit.js";

const fileEnv = loadEnv(process.env.NODE_ENV || "development", process.cwd(), "");
const env = { ...fileEnv, ...process.env };
const supabaseUrl = String(env.VITE_SUPABASE_URL || env.SUPABASE_URL || "").trim();
const publishableKey = String(
  env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY || "",
).trim();

if (!supabaseUrl || !publishableKey) {
  throw new Error("Public Supabase URL and publishable key are required for the source-quality audit");
}

const supabase = createClient(supabaseUrl, publishableKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});
const pageSize = 1_000;
const rowLimit = 10_000;
const rows = [];
let truncated = false;

for (let page = 0; rows.length < rowLimit; page += 1) {
  const from = page * pageSize;
  const { data, error } = await supabase
    .from("public_listings")
    .select("source,url,posted_at,description_snippet")
    .range(from, from + pageSize - 1);
  if (error) throw new Error(`Public listing audit query failed (${error.code || "unknown"})`);
  rows.push(...(data || []));
  if (!data || data.length < pageSize) break;
  if (rows.length >= rowLimit) truncated = true;
}

process.stdout.write(`${JSON.stringify({
  ...auditPublicListingQuality(rows.slice(0, rowLimit)),
  truncated,
  rowLimit,
}, null, 2)}\n`);
