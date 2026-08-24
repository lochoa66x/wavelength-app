import {
  hasStructuredLocationFilter,
  isMissingStructuredLocationColumn,
  normalizeLocationCriteria,
} from "./listingLocations.js";
import { inferKeywordIntent, normalizeSearchText } from "./listingCategories.js";

export const LISTINGS_PAGE_SIZE = 100;
export const INACTIVE_LISTING_SOURCES = ["craigslist"];
export const INITIAL_LISTING_PAGE_LIMIT = 3;
export const PUBLIC_LISTING_RELATION = "public_listings";
export const PUBLIC_LISTING_BASE_RELATION = "listings";
export const PUBLIC_LISTING_SELECT = [
  "id",
  "category",
  "tier",
  "title",
  "company",
  "location",
  "job_type",
  "source",
  "city",
  "region",
  "country_code",
  "location_type",
  "reason",
  "description_snippet",
  "url",
  "posted_at",
].join(",");

const TECHNOLOGY_SEARCH_ALIASES = {
  sap: ["sap", "s/4hana", "s4hana", "abap", "fiori", "successfactors", "ariba"],
  java: ["java"],
  python: ["python"],
  cpp: ["c++", "cpp"],
  csharp: ["c#", "csharp"],
  dotnet: [".net", "dotnet"],
  javascript: ["javascript"],
  typescript: ["typescript"],
  react: ["react"],
  nodejs: ["node.js", "nodejs"],
  sql: ["sql", "postgresql", "mysql"],
  data: ["data engineer", "data scientist", "machine learning"],
  cloud: ["cloud", "aws", "azure", "gcp"],
  devops: ["devops", "site reliability", "sre"],
  security: ["cybersecurity", "information security", "infosec"],
};

const BROAD_SEARCH_ALIASES = {
  it: [
    "information technology", "software", "developer", "engineer", "technical support",
    "help desk", "systems", "cloud", "devops", "cybersecurity", "database", "sap",
  ],
};

const DOMAIN_SEARCH_ALIASES = {
  saas: ["saas", "software as a service"],
};

export function escapeLikePattern(value = "") {
  return String(value).replace(/[\\%_]/g, "\\$&");
}

function safePostgrestSearchTerm(value = "") {
  return normalizeSearchText(value)
    .replace(/[(),"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function listingServerSearchTerms(criteria = {}) {
  const keyword = normalizeSearchText(criteria.keyword || "");
  if (!keyword) return [];

  const intent = inferKeywordIntent(keyword);
  // Unrecognized text is intentionally left to the existing diagnostic path.
  // Applying an arbitrary raw PostgREST expression here would be both noisy and
  // unsafe, while also making the database total misleading.
  if (!intent.recognized) return [];

  const conceptTerms = [
    ...intent.technologies.flatMap((technology) => TECHNOLOGY_SEARCH_ALIASES[technology] || []),
    ...intent.domains.flatMap((domain) => DOMAIN_SEARCH_ALIASES[domain] || []),
  ];
  // When the user names a technology or domain, keep that concept mandatory
  // at the database boundary. Role words such as "analyst" or "developer"
  // remain client-side ranking signals; OR-ing them here could fill the first
  // page with unrelated analysts before any SAP role appears.
  const terms = (conceptTerms.length > 0
    ? conceptTerms
    : [...intent.terms, ...(BROAD_SEARCH_ALIASES[keyword] || [])])
    .map(safePostgrestSearchTerm)
    .filter((term) => term.length > 1);

  return [...new Set(terms)].slice(0, 16);
}

export function applyKeywordSearchFilters(query, criteria = {}) {
  const terms = listingServerSearchTerms(criteria);
  if (terms.length === 0) return query;

  const expression = terms
    .flatMap((term) => {
      const pattern = `%${escapeLikePattern(term)}%`;
      return [`title.ilike.${pattern}`, `description_snippet.ilike.${pattern}`];
    })
    .join(",");

  return query.or(expression);
}

export function listingQueryFingerprint(criteria = {}, resetKey = "") {
  const filters = normalizeLocationCriteria(criteria);
  return [
    normalizeSearchText(criteria.keyword || ""),
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
  {
    page = 0,
    pageSize = LISTINGS_PAGE_SIZE,
    includeStructuredFilters = true,
    relation = PUBLIC_LISTING_RELATION,
  } = {},
) {
  const safePage = Math.max(0, Number(page) || 0);
  const safePageSize = Math.max(1, Number(pageSize) || LISTINGS_PAGE_SIZE);
  const from = safePage * safePageSize;
  const to = from + safePageSize - 1;

  let query = client
    .from(relation)
    .select(PUBLIC_LISTING_SELECT, { count: "exact" })
    .order("posted_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false });

  for (const source of INACTIVE_LISTING_SOURCES) {
    query = query.neq("source", source);
  }

  if (includeStructuredFilters) query = applyStructuredLocationFilters(query, criteria);
  query = applyKeywordSearchFilters(query, criteria);
  return query.range(from, to);
}

export function isMissingPublicListingView(error) {
  if (!error) return false;
  const message = String(error.message || "").toLowerCase();
  return error.code === "PGRST205"
    || error.code === "42P01"
    || (message.includes("public_listings") && message.includes("could not find"));
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

export function shouldAutoContinueListingSearch({
  replace = false,
  startingPage = 0,
  attempts = 0,
  hasMore = false,
  hasRelevantListings = false,
  maxAttempts = INITIAL_LISTING_PAGE_LIMIT,
} = {}) {
  return replace
    && startingPage === 0
    && attempts < maxAttempts
    && hasMore
    && !hasRelevantListings;
}
