export function listingStateKey(item) {
  if (item?.id === null || item?.id === undefined || item.id === "") {
    throw new Error("Listing is missing its database id");
  }
  return `listing:${String(item.id)}`;
}

const TRACKING_PARAMETERS = new Set([
  "fbclid",
  "gclid",
]);

function isTrackingParameter(value = "") {
  const key = String(value).toLowerCase();
  return TRACKING_PARAMETERS.has(key) || key.startsWith("utm_") || key.startsWith("mc_");
}

const DIRECT_SOURCE_PRIORITY = new Map([
  ["greenhouse", 0],
  ["lever", 0],
  ["ashby", 0],
  ["himalayas", 1],
  ["jobicy", 1],
  ["wwr", 1],
  ["adzuna", 2],
  ["jooble", 2],
]);

function normalizedIdentityText(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+#]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function validPostedDay(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export function canonicalListingUrlForIdentity(value = "") {
  try {
    const url = new URL(String(value));
    if (url.protocol !== "https:" && url.protocol !== "http:") return "";

    url.hash = "";
    url.hostname = url.hostname.toLowerCase();
    if ((url.protocol === "https:" && url.port === "443") || (url.protocol === "http:" && url.port === "80")) {
      url.port = "";
    }
    for (const key of [...url.searchParams.keys()]) {
      if (isTrackingParameter(key)) url.searchParams.delete(key);
    }
    url.searchParams.sort();
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
    return url.toString();
  } catch {
    return "";
  }
}

export function listingDuplicateKey(item = {}) {
  const canonicalUrl = canonicalListingUrlForIdentity(item.url);
  if (canonicalUrl) return `url:${canonicalUrl}`;

  const postedDay = validPostedDay(item.postedAt || item.posted_at);
  const snippet = normalizedIdentityText(item.searchDescription || item.descriptionSnippet || item.description);
  if (!postedDay || snippet.length < 80) return item.id ? `id:${item.id}` : "";

  const fingerprint = [
    normalizedIdentityText(item.company),
    normalizedIdentityText(item.title),
    normalizedIdentityText(item.location),
    postedDay,
    snippet.slice(0, 160),
  ];
  return fingerprint.every(Boolean) ? `fingerprint:${fingerprint.join("|")}` : item.id ? `id:${item.id}` : "";
}

export function listingContentDuplicateKey(item = {}) {
  const postedDay = validPostedDay(item.postedAt || item.posted_at);
  const company = normalizedIdentityText(item.company);
  const title = normalizedIdentityText(item.title);
  const snippet = normalizedIdentityText(item.searchDescription || item.descriptionSnippet || item.description);
  if (!postedDay || !company || !title || snippet.length < 80) return "";

  // Some providers publish one role once for several cities, each with a
  // different outbound URL. Exact normalized copy plus the same publish day
  // is strong enough to collapse that visual duplicate while retaining every
  // location and source below.
  return `content:${company}|${title}|${postedDay}|${snippet.slice(0, 500)}`;
}

function sourcePriority(item = {}) {
  return DIRECT_SOURCE_PRIORITY.get(String(item.sourceId || "").toLowerCase()) ?? 3;
}

function snippetLength(item = {}) {
  return String(item.searchDescription || item.descriptionSnippet || item.description || "").trim().length;
}

function postedTime(item = {}) {
  const value = item.postedAt || item.posted_at;
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function compareRepresentative(left, right) {
  return sourcePriority(left) - sourcePriority(right)
    || snippetLength(right) - snippetLength(left)
    || Number(Boolean(canonicalListingUrlForIdentity(right.url))) - Number(Boolean(canonicalListingUrlForIdentity(left.url)))
    || postedTime(right) - postedTime(left)
    || String(left.id || "").localeCompare(String(right.id || ""));
}

function attributionFor(item = {}) {
  return {
    id: item.sourceId || item.source || "unknown",
    label: item.source || item.sourceId || "Unknown source",
    url: item.url || "",
  };
}

function mergeAttributions(group) {
  const merged = new Map();
  for (const item of group) {
    for (const attribution of item.sourceAttributions || [attributionFor(item)]) {
      const key = `${attribution.id || attribution.label}:${attribution.url || ""}`;
      if (!merged.has(key)) merged.set(key, attribution);
    }
  }
  return [...merged.values()];
}

function mergeLocations(group, representative) {
  const merged = new Map();
  for (const location of [representative?.location, ...group.map((item) => item.location)]) {
    const key = normalizedIdentityText(location);
    if (key && !merged.has(key)) merged.set(key, String(location).trim());
  }
  return [...merged.values()];
}

export function listingLocationSummary(item = {}) {
  const locations = Array.isArray(item.locationVariants) && item.locationVariants.length > 0
    ? item.locationVariants
    : [item.location].filter(Boolean);
  if (locations.length <= 1) return locations[0] || "Location not listed";

  const shown = locations.slice(0, 3).join(" · ");
  const remainder = locations.length - 3;
  return `${locations.length} locations: ${shown}${remainder > 0 ? ` · +${remainder} more` : ""}`;
}

export function clusterDuplicateListings(items = [], { preserveIds = [] } = {}) {
  const groups = [];
  for (const item of items) {
    const duplicateKey = listingDuplicateKey(item);
    const contentDuplicateKey = listingContentDuplicateKey(item);
    const group = groups.find((candidate) => candidate.some((existing) => (
      item.id && existing.id && String(item.id) === String(existing.id)
    ) || (
      duplicateKey && duplicateKey === listingDuplicateKey(existing)
    ) || (
      contentDuplicateKey && contentDuplicateKey === listingContentDuplicateKey(existing)
    )));
    if (group) group.push(item);
    else groups.push([item]);
  }

  const preserved = new Set([...preserveIds].map(String));
  return groups.map((group) => {
    const stableExisting = group.find((item) => preserved.has(String(item.id)));
    const representative = stableExisting || [...group].sort(compareRepresentative)[0];
    const currentRepresentative = group
      .filter((item) => String(item.id) === String(representative.id))
      .reduce((current, item) => ({ ...current, ...item }), representative);
    const locationVariants = mergeLocations(group, currentRepresentative);
    return {
      ...currentRepresentative,
      duplicateKey: listingDuplicateKey(currentRepresentative),
      duplicateIds: [...new Set(group.map(({ id }) => id).filter(Boolean))],
      locationVariants,
      locationCount: locationVariants.length,
      sourceAttributions: mergeAttributions(group),
    };
  });
}
