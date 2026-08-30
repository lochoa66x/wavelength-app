import {
  MARKET_REGISTRY,
  normalizeMarketCode,
} from "./markets.js";

export const LOCATION_OPTIONS = [
  { id: "either", label: "All" },
  { id: "remote", label: "Remote" },
  { id: "hybrid", label: "Hybrid" },
  { id: "onsite", label: "On-site" },
];

export const COUNTRY_OPTIONS = [
  { id: "", label: "Any country" },
  ...Object.values(MARKET_REGISTRY).map(({ code, optionLabel }) => ({ id: code, label: optionLabel })),
];

const REMOTE_PATTERN = /\b(?:remote|anywhere|worldwide|work from home|home[- ]based|distributed)\b/i;
const HYBRID_PATTERN = /\bhybrid\b/i;
const ONSITE_PATTERN = /\b(?:on[- ]?site|in person|office[- ]based)\b/i;
const LOCATION_PREFIX_PATTERN = /^\s*(?:remote|hybrid|on[- ]?site|in person|office[- ]based|anywhere|worldwide)\s*(?:[-–—|:/,]\s*)?/i;

export const REGION_OPTIONS_BY_COUNTRY = {
  CA: [
    ["alberta", "Alberta", ["ab", "alta"]],
    ["british columbia", "British Columbia", ["bc"]],
    ["manitoba", "Manitoba", ["mb"]],
    ["new brunswick", "New Brunswick", ["nb"]],
    ["newfoundland and labrador", "Newfoundland and Labrador", ["nl", "newfoundland"]],
    ["nova scotia", "Nova Scotia", ["ns"]],
    ["northwest territories", "Northwest Territories", ["nt"]],
    ["nunavut", "Nunavut", ["nu"]],
    ["ontario", "Ontario", ["on", "ont"]],
    ["prince edward island", "Prince Edward Island", ["pe", "pei"]],
    ["quebec", "Quebec", ["qc", "pq"]],
    ["saskatchewan", "Saskatchewan", ["sk"]],
    ["yukon", "Yukon", ["yt"]],
  ],
  US: [
    ["alabama", "Alabama", ["al"]],
    ["alaska", "Alaska", ["ak"]],
    ["arizona", "Arizona", ["az"]],
    ["arkansas", "Arkansas", ["ar"]],
    ["california", "California", ["ca", "calif"]],
    ["colorado", "Colorado", ["co"]],
    ["connecticut", "Connecticut", ["ct"]],
    ["delaware", "Delaware", ["de"]],
    ["district of columbia", "District of Columbia", ["dc"]],
    ["florida", "Florida", ["fl", "fla"]],
    ["georgia", "Georgia", ["ga"]],
    ["hawaii", "Hawaii", ["hi"]],
    ["idaho", "Idaho", ["id"]],
    ["illinois", "Illinois", ["il"]],
    ["indiana", "Indiana", ["in"]],
    ["iowa", "Iowa", ["ia"]],
    ["kansas", "Kansas", ["ks"]],
    ["kentucky", "Kentucky", ["ky"]],
    ["louisiana", "Louisiana", ["la"]],
    ["maine", "Maine", ["me"]],
    ["maryland", "Maryland", ["md"]],
    ["massachusetts", "Massachusetts", ["ma"]],
    ["michigan", "Michigan", ["mi"]],
    ["minnesota", "Minnesota", ["mn"]],
    ["mississippi", "Mississippi", ["ms"]],
    ["missouri", "Missouri", ["mo"]],
    ["montana", "Montana", ["mt"]],
    ["nebraska", "Nebraska", ["ne"]],
    ["nevada", "Nevada", ["nv"]],
    ["new hampshire", "New Hampshire", ["nh"]],
    ["new jersey", "New Jersey", ["nj"]],
    ["new mexico", "New Mexico", ["nm"]],
    ["new york", "New York", ["ny"]],
    ["north carolina", "North Carolina", ["nc"]],
    ["north dakota", "North Dakota", ["nd"]],
    ["ohio", "Ohio", ["oh"]],
    ["oklahoma", "Oklahoma", ["ok"]],
    ["oregon", "Oregon", ["or"]],
    ["pennsylvania", "Pennsylvania", ["pa"]],
    ["rhode island", "Rhode Island", ["ri"]],
    ["south carolina", "South Carolina", ["sc"]],
    ["south dakota", "South Dakota", ["sd"]],
    ["tennessee", "Tennessee", ["tn"]],
    ["texas", "Texas", ["tx"]],
    ["utah", "Utah", ["ut"]],
    ["vermont", "Vermont", ["vt"]],
    ["virginia", "Virginia", ["va"]],
    ["washington", "Washington", ["wa"]],
    ["west virginia", "West Virginia", ["wv"]],
    ["wisconsin", "Wisconsin", ["wi"]],
    ["wyoming", "Wyoming", ["wy"]],
  ],
};

const REGION_DEFINITIONS = Object.entries(REGION_OPTIONS_BY_COUNTRY)
  .flatMap(([countryCode, regions]) => regions.map(([region, , aliases]) => [
    region,
    countryCode,
    [region, ...aliases],
  ]));

export const COUNTRY_LABELS = Object.fromEntries(
  Object.values(MARKET_REGISTRY).map(({ code, label }) => [code, label]),
);
const COUNTRY_ALIASES = new Map([
  ["canada", "CA"], ["canadian", "CA"], ["can", "CA"],
  ["united states", "US"], ["united states of america", "US"], ["usa", "US"], ["u s a", "US"], ["us", "US"],
]);

function cleanText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const REGION_ALIASES = new Map(
  REGION_DEFINITIONS.flatMap(([region, countryCode, aliases]) =>
    aliases.map((alias) => [cleanText(alias), { region, countryCode }]),
  ),
);

export function canonicalRegion(value = "") {
  const cleaned = cleanText(value);
  if (!cleaned) return { region: "", countryCode: "" };
  return REGION_ALIASES.get(cleaned) || { region: cleaned, countryCode: "" };
}

export function normalizeCountryCode(value = "", allowTwoLetterCode = true) {
  const cleaned = cleanText(value);
  if (!cleaned) return "";
  const alias = COUNTRY_ALIASES.get(cleaned);
  if (alias) return alias;
  return allowTwoLetterCode && /^[a-z]{2}$/.test(cleaned) ? cleaned.toUpperCase() : "";
}

function expandRegionAliases(value = "") {
  return cleanText(value)
    .split(" ")
    .map((token) => REGION_ALIASES.get(token)?.region || token)
    .join(" ");
}

export function parseLocationText(value = "") {
  const original = String(value).trim();
  const withoutMode = original.replace(LOCATION_PREFIX_PATTERN, "").trim();
  if (!withoutMode || /^(?:remote|anywhere|worldwide)$/i.test(withoutMode)) {
    return { city: "", region: "", countryCode: "" };
  }

  const parts = withoutMode.split(",").map((part) => part.trim()).filter(Boolean);
  let countryCode = "";
  let region = "";

  const possibleCountry = parts.at(-1);
  const parsedCountry = normalizeCountryCode(possibleCountry, false);
  if (parsedCountry) {
    countryCode = parsedCountry;
    parts.pop();
  } else if (parts.length >= 2) {
    const shortMarket = normalizeMarketCode(possibleCountry);
    const precedingRegion = canonicalRegion(parts.at(-2));
    // `CA` is both the Canadian country code and the USPS abbreviation for
    // California. It is a country only when another region immediately before
    // it makes the intent explicit (for example Toronto, ON, CA). In a normal
    // two-part US location such as San Francisco, CA it remains California.
    const isContextualCountry = shortMarket === "US"
      || (shortMarket === "CA" && precedingRegion.countryCode === "CA");
    if (isContextualCountry) {
      countryCode = shortMarket;
      parts.pop();
    }
  }

  const possibleRegion = parts.at(-1);
  const parsedRegion = canonicalRegion(possibleRegion);
  if (parsedRegion.countryCode) {
    region = parsedRegion.region;
    countryCode ||= parsedRegion.countryCode;
    parts.pop();
  }

  return {
    city: parts.join(", "),
    region,
    countryCode,
  };
}

export function parseLocationSearchValue(value = "", defaultCountryCode = "CA") {
  const trimmed = String(value || "").trim();
  if (!trimmed) {
    return { city: "", region: "", countryCode: normalizeCountryCode(defaultCountryCode) };
  }

  return parseLocationText(trimmed);
}

export function normalizeLocationPreference(preference) {
  if (preference === "local") return "onsite";
  if (preference === "any") return "either";
  return LOCATION_OPTIONS.some(({ id }) => id === preference) ? preference : preference || null;
}

export function regionOptionsForCountry(countryCode = "") {
  return (REGION_OPTIONS_BY_COUNTRY[normalizeCountryCode(countryCode)] || [])
    .map(([id, label]) => ({ id, label }));
}

export function normalizeLocationCriteria(criteria = {}) {
  const location = normalizeLocationPreference(criteria.location || criteria.mode) || "either";
  let countryCode = normalizeCountryCode(criteria.countryCode || criteria.country_code);
  let { region, countryCode: regionCountryCode } = canonicalRegion(criteria.region);
  let city = String(criteria.city || criteria.query || "").trim();

  if (!region && city) {
    const parsed = parseLocationText(city);
    if (parsed.region || parsed.countryCode) {
      city = parsed.city;
      region = parsed.region;
      countryCode ||= parsed.countryCode;
      regionCountryCode ||= parsed.countryCode;
    }
  }

  countryCode ||= regionCountryCode;
  if (countryCode && regionCountryCode && countryCode !== regionCountryCode) region = "";

  return { location, countryCode, region, city };
}

export function formatLocationSearchValue(criteria = {}) {
  const normalized = normalizeLocationCriteria(criteria);
  const regionLabel = normalized.region
    ? regionOptionsForCountry(normalized.countryCode)
      .find(({ id }) => id === normalized.region)?.label
      || normalized.region.replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "";

  return [normalized.city, regionLabel, COUNTRY_LABELS[normalized.countryCode]]
    .filter(Boolean)
    .join(", ");
}

export function hasStructuredLocationFilter(criteria = {}) {
  const normalized = normalizeLocationCriteria(criteria);
  return normalized.location !== "either"
    || Boolean(normalized.countryCode || normalized.region || normalized.city);
}

export function structuredLocationModeFilter(preference) {
  const normalized = normalizeLocationPreference(preference) || "either";
  return normalized === "remote" || normalized === "hybrid" || normalized === "onsite"
    ? normalized
    : null;
}

export function isMissingStructuredLocationColumn(error) {
  const code = String(error?.code || "");
  const message = [error?.message, error?.details, error?.hint]
    .filter(Boolean)
    .join(" ");
  return (code === "42703" || code === "PGRST204")
    && /\b(location_type|city|region|country_code)\b/i.test(message);
}

export function inferLocationType({ location = "", title = "", locationType = "", source = "" } = {}) {
  const explicit = cleanText(locationType).replace("on site", "onsite");
  if (explicit === "remote" || explicit === "hybrid" || explicit === "onsite") return explicit;

  const value = `${title} ${location}`;
  if (HYBRID_PATTERN.test(value)) return "hybrid";
  if (REMOTE_PATTERN.test(value)) return "remote";
  if (ONSITE_PATTERN.test(value)) return "onsite";
  if (/^(?:wwr|we work remotely)$/i.test(String(source).trim())) return "remote";
  return cleanText(location) ? "onsite" : "unknown";
}

export function normalizeListingLocation(row = {}) {
  const rawLocation = row.location || "";
  const parsed = parseLocationText(rawLocation);
  const explicitCity = row.location_city || row.city || "";
  const explicitRegion = row.location_region || row.region || row.province || row.state || "";
  const explicitCountry = row.location_country_code || row.country_code || row.country || "";
  const normalizedRegion = canonicalRegion(explicitRegion || parsed.region);
  const countryCode = normalizeCountryCode(explicitCountry) || parsed.countryCode || normalizedRegion.countryCode;
  const city = String(explicitCity || parsed.city).trim();
  const region = normalizedRegion.region;
  const placeText = [rawLocation, city, region, countryCode].filter(Boolean).join(" ");
  const type = inferLocationType({
    location: placeText,
    title: row.title,
    locationType: row.location_type || row.locationType,
    source: row.source,
  });
  const hasStructuredFields = Boolean(
    row.location_type || row.location_city || row.city || row.location_region || row.region || row.province || row.state || row.location_country_code || row.country_code || row.country,
  );
  const hasParsedFields = Boolean(parsed.city || parsed.region || parsed.countryCode);

  return {
    type,
    city,
    region,
    countryCode,
    source: hasStructuredFields ? "structured" : hasParsedFields ? "parsed" : type !== "unknown" ? "inferred" : "unresolved",
    searchText: expandRegionAliases([
      rawLocation,
      city,
      region,
      countryCode,
      COUNTRY_LABELS[countryCode],
    ].filter(Boolean).join(" ")),
  };
}

export function formatListingLocation(locationData, fallback = "") {
  const data = locationData || {};
  const region = data.region
    ? data.region.replace(/\b\w/g, (letter) => letter.toUpperCase())
    : "";
  const place = [data.city, region].filter(Boolean).join(", ") || COUNTRY_LABELS[data.countryCode] || "";
  if (data.type === "remote") return place ? `Remote · ${place}` : "Remote";
  if (data.type === "hybrid") return place ? `Hybrid · ${place}` : "Hybrid";
  return place || fallback || (data.type === "onsite" ? "On-site" : "Location unavailable");
}

export function toStructuredLocationPatch(row = {}) {
  const normalized = normalizeListingLocation(row);
  return {
    location_type: normalized.type === "unknown" ? null : normalized.type,
    city: normalized.city || null,
    region: normalized.region || null,
    country_code: normalized.countryCode || null,
  };
}

export function summarizeLocationCoverage(rows = []) {
  return rows.reduce((summary, row) => {
    const source = normalizeListingLocation(row).source;
    summary.total += 1;
    summary[source] += 1;
    return summary;
  }, { total: 0, structured: 0, parsed: 0, inferred: 0, unresolved: 0 });
}

export function locationMatches(locationData, filters = {}) {
  const normalized = normalizeLocationCriteria(filters);
  const data = locationData || { type: "unknown", searchText: "" };

  if (normalized.location !== "either" && data.type !== normalized.location) return false;
  if (normalized.countryCode && data.countryCode !== normalized.countryCode) return false;
  if (normalized.region && canonicalRegion(data.region).region !== normalized.region) return false;
  if (!normalized.city) return true;

  const queryTokens = cleanText(normalized.city).split(" ").filter(Boolean);
  return queryTokens.every((token) => data.searchText.includes(token));
}

export function formatLocationPreference(criteriaOrMode, query = "") {
  const criteria = typeof criteriaOrMode === "object"
    ? criteriaOrMode
    : { location: criteriaOrMode, city: query };
  const normalized = normalizeLocationCriteria(criteria);
  const label = LOCATION_OPTIONS.find(({ id }) => id === normalized.location)?.label || "All";
  const place = formatLocationSearchValue(normalized);
  if (normalized.location === "either") return place || "Anywhere";
  return place ? `${label} in ${place}` : label;
}
