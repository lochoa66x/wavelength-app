import { createHash } from "node:crypto";

import { LISTING_SOURCE_RUN_MODE, saveListingSourceRun } from "./listingFreshness.js";

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

export async function savePublicFeedListings({
  supabase,
  source,
  sourceScope = source,
  rows,
  runMode = LISTING_SOURCE_RUN_MODE.OBSERVATION_ONLY,
  now = new Date(),
}) {
  return saveListingSourceRun({
    supabase,
    source,
    sourceScope,
    rows,
    runMode,
    now,
  });
}
