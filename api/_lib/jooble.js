import { createHash } from "node:crypto";

import {
  classifyListingTitle,
  normalizeWorkArrangement,
} from "../../src/listingCategories.js";
import { toStructuredLocationPatch } from "../../src/listingLocations.js";

export const JOOBLE_COUNTRY = "CA";
export const JOOBLE_RESULTS_PER_REQUEST = 50;
export const JOOBLE_MAX_DAYS_OLD = 30;
export const JOOBLE_REQUEST_BUDGET = 18;
export const JOOBLE_STALE_AFTER_DAYS = 45;

const JOOBLE_API_ROOT = "https://jooble.org/api";

const SEARCHES = [
  { category: "tech", keywords: "software developer IT support engineer" },
  { category: "trades", keywords: "plumber electrician carpenter welder HVAC construction" },
  { category: "home_services", keywords: "handyman landscaping cleaner property maintenance" },
  { category: "admin", keywords: "administrative assistant data entry virtual assistant" },
  { category: "customer_service", keywords: "customer service call centre support" },
  { category: "business", keywords: "operations manager project manager business analyst" },
  { category: "finance", keywords: "accounting finance bookkeeper payroll" },
  { category: "sales", keywords: "sales account executive business development" },
  { category: "marketing", keywords: "marketing advertising social media communications" },
  { category: "logistics", keywords: "warehouse logistics delivery driver general labour" },
  { category: "hospitality", keywords: "hospitality retail cook server" },
  { category: "care", keywords: "healthcare caregiver education teacher" },
];

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function clean(value) {
  return String(value || "").trim();
}

function cleanSnippet(value) {
  return clean(value)
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function isoDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function daysBefore(now, days) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function deterministicJoobleListingId(externalId) {
  const bytes = createHash("sha256")
    .update(`jooble:${externalId}`)
    .digest()
    .subarray(0, 16);

  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function buildJoobleSearchPlan() {
  return SEARCHES.map((search) => ({ ...search }));
}

function createRequestBudget(limit = JOOBLE_REQUEST_BUDGET) {
  let used = 0;
  return {
    consume() {
      if (used >= limit) throw new Error("Jooble request budget exhausted");
      used += 1;
    },
    get used() {
      return used;
    },
  };
}

async function requestJson(endpoint, body, {
  budget,
  fetchImpl,
  retries = 0,
  wait = (delay) => new Promise((resolve) => setTimeout(resolve, delay)),
}) {
  let attempt = 0;
  while (true) {
    budget.consume();
    let response;
    try {
      response = await fetchImpl(endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      if (attempt >= retries) throw new Error("Jooble request failed");
      attempt += 1;
      await wait(250 * attempt);
      continue;
    }

    if (response.ok) return response.json();

    const retriable = response.status === 429 || response.status >= 500;
    if (!retriable || attempt >= retries) {
      throw new Error(`Jooble returned HTTP ${response.status}`);
    }
    attempt += 1;
    await wait(250 * attempt);
  }
}

export async function fetchJoobleListings({
  apiKey,
  fetchImpl = globalThis.fetch,
  now = new Date(),
  requestLimit = JOOBLE_REQUEST_BUDGET,
  wait,
}) {
  const budget = createRequestBudget(requestLimit);
  const endpoint = `${JOOBLE_API_ROOT}/${encodeURIComponent(apiKey)}`;
  const plan = buildJoobleSearchPlan();
  const received = [];
  const failures = [];

  for (const search of plan) {
    try {
      const payload = await requestJson(endpoint, {
        keywords: search.keywords,
        location: "Canada",
        page: "1",
        ResultOnPage: String(JOOBLE_RESULTS_PER_REQUEST),
        SearchMode: "0",
        companysearch: "false",
      }, { budget, fetchImpl, retries: 1, wait });

      for (const result of payload?.jobs || []) {
        received.push({ result, sourceCategory: search.category });
      }
    } catch (error) {
      failures.push({ keywords: search.keywords, message: error.message });
      if (error.message === "Jooble request budget exhausted") break;
    }
  }

  const cutoff = new Date(daysBefore(now, JOOBLE_MAX_DAYS_OLD));
  const fresh = received.filter(({ result }) => {
    const updated = new Date(result?.updated);
    return !Number.isNaN(updated.getTime()) && updated >= cutoff;
  });
  const deduplicated = new Map();
  for (const item of fresh) {
    const externalId = clean(item.result?.id);
    if (externalId && !deduplicated.has(externalId)) deduplicated.set(externalId, item);
  }

  return {
    items: [...deduplicated.values()],
    stats: {
      requests: budget.used,
      searches: plan.length,
      received: received.length,
      fresh: fresh.length,
      unique: deduplicated.size,
      failures,
    },
  };
}

export function mapJoobleResult(result, sourceCategory, { now = new Date() } = {}) {
  const externalId = clean(result?.id);
  const title = cleanSnippet(result?.title);
  const url = clean(result?.link);
  if (!externalId || !title || !url) return null;

  const classification = classifyListingTitle(title, sourceCategory || "other");
  const jobType = normalizeWorkArrangement(result?.type, title);
  const location = cleanSnippet(result?.location) || "Canada";
  const postedAt = isoDate(result?.updated);
  if (!postedAt) return null;

  const structuredLocation = toStructuredLocationPatch({
    source: "jooble",
    title,
    location,
    country_code: JOOBLE_COUNTRY,
  });
  const explicitType = jobType !== "unlabeled";

  return {
    source: "jooble",
    external_id: externalId,
    title,
    company: cleanSnippet(result?.company) || "Unknown",
    location,
    category: classification.category,
    job_type: jobType,
    tier: classification.confidence === "high" && explicitType ? "HIGH" : "MEDIUM",
    reason: explicitType
      ? `Explicitly ${jobType}, matched ${classification.category} from Jooble`
      : `Matched ${classification.category} from Jooble`,
    url,
    description: cleanSnippet(result?.snippet).slice(0, 12_000) || null,
    posted_at: postedAt,
    fetched_at: now.toISOString(),
    ...structuredLocation,
  };
}

async function loadExistingJoobleIds(supabase, externalIds) {
  const existing = new Map();
  for (const ids of chunk(externalIds, 200)) {
    const { data, error } = await supabase
      .from("listings")
      .select("id,external_id")
      .eq("source", "jooble")
      .in("external_id", ids);
    if (error) throw new Error(`Could not load existing Jooble listings: ${error.message}`);
    for (const row of data || []) existing.set(String(row.external_id), row.id);
  }
  return existing;
}

async function upsertJoobleRows(supabase, rows) {
  for (const batch of chunk(rows, 100)) {
    const { error } = await supabase.from("listings").upsert(batch);
    if (error) throw new Error(`Could not save Jooble listings: ${error.message}`);
  }
}

async function pruneStaleJoobleRows(supabase, cutoff) {
  const oldDated = await supabase
    .from("listings")
    .delete({ count: "exact" })
    .eq("source", "jooble")
    .lt("posted_at", cutoff);
  if (oldDated.error) throw new Error(`Could not prune stale Jooble listings: ${oldDated.error.message}`);

  const oldUndated = await supabase
    .from("listings")
    .delete({ count: "exact" })
    .eq("source", "jooble")
    .is("posted_at", null)
    .lt("fetched_at", cutoff);
  if (oldUndated.error) throw new Error(`Could not prune undated Jooble listings: ${oldUndated.error.message}`);

  return (oldDated.count || 0) + (oldUndated.count || 0);
}

export async function runJoobleIngestion({
  supabase,
  apiKey,
  fetchImpl = globalThis.fetch,
  now = new Date(),
  wait,
}) {
  const feed = await fetchJoobleListings({ apiKey, fetchImpl, now, wait });
  const mapped = feed.items
    .map(({ result, sourceCategory }) => mapJoobleResult(result, sourceCategory, { now }))
    .filter(Boolean);

  if (mapped.length === 0) {
    throw new Error("Jooble returned no valid fresh Canadian listings; existing data was left unchanged");
  }

  const existing = await loadExistingJoobleIds(
    supabase,
    mapped.map((row) => row.external_id),
  );
  const rows = mapped.map((row) => ({
    ...row,
    id: existing.get(row.external_id) || deterministicJoobleListingId(row.external_id),
  }));

  await upsertJoobleRows(supabase, rows);
  const pruned = await pruneStaleJoobleRows(
    supabase,
    daysBefore(now, JOOBLE_STALE_AFTER_DAYS),
  );

  return {
    ...feed.stats,
    saved: rows.length,
    inserted: rows.length - existing.size,
    updated: existing.size,
    pruned,
  };
}
