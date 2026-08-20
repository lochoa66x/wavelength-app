import { useCallback, useEffect, useRef, useState } from "react";
import {
  classifyListingTitle,
  formatWorkArrangement,
  normalizeListingReason,
  normalizeWorkArrangement,
} from "./listingCategories.js";
import { formatListingLocation, normalizeListingLocation } from "./listingLocations.js";
import {
  LISTINGS_PAGE_SIZE,
  canUseLegacyLocationFallback,
  createListingsQuery,
  hasNextListingPage,
  listingQueryFingerprint,
  mergeListingPages,
} from "./listingQuery.js";
import { supabase } from "./supabase.js";

const SOURCE_DISPLAY_NAMES = {
  wwr: "We Work Remotely",
  adzuna: "Jobs by Adzuna",
  jooble: "Jooble",
  jobicy: "Jobicy",
  craigslist: "Craigslist",
};

export function mapListingRow(row) {
  const classification = classifyListingTitle(row.title, row.category);
  const workArrangement = normalizeWorkArrangement(row.job_type, row.title);
  const locationData = normalizeListingLocation(row);

  return {
    id: row.id,
    category: classification.category,
    subcategory: classification.subcategory,
    classificationConfidence: classification.confidence,
    tier: row.tier,
    title: row.title,
    company: row.company || "Unknown",
    location: formatListingLocation(locationData, row.location),
    locationData,
    locationQuality: locationData.source,
    type: formatWorkArrangement(workArrangement),
    workArrangement,
    source: SOURCE_DISPLAY_NAMES[row.source] || row.source,
    city: row.city,
    reason: normalizeListingReason(row.reason, row.category, classification.category),
    description: row.description || null,
    url: row.url,
  };
}

export function useLiveListings(criteria = {}, { resetKey = "", pageSize = LISTINGS_PAGE_SIZE } = {}) {
  const fingerprint = listingQueryFingerprint(criteria, resetKey);
  const location = criteria.location;
  const countryCode = criteria.countryCode;
  const region = criteria.region;
  const city = criteria.city;
  const [listings, setListings] = useState([]);
  const [status, setStatus] = useState("loading");
  const [error, setError] = useState(null);
  const [lastFetched, setLastFetched] = useState(null);
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [legacyFallback, setLegacyFallback] = useState(false);
  const requestVersion = useRef(0);

  const fetchPage = useCallback(async (pageToFetch, { replace = false, version } = {}) => {
    const activeVersion = version ?? requestVersion.current;
    setStatus(replace ? "loading" : "loading_more");
    setError(null);

    const filters = { location, countryCode, region, city };
    try {
      let result = await createListingsQuery(supabase, filters, {
        page: pageToFetch,
        pageSize,
        includeStructuredFilters: true,
      });
      let usedLegacyFallback = false;

      if (result.error && canUseLegacyLocationFallback(result.error, filters)) {
        result = await createListingsQuery(supabase, filters, {
          page: pageToFetch,
          pageSize,
          includeStructuredFilters: false,
        });
        usedLegacyFallback = true;
      }

      if (result.error) throw result.error;
      if (activeVersion !== requestVersion.current) return;

      const mapped = (result.data || []).map(mapListingRow);
      setListings((current) => replace ? mapped : mergeListingPages(current, mapped));
      setPage(pageToFetch);
      setTotal(Number.isInteger(result.count) ? result.count : null);
      setHasMore(hasNextListingPage({
        count: result.count,
        page: pageToFetch,
        pageSize,
        received: mapped.length,
      }));
      setLegacyFallback(usedLegacyFallback);
      setLastFetched(new Date());
      setStatus("ready");
    } catch (fetchError) {
      if (activeVersion !== requestVersion.current) return;
      setError(fetchError);
      setStatus("error");
    }
  }, [city, countryCode, fingerprint, location, pageSize, region]);

  const refetch = useCallback(() => {
    const version = requestVersion.current + 1;
    requestVersion.current = version;
    setListings([]);
    setPage(0);
    setTotal(null);
    setHasMore(false);
    setLegacyFallback(false);
    return fetchPage(0, { replace: true, version });
  }, [fetchPage]);

  useEffect(() => {
    refetch();
    return () => { requestVersion.current += 1; };
  }, [fingerprint, refetch]);

  const loadMore = useCallback(() => {
    if (!hasMore || status === "loading" || status === "loading_more") return Promise.resolve();
    return fetchPage(page + 1, { version: requestVersion.current });
  }, [fetchPage, hasMore, page, status]);

  return {
    listings,
    status,
    error,
    lastFetched,
    total,
    hasMore,
    loadMore,
    refetch,
    legacyFallback,
  };
}
