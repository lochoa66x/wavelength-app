import { createClient } from "@supabase/supabase-js";
import {
  normalizeListingLocation,
  summarizeLocationCoverage,
  toStructuredLocationPatch,
} from "../src/listingLocations.js";

if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  process.loadEnvFile?.(".env.local");
}

const url = process.env.VITE_SUPABASE_URL;
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !publishableKey) {
  throw new Error("Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY before auditing locations.");
}

const supabase = createClient(url, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

const rows = [];
const pageSize = 1000;
for (let page = 0; ; page += 1) {
  const from = page * pageSize;
  const { data, error } = await supabase
    .from("public_listings")
    .select("id,title,location,source,city,region,country_code,location_type")
    .order("posted_at", { ascending: false })
    .order("id", { ascending: false })
    .range(from, from + pageSize - 1);

  if (error) throw error;
  rows.push(...(data || []));
  if (!data || data.length < pageSize) break;
}

const normalization = rows.reduce((summary, row) => {
  const location = normalizeListingLocation(row);
  const patch = toStructuredLocationPatch(row);
  const type = patch.location_type || "unknown";
  const country = patch.country_code || "none";

  summary.types[type] = (summary.types[type] || 0) + 1;
  summary.countries[country] = (summary.countries[country] || 0) + 1;
  summary.withCity += Number(Boolean(patch.city));
  summary.withRegion += Number(Boolean(patch.region));
  summary.withCountry += Number(Boolean(patch.country_code));
  summary.unresolved += Number(location.source === "unresolved");
  return summary;
}, {
  types: {},
  countries: {},
  withCity: 0,
  withRegion: 0,
  withCountry: 0,
  unresolved: 0,
});

console.log(JSON.stringify({
  total: rows.length,
  storedCoverage: summarizeLocationCoverage(rows),
  normalization,
}, null, 2));
