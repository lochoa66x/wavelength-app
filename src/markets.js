export const DEFAULT_MARKET_CODE = "CA";

export const MARKET_REGISTRY = Object.freeze({
  CA: Object.freeze({
    code: "CA",
    label: "Canada",
    optionLabel: "Canada",
    stage: "established",
  }),
  US: Object.freeze({
    code: "US",
    label: "United States",
    optionLabel: "United States (pilot)",
    stage: "pilot",
  }),
});

export const SUPPORTED_MARKET_CODES = Object.freeze(Object.keys(MARKET_REGISTRY));

const MARKET_ALIASES = new Map([
  ["ca", "CA"],
  ["can", "CA"],
  ["canada", "CA"],
  ["canadian", "CA"],
  ["us", "US"],
  ["usa", "US"],
  ["u s", "US"],
  ["u s a", "US"],
  ["united states", "US"],
  ["united states of america", "US"],
]);

function cleanMarketValue(value = "") {
  return String(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeMarketCode(value = "", fallback = "") {
  const normalized = MARKET_ALIASES.get(cleanMarketValue(value));
  if (normalized) return normalized;
  return MARKET_REGISTRY[fallback] ? fallback : "";
}

export function marketDefinition(value, fallback = DEFAULT_MARKET_CODE) {
  const code = normalizeMarketCode(value, fallback);
  return MARKET_REGISTRY[code] || MARKET_REGISTRY[DEFAULT_MARKET_CODE];
}

export function marketSourceScope(source, marketCode = DEFAULT_MARKET_CODE) {
  const normalizedSource = String(source || "").trim().toLowerCase();
  if (!normalizedSource) throw new Error("A source is required for a market scope");
  const market = marketDefinition(marketCode);
  // Preserve every pre-pilot Canadian scope and deterministic listing identity.
  return market.code === DEFAULT_MARKET_CODE
    ? normalizedSource
    : `${normalizedSource}:${market.code.toLowerCase()}`;
}

export function marketScopedExternalId(externalId, marketCode = DEFAULT_MARKET_CODE) {
  const cleanId = String(externalId || "").trim();
  if (!cleanId) return "";
  const market = marketDefinition(marketCode);
  // Canadian external IDs are intentionally unchanged for backward compatibility.
  return market.code === DEFAULT_MARKET_CODE ? cleanId : `${market.code}:${cleanId}`;
}
