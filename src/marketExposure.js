import { normalizeMarketCode } from "./markets.js";

const viteEnv = import.meta.env ?? {};

export function usMarketExposureEnabled(env = viteEnv) {
  return String(env?.VITE_US_MARKET_ENABLED || "").trim().toLowerCase() === "true";
}

export const US_MARKET_EXPOSURE_ENABLED = usMarketExposureEnabled();

export function exposedCountryOptions(options = [], usEnabled = US_MARKET_EXPOSURE_ENABLED) {
  if (usEnabled) {
    return options.filter(({ id }) => id === "" || id === "CA" || id === "US");
  }

  // With one public market there is no meaningful "Any country" choice. Keeping
  // only Canada also prevents staged US inventory from appearing through an
  // unscoped query before the pilot is deliberately exposed.
  return options.filter(({ id }) => id === "CA");
}

export function enforceExposedLocationCriteria(criteria = {}, usEnabled = US_MARKET_EXPOSURE_ENABLED) {
  const source = criteria && typeof criteria === "object" && !Array.isArray(criteria)
    ? criteria
    : {};
  const requested = String(source.countryCode || source.country_code || "").trim();
  const countryCode = normalizeMarketCode(requested);

  if (usEnabled && (!requested || countryCode === "CA" || countryCode === "US")) {
    return { ...source, countryCode };
  }

  if (!usEnabled && countryCode === "CA") {
    return { ...source, countryCode: "CA" };
  }

  return {
    ...source,
    countryCode: "CA",
    region: "",
    city: "",
  };
}
