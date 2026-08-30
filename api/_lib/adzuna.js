import { createHash } from "node:crypto";

import {
  classifyListingTitle,
  normalizeWorkArrangement,
} from "../../src/listingCategories.js";
import { toStructuredLocationPatch } from "../../src/listingLocations.js";
import { LISTING_SOURCE_RUN_MODE, saveListingSourceRun } from "./listingFreshness.js";
import { selectDailyTechnologySearches } from "./technologySearches.js";

export const ADZUNA_COUNTRY = "ca";
export const ADZUNA_RESULTS_PER_REQUEST = 50;
export const ADZUNA_MAX_DAYS_OLD = 30;
export const ADZUNA_REQUEST_BUDGET = 24;
export const ADZUNA_STALE_AFTER_DAYS = 45;

const ADZUNA_API_ROOT = "https://api.adzuna.com/v1/api/jobs";

const CATEGORY_TARGETS = [
  { category: "tech", pattern: /\b(?:it|information technology|software)\b/i },
  { category: "tech", pattern: /\bengineering\b/i },
  { category: "trades", pattern: /\b(?:trade|construction)\b/i },
  { category: "home_services", pattern: /\b(?:maintenance|domestic|cleaning)\b/i },
  { category: "logistics", pattern: /\b(?:logistics|warehouse|transport|manufacturing)\b/i },
  { category: "admin", pattern: /\badmin(?:istrative)?\b/i },
  { category: "customer_service", pattern: /\bcustomer service\b/i },
  { category: "business", pattern: /\b(?:consultancy|management|human resources|recruitment)\b/i },
  { category: "finance", pattern: /\b(?:accounting|finance)\b/i },
  { category: "sales", pattern: /\bsales\b/i },
  { category: "marketing", pattern: /\b(?:pr|advertising|marketing)\b/i },
  { category: "hospitality", pattern: /\b(?:hospitality|catering)\b/i },
  { category: "hospitality", pattern: /\bretail\b/i },
  { category: "care", pattern: /\b(?:healthcare|nursing|social work)\b/i },
  { category: "care", pattern: /\bteaching\b/i },
];

const FALLBACK_SEARCHES = [
  { category: "tech", whatOr: "software developer IT support engineer" },
  { category: "trades", whatOr: "plumber electrician carpenter welder HVAC construction" },
  { category: "home_services", whatOr: "handyman landscaping cleaner property maintenance" },
  { category: "admin", whatOr: "administrative assistant data entry virtual assistant" },
  { category: "customer_service", whatOr: "customer service call centre support" },
  { category: "business", whatOr: "operations manager project manager business analyst" },
  { category: "finance", whatOr: "accounting finance bookkeeper payroll" },
  { category: "sales", whatOr: "sales account executive business development" },
  { category: "marketing", whatOr: "marketing advertising social media communications" },
  { category: "logistics", whatOr: "warehouse logistics delivery driver general labour" },
  { category: "hospitality", whatOr: "hospitality retail cook server" },
  { category: "care", whatOr: "healthcare caregiver education teacher" },
];

function clean(value) {
  return String(value || "").trim();
}

function isoDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function daysBefore(now, days) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function deterministicListingId(source, externalId) {
  const bytes = createHash("sha256")
    .update(`${source}:${externalId}`)
    .digest()
    .subarray(0, 16);

  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function selectRelevantAdzunaCategories(payload) {
  const categories = Array.isArray(payload) ? payload : payload?.results || [];
  const selectedTags = new Set();
  const selected = [];

  for (const target of CATEGORY_TARGETS) {
    const match = categories.find((candidate) => {
      const tag = clean(candidate?.tag);
      return tag && !selectedTags.has(tag) && target.pattern.test(clean(candidate?.label));
    });
    if (!match) continue;
    selectedTags.add(match.tag);
    selected.push({
      category: target.category,
      label: clean(match.label),
      tag: clean(match.tag),
    });
  }

  return selected;
}

export function buildAdzunaSearchPlan(categories = [], now = new Date()) {
  const discovered = [];
  const discoveredCategories = new Set();
  for (const item of categories) {
    if (discoveredCategories.has(item.category)) continue;
    discoveredCategories.add(item.category);
    discovered.push(item);
    if (discovered.length >= 12) break;
  }

  const broadSearches = discovered.length > 0
    ? discovered.map(({ category, label, tag }) => ({
      category,
      label,
      params: { category: tag },
    }))
    : FALLBACK_SEARCHES.map(({ category, whatOr }) => ({
      category,
      label: whatOr,
      params: { what_or: whatOr },
    }));

  const technologySearches = selectDailyTechnologySearches(now).map(({ category, label, keywords }) => ({
    category,
    label,
    params: { what_or: keywords },
  }));

  return [...broadSearches, ...technologySearches];
}

function adzunaUrl(path, credentials, params = {}) {
  const url = new URL(`${ADZUNA_API_ROOT}/${ADZUNA_COUNTRY}/${path}`);
  url.searchParams.set("app_id", credentials.appId);
  url.searchParams.set("app_key", credentials.appKey);
  url.searchParams.set("content-type", "application/json");
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}

function createRequestBudget(limit = ADZUNA_REQUEST_BUDGET) {
  let used = 0;
  return {
    consume() {
      if (used >= limit) throw new Error("Adzuna request budget exhausted");
      used += 1;
    },
    get used() {
      return used;
    },
  };
}

async function requestJson(url, {
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
      response = await fetchImpl(url, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      if (attempt >= retries) throw new Error("Adzuna request failed");
      attempt += 1;
      await wait(250 * attempt);
      continue;
    }
    if (response.ok) return response.json();

    const retriable = response.status === 429 || response.status >= 500;
    if (!retriable || attempt >= retries) {
      throw new Error(`Adzuna returned HTTP ${response.status}`);
    }
    attempt += 1;
    await wait(250 * attempt);
  }
}

export async function fetchAdzunaListings({
  credentials,
  fetchImpl = globalThis.fetch,
  now = new Date(),
  requestLimit = ADZUNA_REQUEST_BUDGET,
  wait,
}) {
  const budget = createRequestBudget(requestLimit);
  let categories = [];

  try {
    const categoryPayload = await requestJson(
      adzunaUrl("categories", credentials),
      { budget, fetchImpl, wait },
    );
    categories = selectRelevantAdzunaCategories(categoryPayload);
  } catch (error) {
    // Category discovery is an optimization. Curated keyword searches keep the
    // daily importer useful if this optional Adzuna endpoint is unavailable.
    if (error.message === "Adzuna request budget exhausted") throw error;
  }

  const plan = buildAdzunaSearchPlan(categories, now);
  const received = [];
  const failures = [];

  for (const search of plan) {
    try {
      const payload = await requestJson(
        adzunaUrl("search/1", credentials, {
          ...search.params,
          results_per_page: ADZUNA_RESULTS_PER_REQUEST,
          max_days_old: ADZUNA_MAX_DAYS_OLD,
          sort_by: "date",
        }),
        { budget, fetchImpl, retries: 1, wait },
      );
      for (const result of payload?.results || []) {
        received.push({ result, sourceCategory: search.category });
      }
    } catch (error) {
      failures.push({ label: search.label, message: error.message });
      if (error.message === "Adzuna request budget exhausted") break;
    }
  }

  const cutoff = new Date(daysBefore(now, ADZUNA_MAX_DAYS_OLD));
  const fresh = received.filter(({ result }) => {
    const created = new Date(result?.created);
    return !Number.isNaN(created.getTime()) && created >= cutoff;
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
      discoveredCategories: categories.length,
      received: received.length,
      fresh: fresh.length,
      unique: deduplicated.size,
      failures,
    },
  };
}

export function mapAdzunaResult(result, sourceCategory, { now = new Date() } = {}) {
  const externalId = clean(result?.id);
  const title = clean(result?.title);
  const url = clean(result?.redirect_url);
  if (!externalId || !title || !url) return null;

  const sourceFallback = sourceCategory || "other";
  const classification = classifyListingTitle(title, sourceFallback);
  const rawType = [result?.contract_time, result?.contract_type]
    .filter(Boolean)
    .join(" ")
    .replaceAll("_", " ");
  const jobType = normalizeWorkArrangement(rawType, title);
  const location = clean(result?.location?.display_name) || "Canada";
  const postedAt = isoDate(result?.created);
  if (!postedAt) return null;

  const structuredLocation = toStructuredLocationPatch({
    source: "adzuna",
    title,
    location,
    country_code: "CA",
  });
  const explicitType = jobType !== "unlabeled";
  const description = clean(result?.description).slice(0, 12_000) || null;

  return {
    source: "adzuna",
    external_id: externalId,
    title,
    company: clean(result?.company?.display_name) || "Unknown",
    location,
    category: classification.category,
    job_type: jobType,
    tier: classification.confidence === "high" && explicitType ? "HIGH" : "MEDIUM",
    reason: explicitType
      ? `Explicitly ${jobType}, matched ${classification.category} from Adzuna`
      : `Matched ${classification.category} from Adzuna`,
    url,
    description,
    description_snippet: description?.slice(0, 1_200) || null,
    posted_at: postedAt,
    fetched_at: now.toISOString(),
    ...structuredLocation,
  };
}

export async function runAdzunaIngestion({
  supabase,
  credentials,
  fetchImpl = globalThis.fetch,
  now = new Date(),
  wait,
}) {
  const feed = await fetchAdzunaListings({ credentials, fetchImpl, now, wait });
  const mapped = feed.items
    .map(({ result, sourceCategory }) => mapAdzunaResult(result, sourceCategory, { now }))
    .filter(Boolean);

  if (mapped.length === 0) {
    throw new Error("Adzuna returned no valid fresh Canadian listings; existing data was left unchanged");
  }

  const saved = await saveListingSourceRun({
    supabase,
    source: "adzuna",
    rows: mapped,
    // Ranked first-page searches and rotating technology queries are positive
    // observations, never a complete Adzuna inventory.
    runMode: feed.stats.failures.length > 0
      ? LISTING_SOURCE_RUN_MODE.PARTIAL
      : LISTING_SOURCE_RUN_MODE.OBSERVATION_ONLY,
    now,
  });

  return {
    ...feed.stats,
    ...saved,
  };
}
