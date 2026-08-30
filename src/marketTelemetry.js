import { track } from "@vercel/analytics";

import { normalizeMarketCode } from "./markets.js";

const OUTCOMES = new Set(["results", "empty", "failed"]);

export function marketSearchEvent(marketCode, outcome, trackImpl = track) {
  const market = normalizeMarketCode(marketCode);
  if (!market || !OUTCOMES.has(outcome)) return false;
  try {
    // Deliberately coarse: no keyword, city, state, listing, résumé, user, or
    // source URL is present in this event.
    trackImpl("market_search", { market: market.toLowerCase(), outcome });
    return true;
  } catch {
    return false;
  }
}
