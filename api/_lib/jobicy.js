import { createHash } from "node:crypto";

import {
  classifyListingTitle,
  guessCategoryFromKeyword,
  normalizeWorkArrangement,
} from "../../src/listingCategories.js";
import { toStructuredLocationPatch } from "../../src/listingLocations.js";

export const JOBICY_COUNTRY = "CA";
export const JOBICY_RESULTS_PER_REQUEST = 100;
export const JOBICY_MAX_DAYS_OLD = 45;
export const JOBICY_STALE_AFTER_DAYS = 60;

const JOBICY_API_URL = "https://jobicy.com/api/v2/remote-jobs";

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

function cleanHtml(value) {
  return clean(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
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

function jobExternalId(job) {
  return clean(job?.id || job?.jobId || job?.url || job?.jobUrl);
}

function canonicalUrl(job) {
  const value = clean(job?.url || job?.jobUrl);
  if (!value) return "";

  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    return parsed.protocol === "https:" && (hostname === "jobicy.com" || hostname.endsWith(".jobicy.com"))
      ? parsed.toString()
      : "";
  } catch {
    return "";
  }
}

function sourceCategory(job) {
  const industries = Array.isArray(job?.jobIndustry)
    ? job.jobIndustry
    : [job?.jobIndustry];
  return guessCategoryFromKeyword(industries.filter(Boolean).join(" ")) || "other";
}

export function deterministicJobicyListingId(externalId) {
  const bytes = createHash("sha256")
    .update(`jobicy:${externalId}`)
    .digest()
    .subarray(0, 16);

  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function buildJobicyFeedUrl() {
  const url = new URL(JOBICY_API_URL);
  url.searchParams.set("count", String(JOBICY_RESULTS_PER_REQUEST));
  url.searchParams.set("geo", "canada");
  return url;
}

export async function fetchJobicyListings({
  fetchImpl = globalThis.fetch,
  now = new Date(),
} = {}) {
  let response;
  try {
    response = await fetchImpl(buildJobicyFeedUrl(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "Gigscapes/1.0 (+https://gigscapes.com)",
      },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error("Jobicy request failed");
  }

  if (!response.ok) throw new Error(`Jobicy returned HTTP ${response.status}`);
  const payload = await response.json();
  const received = Array.isArray(payload?.jobs) ? payload.jobs : [];
  const cutoff = new Date(daysBefore(now, JOBICY_MAX_DAYS_OLD));
  const fresh = received.filter((job) => {
    const published = new Date(job?.pubDate || job?.publishedAt);
    return !Number.isNaN(published.getTime()) && published >= cutoff;
  });
  const deduplicated = new Map();

  for (const job of fresh) {
    const externalId = jobExternalId(job);
    if (externalId && !deduplicated.has(externalId)) deduplicated.set(externalId, job);
  }

  return {
    items: [...deduplicated.values()],
    stats: {
      requests: 1,
      received: received.length,
      fresh: fresh.length,
      unique: deduplicated.size,
    },
  };
}

export function mapJobicyResult(job, { now = new Date() } = {}) {
  const externalId = jobExternalId(job);
  const title = cleanHtml(job?.jobTitle || job?.title);
  const url = canonicalUrl(job);
  const postedAt = isoDate(job?.pubDate || job?.publishedAt);
  if (!externalId || !title || !url || !postedAt) return null;

  const classification = classifyListingTitle(title, sourceCategory(job));
  const rawJobType = Array.isArray(job?.jobType) ? job.jobType.join(" ") : job?.jobType;
  const jobType = normalizeWorkArrangement(rawJobType, title);
  const geo = cleanHtml(job?.jobGeo || job?.geo);
  const location = geo && !/^(?:remote|anywhere|worldwide)$/i.test(geo)
    ? `Remote, ${geo}`
    : "Remote, Canada";
  const structuredLocation = toStructuredLocationPatch({
    source: "jobicy",
    title,
    location,
    location_type: "remote",
    country_code: JOBICY_COUNTRY,
  });
  const explicitType = jobType !== "unlabeled";
  const description = cleanHtml(job?.jobDescription || job?.jobExcerpt).slice(0, 12_000);

  return {
    source: "jobicy",
    external_id: externalId,
    title,
    company: cleanHtml(job?.companyName || job?.company) || "Unknown",
    location,
    category: classification.category,
    job_type: jobType,
    tier: classification.confidence === "high" && explicitType ? "HIGH" : "MEDIUM",
    reason: explicitType
      ? `Explicitly ${jobType}, matched ${classification.category} from Jobicy`
      : `Matched ${classification.category} from Jobicy`,
    url,
    description: description || null,
    description_snippet: description.slice(0, 1_200) || null,
    posted_at: postedAt,
    fetched_at: now.toISOString(),
    ...structuredLocation,
  };
}

async function loadExistingJobicyIds(supabase, externalIds) {
  const existing = new Map();
  for (const ids of chunk(externalIds, 200)) {
    const { data, error } = await supabase
      .from("listings")
      .select("id,external_id")
      .eq("source", "jobicy")
      .in("external_id", ids);
    if (error) throw new Error(`Could not load existing Jobicy listings: ${error.message}`);
    for (const row of data || []) existing.set(String(row.external_id), row.id);
  }
  return existing;
}

async function upsertJobicyRows(supabase, rows) {
  for (const batch of chunk(rows, 100)) {
    const { error } = await supabase.from("listings").upsert(batch);
    if (error) throw new Error(`Could not save Jobicy listings: ${error.message}`);
  }
}

async function pruneStaleJobicyRows(supabase, cutoff) {
  const oldDated = await supabase
    .from("listings")
    .delete({ count: "exact" })
    .eq("source", "jobicy")
    .lt("posted_at", cutoff);
  if (oldDated.error) throw new Error(`Could not prune stale Jobicy listings: ${oldDated.error.message}`);

  const oldUndated = await supabase
    .from("listings")
    .delete({ count: "exact" })
    .eq("source", "jobicy")
    .is("posted_at", null)
    .lt("fetched_at", cutoff);
  if (oldUndated.error) throw new Error(`Could not prune undated Jobicy listings: ${oldUndated.error.message}`);

  return (oldDated.count || 0) + (oldUndated.count || 0);
}

export async function runJobicyIngestion({
  supabase,
  fetchImpl = globalThis.fetch,
  now = new Date(),
}) {
  const feed = await fetchJobicyListings({ fetchImpl, now });
  const mapped = feed.items.map((job) => mapJobicyResult(job, { now })).filter(Boolean);

  if (mapped.length === 0) {
    throw new Error("Jobicy returned no valid fresh Canadian listings; existing data was left unchanged");
  }

  const existing = await loadExistingJobicyIds(
    supabase,
    mapped.map((row) => row.external_id),
  );
  const rows = mapped.map((row) => ({
    ...row,
    id: existing.get(row.external_id) || deterministicJobicyListingId(row.external_id),
  }));

  await upsertJobicyRows(supabase, rows);
  const pruned = await pruneStaleJobicyRows(
    supabase,
    daysBefore(now, JOBICY_STALE_AFTER_DAYS),
  );

  return {
    ...feed.stats,
    saved: rows.length,
    inserted: rows.length - existing.size,
    updated: existing.size,
    pruned,
  };
}
