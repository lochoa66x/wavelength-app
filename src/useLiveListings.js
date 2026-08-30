import { useCallback, useEffect, useRef, useState } from "react";
import {
  categoriesForField,
  inferKeywordIntent,
  scoreListingRelevance,
} from "./listingCategories.js";
import { clusterDuplicateListings } from "./listingIdentity.js";
import { mapListingRow } from "./listingMapping.js";
import { locationMatches } from "./listingLocations.js";
import {
  INITIAL_LISTING_PAGE_LIMIT,
  LISTINGS_PAGE_SIZE,
  canUseLegacyLocationFallback,
  createListingsQuery,
  hasNextListingPage,
  listingQueryFingerprint,
  mergeListingPages,
  PUBLIC_LISTING_BASE_RELATION,
  PUBLIC_LISTING_RELATION,
  isMissingPublicListingView,
  isMissingListingAvailabilityColumn,
  shouldAutoContinueListingSearch,
} from "./listingQuery.js";
import { supabase } from "./supabase.js";

export function hasDisplayableListings(rows = [], criteria = {}) {
  if (rows.length === 0) return false;

  const keyword = String(criteria.keyword || "").trim();
  const intent = inferKeywordIntent(keyword);
  if (keyword && !intent.recognized) return true;

  const selectedCategories = keyword
    ? intent.categories
    : categoriesForField(criteria.field);
  if (selectedCategories.length === 0) return true;

  const selectedWorkTypes = criteria.workTypes || [];
  const filtersWorkType = selectedWorkTypes.length > 0 && !selectedWorkTypes.includes("any");

  return rows.some((row) => {
    if (!locationMatches(row.locationData, criteria)) return false;
    if (criteria.strictness === "strict" && row.workArrangement === "unlabeled") return false;
    if (
      filtersWorkType
      && row.workArrangement !== "unlabeled"
      && !selectedWorkTypes.includes(row.workArrangement)
    ) return false;

    return scoreListingRelevance(row, keyword, selectedCategories, intent) > 0;
  });
}

export function useLiveListings(criteria = {}, { resetKey = "", pageSize = LISTINGS_PAGE_SIZE } = {}) {
  const fingerprint = listingQueryFingerprint(criteria, resetKey);
  const location = criteria.location;
  const countryCode = criteria.countryCode;
  const region = criteria.region;
  const city = criteria.city;
  const keyword = criteria.keyword;
  const field = criteria.field;
  const workTypes = criteria.workTypes;
  const strictness = criteria.strictness;
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

    const filters = { location, countryCode, region, city, keyword, field, workTypes, strictness };
    try {
      let currentPage = pageToFetch;
      let attempts = 0;
      let combinedRows = [];
      let result;
      let usedLegacyFallback = false;
      let nextPageAvailable = false;
      const searchIntent = inferKeywordIntent(keyword || "");
      const collectCandidateWindow = Boolean(String(keyword || "").trim() && searchIntent.recognized);

      do {
        let activeRelation = PUBLIC_LISTING_RELATION;
        let includeAvailability = true;
        result = await createListingsQuery(supabase, filters, {
          page: currentPage,
          pageSize,
          includeStructuredFilters: true,
        });

        // Deployment-safe bridge: older environments may not have applied the
        // narrow public view yet. Query the same explicit public columns from
        // the existing read-only listing table; never fall back to select("*").
        if (result.error && isMissingPublicListingView(result.error)) {
          activeRelation = PUBLIC_LISTING_BASE_RELATION;
          result = await createListingsQuery(supabase, filters, {
            page: currentPage,
            pageSize,
            includeStructuredFilters: true,
            relation: PUBLIC_LISTING_BASE_RELATION,
          });
        }

        if (result.error && isMissingListingAvailabilityColumn(result.error)) {
          includeAvailability = false;
          result = await createListingsQuery(supabase, filters, {
            page: currentPage,
            pageSize,
            includeStructuredFilters: true,
            includeAvailability,
            relation: activeRelation,
          });
        }

        if (result.error && canUseLegacyLocationFallback(result.error, filters)) {
          result = await createListingsQuery(supabase, filters, {
            page: currentPage,
            pageSize,
            includeStructuredFilters: false,
            includeAvailability,
            relation: activeRelation,
          });
          usedLegacyFallback = true;
        }

        if (result.error) throw result.error;
        if (activeVersion !== requestVersion.current) return;

        const mapped = (result.data || []).map(mapListingRow);
        combinedRows = [...combinedRows, ...mapped];
        attempts += 1;
        nextPageAvailable = hasNextListingPage({
          count: result.count,
          page: currentPage,
          pageSize,
          received: mapped.length,
        });

        if (!shouldAutoContinueListingSearch({
          replace,
          startingPage: pageToFetch,
          attempts,
          hasMore: nextPageAvailable,
          hasRelevantListings: hasDisplayableListings(combinedRows, filters),
          collectCandidateWindow,
          maxAttempts: INITIAL_LISTING_PAGE_LIMIT,
        })) break;

        currentPage += 1;
      } while (true);

      const deduplicatedRows = clusterDuplicateListings(combinedRows);
      setListings((current) => replace ? deduplicatedRows : mergeListingPages(current, deduplicatedRows));
      setPage(currentPage);
      setTotal(Number.isInteger(result.count) ? result.count : null);
      setHasMore(nextPageAvailable);
      setLegacyFallback(usedLegacyFallback);
      setLastFetched(new Date());
      setStatus("ready");
    } catch (fetchError) {
      if (activeVersion !== requestVersion.current) return;
      setError(fetchError);
      setStatus("error");
    }
  }, [city, countryCode, field, fingerprint, keyword, location, pageSize, region, strictness, workTypes]);

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

  const updateListing = useCallback((listingId, patch) => {
    setListings((current) => current.map((listing) => (
      listing.id === listingId ? { ...listing, ...patch } : listing
    )));
  }, []);

  return {
    listings,
    status,
    error,
    lastFetched,
    total,
    candidateCount: listings.length,
    hasMore,
    loadMore,
    refetch,
    updateListing,
    legacyFallback,
  };
}
