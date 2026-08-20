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

const { data: rows, error } = await supabase
  .from("listings")
  .select("*")
  .order("fetched_at", { ascending: false })
  .limit(1000);

if (error) throw error;

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
