import { useCallback, useEffect, useRef, useState } from "react";
import {
  categoriesForField,
  classifyListingTitle,
  formatWorkArrangement,
  inferKeywordIntent,
  normalizeListingReason,
  normalizeWorkArrangement,
  scoreListingRelevance,
} from "./listingCategories.js";
import { formatListingLocation, locationMatches, normalizeListingLocation } from "./listingLocations.js";
import {
  INITIAL_LISTING_PAGE_LIMIT,
  LISTINGS_PAGE_SIZE,
  canUseLegacyLocationFallback,
  createListingsQuery,
  hasNextListingPage,
  listingQueryFingerprint,
  mergeListingPages,
  PUBLIC_LISTING_BASE_RELATION,
  isMissingPublicListingView,
  shouldAutoContinueListingSearch,
} from "./listingQuery.js";
import { supabase } from "./supabase.js";

const SOURCE_DISPLAY_NAMES = {
  wwr: "We Work Remotely",
  adzuna: "Jobs by Adzuna",
  jooble: "Jooble",
  jobicy: "Jobicy",
  himalayas: "Himalayas",
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
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
    description: null,
    descriptionSnippet: row.description_snippet || null,
    descriptionSourceUrl: row.url || "",
    url: row.url,
  };
}

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

      do {
        result = await createListingsQuery(supabase, filters, {
          page: currentPage,
          pageSize,
          includeStructuredFilters: true,
        });

        // Deployment-safe bridge: older environments may not have applied the
        // narrow public view yet. Query the same explicit public columns from
        // the existing read-only listing table; never fall back to select("*").
        if (result.error && isMissingPublicListingView(result.error)) {
          result = await createListingsQuery(supabase, filters, {
            page: currentPage,
            pageSize,
            includeStructuredFilters: true,
            relation: PUBLIC_LISTING_BASE_RELATION,
          });
        }

        if (result.error && canUseLegacyLocationFallback(result.error, filters)) {
          result = await createListingsQuery(supabase, filters, {
            page: currentPage,
            pageSize,
            includeStructuredFilters: false,
          });
          usedLegacyFallback = true;
        }

        if (result.error) throw result.error;
        if (activeVersion !== requestVersion.current) return;

        const mapped = (result.data || []).map(mapListingRow);
        combinedRows = mergeListingPages(combinedRows, mapped);
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
          maxAttempts: INITIAL_LISTING_PAGE_LIMIT,
        })) break;

        currentPage += 1;
      } while (true);

      setListings((current) => replace ? combinedRows : mergeListingPages(current, combinedRows));
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
