export const LOCATION_OPTIONS = [
  { id: "either", label: "Anywhere" },
  { id: "remote", label: "Remote" },
  { id: "hybrid", label: "Hybrid" },
  { id: "onsite", label: "On-site" },
];

const REMOTE_PATTERN = /\b(?:remote|anywhere|worldwide|work from home|home[- ]based|distributed)\b/i;
const HYBRID_PATTERN = /\bhybrid\b/i;
const ONSITE_PATTERN = /\b(?:on[- ]?site|in person|office[- ]based)\b/i;
const LOCATION_PREFIX_PATTERN = /^\s*(?:remote|hybrid|on[- ]?site|in person|office[- ]based|anywhere|worldwide)\s*(?:[-–—|:/,]\s*)?/i;

const REGION_DEFINITIONS = [
  ["alberta", "CA", ["ab", "alta", "alberta"]],
  ["british columbia", "CA", ["bc", "british columbia"]],
  ["manitoba", "CA", ["mb", "manitoba"]],
  ["new brunswick", "CA", ["nb", "new brunswick"]],
  ["newfoundland and labrador", "CA", ["nl", "newfoundland", "newfoundland and labrador"]],
  ["nova scotia", "CA", ["ns", "nova scotia"]],
  ["northwest territories", "CA", ["nt", "northwest territories"]],
  ["nunavut", "CA", ["nu", "nunavut"]],
  ["ontario", "CA", ["on", "ont", "ontario"]],
  ["prince edward island", "CA", ["pe", "pei", "prince edward island"]],
  ["quebec", "CA", ["qc", "pq", "quebec"]],
  ["saskatchewan", "CA", ["sk", "saskatchewan"]],
  ["yukon", "CA", ["yt", "yukon"]],
  ["california", "US", ["ca", "calif", "california"]],
  ["colorado", "US", ["co", "colorado"]],
  ["district of columbia", "US", ["dc", "district of columbia"]],
  ["florida", "US", ["fl", "fla", "florida"]],
  ["georgia", "US", ["ga", "georgia"]],
  ["illinois", "US", ["il", "illinois"]],
  ["massachusetts", "US", ["ma", "massachusetts"]],
  ["new york", "US", ["ny", "new york"]],
  ["oregon", "US", ["or", "oregon"]],
  ["texas", "US", ["tx", "texas"]],
  ["washington", "US", ["wa", "washington"]],
];

const COUNTRY_LABELS = { CA: "Canada", US: "United States" };
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

function canonicalRegion(value = "") {
  const cleaned = cleanText(value);
  if (!cleaned) return { region: "", countryCode: "" };
  return REGION_ALIASES.get(cleaned) || { region: cleaned, countryCode: "" };
}

function normalizeCountryCode(value = "", allowTwoLetterCode = true) {
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

export function normalizeLocationPreference(preference) {
  if (preference === "local") return "onsite";
  if (preference === "any") return "either";
  return LOCATION_OPTIONS.some(({ id }) => id === preference) ? preference : preference || null;
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
    && /\b(location_type|region|country_code)\b/i.test(message);
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

export function locationMatches(locationData, { mode = "either", query = "" } = {}) {
  const normalizedMode = normalizeLocationPreference(mode) || "either";
  const normalizedQuery = expandRegionAliases(query);
  const data = locationData || { type: "unknown", searchText: "" };

  if (normalizedMode !== "either" && data.type !== normalizedMode) return false;
  if (!normalizedQuery || normalizedMode === "remote") return true;

  const queryTokens = normalizedQuery.split(" ").filter(Boolean);
  return queryTokens.every((token) => data.searchText.includes(token));
}

export function formatLocationPreference(mode, query = "") {
  const normalizedMode = normalizeLocationPreference(mode) || "either";
  const label = LOCATION_OPTIONS.find(({ id }) => id === normalizedMode)?.label || "Anywhere";
  return query.trim() && (normalizedMode === "hybrid" || normalizedMode === "onsite")
    ? `${label} near ${query.trim()}`
    : label;
}
