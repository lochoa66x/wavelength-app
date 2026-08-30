import {
  DEFAULT_MARKET_CODE,
  SUPPORTED_MARKET_CODES,
  marketDefinition,
  normalizeMarketCode,
} from "../../src/markets.js";

const SOURCE_MARKET_CONFIG = Object.freeze({
  CA: Object.freeze({
    ...marketDefinition("CA"),
    adzunaCountry: "ca",
    joobleApiRoot: "https://ca.jooble.org/api",
    joobleLocation: "Canada",
    jobicyGeo: "canada",
    himalayasCountry: "CA",
  }),
  US: Object.freeze({
    ...marketDefinition("US"),
    adzunaCountry: "us",
    joobleApiRoot: "https://jooble.org/api",
    joobleLocation: "United States",
    jobicyGeo: "usa",
    himalayasCountry: "US",
  }),
});

export function sourceMarketConfig(value = DEFAULT_MARKET_CODE) {
  const code = normalizeMarketCode(value);
  if (!code || !SOURCE_MARKET_CONFIG[code]) {
    throw new Error("Unsupported job market");
  }
  return SOURCE_MARKET_CONFIG[code];
}

export function parseEnabledJobMarkets(value = "") {
  const requested = String(value || "")
    .split(",")
    .map((market) => market.trim())
    .filter(Boolean);

  if (requested.length === 0) return [DEFAULT_MARKET_CODE];
  const normalized = requested.map((market) => normalizeMarketCode(market));
  if (normalized.some((market) => !market)) {
    throw new Error("JOB_MARKETS contains an unsupported market");
  }

  // The pilot may add inventory, but it must never turn off the established
  // Canadian import by accident.
  return [...new Set([DEFAULT_MARKET_CODE, ...normalized])]
    .filter((market) => SUPPORTED_MARKET_CODES.includes(market));
}

export function isMarketEnabled(markets, marketCode) {
  const code = normalizeMarketCode(marketCode);
  return Boolean(code && markets?.includes(code));
}
