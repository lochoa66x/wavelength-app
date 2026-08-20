import {
  hasStructuredLocationFilter,
  isMissingStructuredLocationColumn,
  normalizeLocationCriteria,
} from "./listingLocations.js";

export const LISTINGS_PAGE_SIZE = 100;
export const INACTIVE_LISTING_SOURCES = ["craigslist"];

export function escapeLikePattern(value = "") {
  return String(value).replace(/[\\%_]/g, "\\$&");
}

export function listingQueryFingerprint(criteria = {}, resetKey = "") {
  const filters = normalizeLocationCriteria(criteria);
  return [
    filters.location,
    filters.countryCode,
    filters.region,
    filters.city.toLowerCase(),
    resetKey,
  ].join("|");
}

export function applyStructuredLocationFilters(query, criteria = {}) {
  const filters = normalizeLocationCriteria(criteria);
  let filteredQuery = query;

  if (filters.location !== "either") {
    filteredQuery = filteredQuery.eq("location_type", filters.location);
  }
  if (filters.countryCode) {
    filteredQuery = filteredQuery.eq("country_code", filters.countryCode);
  }
  if (filters.region) {
    filteredQuery = filteredQuery.eq("region", filters.region);
  }
  if (filters.city) {
    filteredQuery = filteredQuery.ilike("city", `%${escapeLikePattern(filters.city)}%`);
  }

  return filteredQuery;
}

export function createListingsQuery(
  client,
  criteria = {},
  { page = 0, pageSize = LISTINGS_PAGE_SIZE, includeStructuredFilters = true } = {},
) {
  const safePage = Math.max(0, Number(page) || 0);
  const safePageSize = Math.max(1, Number(pageSize) || LISTINGS_PAGE_SIZE);
  const from = safePage * safePageSize;
  const to = from + safePageSize - 1;

  let query = client
    .from("listings")
    .select("*", { count: "exact" })
    .order("fetched_at", { ascending: false })
    .order("id", { ascending: false });

  for (const source of INACTIVE_LISTING_SOURCES) {
    query = query.neq("source", source);
  }

  if (includeStructuredFilters) query = applyStructuredLocationFilters(query, criteria);
  return query.range(from, to);
}

export function canUseLegacyLocationFallback(error, criteria = {}) {
  return hasStructuredLocationFilter(criteria) && isMissingStructuredLocationColumn(error);
}

export function mergeListingPages(existing = [], incoming = []) {
  const merged = new Map();
  for (const row of [...existing, ...incoming]) {
    const key = row?.id || row?.url || `${row?.company || ""}::${row?.title || ""}`;
    if (key) merged.set(key, row);
  }
  return [...merged.values()];
}

export function hasNextListingPage({ count, page = 0, pageSize = LISTINGS_PAGE_SIZE, received = 0 }) {
  if (Number.isInteger(count)) return (page + 1) * pageSize < count;
  return received === pageSize;
}
