import { createHash } from "node:crypto";

export function cleanFeedText(value) {
  return String(value || "").trim();
}

function decodeNumericEntity(match, code) {
  const value = Number(code);
  return Number.isInteger(value) && value >= 0 && value <= 0x10ffff
    ? String.fromCodePoint(value)
    : " ";
}

export function cleanFeedHtml(value) {
  return cleanFeedText(value)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, decodeNumericEntity)
    .replace(/\s+/g, " ")
    .trim();
}

export function feedIsoDate(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function daysBefore(now, days) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

export function deterministicFeedListingId(source, externalId) {
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

async function loadExistingIds(supabase, source, externalIds) {
  const existing = new Map();
  for (const ids of chunk(externalIds, 200)) {
    const { data, error } = await supabase
      .from("listings")
      .select("id,external_id")
      .eq("source", source)
      .in("external_id", ids);
    if (error) throw new Error(`Could not load existing ${source} listings: ${error.message}`);
    for (const row of data || []) existing.set(String(row.external_id), row.id);
  }
  return existing;
}

async function upsertRows(supabase, source, rows) {
  for (const batch of chunk(rows, 100)) {
    const { error } = await supabase.from("listings").upsert(batch);
    if (error) throw new Error(`Could not save ${source} listings: ${error.message}`);
  }
}

async function pruneStaleRows(supabase, source, cutoff) {
  const oldDated = await supabase
    .from("listings")
    .delete({ count: "exact" })
    .eq("source", source)
    .lt("posted_at", cutoff);
  if (oldDated.error) throw new Error(`Could not prune stale ${source} listings: ${oldDated.error.message}`);

  const oldUndated = await supabase
    .from("listings")
    .delete({ count: "exact" })
    .eq("source", source)
    .is("posted_at", null)
    .lt("fetched_at", cutoff);
  if (oldUndated.error) throw new Error(`Could not prune undated ${source} listings: ${oldUndated.error.message}`);

  return (oldDated.count || 0) + (oldUndated.count || 0);
}

export async function savePublicFeedListings({
  supabase,
  source,
  rows,
  staleAfterDays = 60,
  now = new Date(),
}) {
  const unique = new Map();
  for (const row of rows || []) {
    const externalId = cleanFeedText(row?.external_id);
    if (externalId && row?.source === source && !unique.has(externalId)) {
      unique.set(externalId, { ...row, external_id: externalId });
    }
  }

  if (unique.size === 0) {
    throw new Error(`${source} returned no valid fresh listings; existing data was left unchanged`);
  }

  const mapped = [...unique.values()];
  const existing = await loadExistingIds(supabase, source, mapped.map((row) => row.external_id));
  const savedRows = mapped.map((row) => ({
    ...row,
    id: existing.get(row.external_id) || deterministicFeedListingId(source, row.external_id),
  }));

  await upsertRows(supabase, source, savedRows);
  const pruned = await pruneStaleRows(supabase, source, daysBefore(now, staleAfterDays));

  return {
    saved: savedRows.length,
    inserted: savedRows.length - existing.size,
    updated: existing.size,
    pruned,
  };
}
