import { createHash, randomUUID } from "node:crypto";

import { shouldPreserveExistingDescription } from "./listingDescription.js";

export const LISTING_AVAILABILITY = Object.freeze({
  ACTIVE: "active",
  UNCERTAIN: "uncertain",
  CLOSED: "closed",
});

export const LISTING_CLOSE_AFTER_MISSES = 3;
export const LISTING_CHECK_COOLDOWN_MS = 15 * 60 * 1000;
export const LISTING_SOURCE_RUN_MODE = Object.freeze({
  AUTHORITATIVE_SNAPSHOT: "authoritative_snapshot",
  OBSERVATION_ONLY: "observation_only",
  PARTIAL: "partial",
});

const LISTING_SOURCE_RUN_MODES = new Set(Object.values(LISTING_SOURCE_RUN_MODE));

const EXISTING_LISTING_FIELDS = [
  "id",
  "external_id",
  "availability_status",
  "first_seen_at",
  "description",
  "description_snippet",
  "description_source",
  "description_status",
  "description_source_url",
  "description_fetched_at",
  "description_content_hash",
  "description_enrichment_error_code",
].join(",");

function clean(value) {
  return String(value || "").trim();
}

function deterministicListingId(source, externalId) {
  const bytes = createHash("sha256")
    .update(`${source}:${externalId}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function descriptionPatch(prior, incoming) {
  if (!shouldPreserveExistingDescription(prior, incoming?.description)) return {};
  return {
    description: prior.description,
    description_snippet: prior.description_snippet || incoming.description_snippet,
    description_source: prior.description_source,
    description_status: prior.description_status,
    description_source_url: prior.description_source_url,
    description_fetched_at: prior.description_fetched_at,
    description_content_hash: prior.description_content_hash,
    description_enrichment_error_code: prior.description_enrichment_error_code,
  };
}

async function loadExistingListings(supabase, source, externalIds) {
  const existing = new Map();
  for (const ids of chunk(externalIds, 200)) {
    const { data, error } = await supabase
      .from("listings")
      .select(EXISTING_LISTING_FIELDS)
      .eq("source", source)
      .in("external_id", ids);
    if (error) throw new Error(`Could not load existing ${source} listings: ${error.message}`);
    for (const row of data || []) existing.set(String(row.external_id), row);
  }
  return existing;
}

async function upsertListingRows(supabase, source, rows) {
  for (const batch of chunk(rows, 100)) {
    const { error } = await supabase.from("listings").upsert(batch);
    if (error) throw new Error(`Could not save ${source} listings: ${error.message}`);
  }
}

function finalizationCounts(data) {
  const row = Array.isArray(data) ? data[0] : data;
  return {
    uncertain: Number(row?.uncertain_count || 0),
    closed: Number(row?.closed_count || 0),
  };
}

export function normalizeObservedListingRows({
  source,
  sourceScope = source,
  rows,
  existing = new Map(),
  runId,
  observedAt,
}) {
  const unique = new Map();
  for (const row of rows || []) {
    const externalId = clean(row?.external_id);
    if (externalId && row?.source === source && !unique.has(externalId)) {
      unique.set(externalId, { ...row, external_id: externalId });
    }
  }

  return [...unique.values()].map((row) => {
    const prior = existing.get(row.external_id);
    return {
      ...row,
      ...descriptionPatch(prior, row),
      id: prior?.id || deterministicListingId(source, row.external_id),
      availability_status: LISTING_AVAILABILITY.ACTIVE,
      availability_reason: "seen_in_source",
      first_seen_at: prior?.first_seen_at || observedAt,
      last_seen_at: observedAt,
      last_checked_at: observedAt,
      closed_at: null,
      consecutive_misses: 0,
      source_run_id: runId,
      source_scope: sourceScope,
      last_miss_run_id: null,
    };
  });
}

export async function saveListingSourceRun({
  supabase,
  source,
  sourceScope = source,
  rows,
  runMode = LISTING_SOURCE_RUN_MODE.OBSERVATION_ONLY,
  now = new Date(),
  runId = randomUUID(),
  closeAfterMisses = LISTING_CLOSE_AFTER_MISSES,
}) {
  if (!LISTING_SOURCE_RUN_MODES.has(runMode)) {
    throw new Error(`Invalid ${source} listing source run mode`);
  }
  const observedAt = now.toISOString();
  const externalIds = [...new Set((rows || [])
    .filter((row) => row?.source === source)
    .map((row) => clean(row?.external_id))
    .filter(Boolean))];

  if (externalIds.length === 0) {
    throw new Error(`${source} returned no valid fresh listings; existing data was left unchanged`);
  }

  const existing = await loadExistingListings(supabase, source, externalIds);
  const savedRows = normalizeObservedListingRows({
    source,
    sourceScope,
    rows,
    existing,
    runId,
    observedAt,
  });
  const reactivated = savedRows.reduce((count, row) => (
    existing.get(row.external_id)?.availability_status === LISTING_AVAILABILITY.CLOSED
      ? count + 1
      : count
  ), 0);

  await upsertListingRows(supabase, source, savedRows);

  let transitions = { uncertain: 0, closed: 0 };
  if (runMode === LISTING_SOURCE_RUN_MODE.AUTHORITATIVE_SNAPSHOT) {
    const { data, error } = await supabase.rpc("finalize_listing_source_run", {
      p_source: source,
      p_scope: sourceScope,
      p_run_id: runId,
      p_checked_at: observedAt,
      p_close_after: closeAfterMisses,
    });
    if (error) throw new Error(`Could not finalize ${source} listing freshness: ${error.message}`);
    transitions = finalizationCounts(data);
  }

  return {
    runId,
    runMode,
    saved: savedRows.length,
    inserted: savedRows.length - existing.size,
    updated: existing.size,
    reactivated,
    ...transitions,
  };
}

export function isAvailabilityCheckFresh(lastCheckedAt, {
  now = Date.now(),
  cooldownMs = LISTING_CHECK_COOLDOWN_MS,
} = {}) {
  const checkedAt = new Date(lastCheckedAt).getTime();
  return Number.isFinite(checkedAt) && Math.max(0, now - checkedAt) < cooldownMs;
}

export function classifyAvailabilityFetch({
  httpStatus,
  errorCode,
  hasMatchingPosting = false,
  readablePageMatches = false,
  validThrough,
  now = new Date(),
} = {}) {
  if (httpStatus === 404 || httpStatus === 410) {
    return { status: LISTING_AVAILABILITY.CLOSED, reason: "http_closed" };
  }
  if (errorCode === "blocked" || httpStatus === 401 || httpStatus === 403) {
    return { status: LISTING_AVAILABILITY.UNCERTAIN, reason: "publisher_blocked" };
  }
  if (httpStatus === 429) {
    return { status: LISTING_AVAILABILITY.UNCERTAIN, reason: "rate_limited" };
  }
  if (errorCode === "timeout") {
    return { status: LISTING_AVAILABILITY.UNCERTAIN, reason: "timeout" };
  }
  if (errorCode === "network_error") {
    return { status: LISTING_AVAILABILITY.UNCERTAIN, reason: "network_error" };
  }
  if (httpStatus >= 500) {
    return { status: LISTING_AVAILABILITY.UNCERTAIN, reason: "upstream_error" };
  }

  const expiry = validThrough ? new Date(validThrough) : null;
  if (expiry && !Number.isNaN(expiry.getTime()) && expiry < now) {
    return { status: LISTING_AVAILABILITY.CLOSED, reason: "expired_structured_data" };
  }
  if (hasMatchingPosting || readablePageMatches) {
    return { status: LISTING_AVAILABILITY.ACTIVE, reason: "manual_refresh" };
  }
  if (httpStatus >= 200 && httpStatus < 300) {
    return { status: LISTING_AVAILABILITY.UNCERTAIN, reason: "source_mismatch" };
  }
  return { status: LISTING_AVAILABILITY.UNCERTAIN, reason: "unknown" };
}
