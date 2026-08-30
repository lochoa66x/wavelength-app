import {
  classifyListingTitle,
  guessCategoryFromKeyword,
  normalizeWorkArrangement,
} from "../../src/listingCategories.js";
import { toStructuredLocationPatch } from "../../src/listingLocations.js";
import {
  DEFAULT_MARKET_CODE,
  marketScopedExternalId,
  marketSourceScope,
} from "../../src/markets.js";
import {
  cleanFeedHtml,
  cleanFeedText,
  daysBefore,
  feedIsoDate,
  savePublicFeedListings,
} from "./publicFeedStore.js";
import { LISTING_SOURCE_RUN_MODE } from "./listingFreshness.js";
import { sourceMarketConfig } from "./sourceMarkets.js";

export const HIMALAYAS_COUNTRY = "CA";
export const HIMALAYAS_PAGE_BUDGET = 5;
export const HIMALAYAS_MAX_DAYS_OLD = 45;
export const HIMALAYAS_STALE_AFTER_DAYS = 60;

const HIMALAYAS_API_URL = "https://himalayas.app/jobs/api/search";

export function buildHimalayasFeedUrl(page = 1, marketCode = DEFAULT_MARKET_CODE) {
  const market = sourceMarketConfig(marketCode);
  const url = new URL(HIMALAYAS_API_URL);
  url.searchParams.set("country", market.himalayasCountry);
  url.searchParams.set("sort", "recent");
  url.searchParams.set("page", String(page));
  return url;
}

function canonicalHimalayasUrl(job) {
  const value = cleanFeedText(job?.applicationLink);
  if (!value) return "";
  try {
    const parsed = new URL(value);
    const hostname = parsed.hostname.toLowerCase();
    return parsed.protocol === "https:" && (hostname === "himalayas.app" || hostname.endsWith(".himalayas.app"))
      ? parsed.toString()
      : "";
  } catch {
    return "";
  }
}

function restrictions(job) {
  return (Array.isArray(job?.locationRestrictions) ? job.locationRestrictions : [])
    .map((value) => typeof value === "string" ? value : value?.name || value?.alpha2 || value?.slug)
    .map(cleanFeedText)
    .filter(Boolean);
}

export async function fetchHimalayasListings({
  marketCode = DEFAULT_MARKET_CODE,
  fetchImpl = globalThis.fetch,
  now = new Date(),
} = {}) {
  const cutoff = new Date(daysBefore(now, HIMALAYAS_MAX_DAYS_OLD));
  const received = [];
  let requests = 0;
  let reachedTerminalPage = false;

  for (let page = 1; page <= HIMALAYAS_PAGE_BUDGET; page += 1) {
    let response;
    try {
      response = await fetchImpl(buildHimalayasFeedUrl(page, marketCode), {
        headers: {
          Accept: "application/json",
          "User-Agent": "Gigscapes/1.0 (+https://gigscapes.com)",
        },
        signal: AbortSignal.timeout(15_000),
      });
    } catch {
      throw new Error("Himalayas request failed");
    }
    requests += 1;
    if (!response.ok) throw new Error(`Himalayas returned HTTP ${response.status}`);

    const payload = await response.json();
    const jobs = Array.isArray(payload?.jobs) ? payload.jobs : [];
    received.push(...jobs);
    if (jobs.length === 0) {
      reachedTerminalPage = true;
      break;
    }
  }

  const fresh = received.filter((job) => {
    const publishedAt = feedIsoDate(job?.pubDate);
    const published = publishedAt ? new Date(publishedAt) : new Date(Number.NaN);
    if (Number.isNaN(published.getTime()) || published < cutoff) return false;
    const expiryAt = job?.expiryDate ? feedIsoDate(job.expiryDate) : null;
    const expiry = expiryAt ? new Date(expiryAt) : null;
    return !expiry || Number.isNaN(expiry.getTime()) || expiry >= now;
  });
  const unique = new Map();
  for (const job of fresh) {
    const id = cleanFeedText(job?.guid || job?.applicationLink);
    if (id && !unique.has(id)) unique.set(id, job);
  }

  return {
    items: [...unique.values()],
    stats: {
      requests,
      received: received.length,
      fresh: fresh.length,
      unique: unique.size,
      reachedTerminalPage,
      pageBudgetExhausted: !reachedTerminalPage && requests >= HIMALAYAS_PAGE_BUDGET,
    },
  };
}

export function mapHimalayasResult(job, {
  now = new Date(),
  marketCode = DEFAULT_MARKET_CODE,
} = {}) {
  const market = sourceMarketConfig(marketCode);
  const externalId = marketScopedExternalId(job?.guid || job?.applicationLink, market.code);
  const title = cleanFeedHtml(job?.title);
  const url = canonicalHimalayasUrl(job);
  const postedAt = feedIsoDate(job?.pubDate);
  if (!externalId || !title || !url || !postedAt) return null;

  const sourceTerms = [
    ...(Array.isArray(job?.parentCategories) ? job.parentCategories : []),
    ...(Array.isArray(job?.categories) ? job.categories : []),
  ].join(" ");
  const sourceCategory = guessCategoryFromKeyword(sourceTerms) || "other";
  const classification = classifyListingTitle(title, sourceCategory);
  const jobType = normalizeWorkArrangement(job?.employmentType, title);
  const allowedLocations = restrictions(job);
  const eligibility = allowedLocations.length > 0 ? allowedLocations.join(", ") : "Worldwide";
  const location = `Remote, ${eligibility}`;
  const structuredLocation = toStructuredLocationPatch({
    source: "himalayas",
    title,
    location,
    location_type: "remote",
    country_code: market.code,
  });
  const explicitType = jobType !== "unlabeled";
  const description = cleanFeedHtml(job?.description || job?.excerpt).slice(0, 12_000) || null;

  return {
    source: "himalayas",
    external_id: externalId,
    title,
    company: cleanFeedHtml(job?.companyName) || "Unknown",
    location,
    category: classification.category,
    job_type: jobType,
    tier: classification.confidence === "high" && explicitType ? "HIGH" : "MEDIUM",
    reason: explicitType
      ? `Explicitly ${jobType}, matched ${classification.category} from Himalayas`
      : `Matched ${classification.category} from Himalayas`,
    url,
    description,
    description_snippet: description?.slice(0, 1_200) || null,
    posted_at: postedAt,
    fetched_at: now.toISOString(),
    ...structuredLocation,
  };
}

export async function runHimalayasIngestion({
  supabase,
  marketCode = DEFAULT_MARKET_CODE,
  fetchImpl = globalThis.fetch,
  now = new Date(),
}) {
  const market = sourceMarketConfig(marketCode);
  const feed = await fetchHimalayasListings({ marketCode: market.code, fetchImpl, now });
  const rows = feed.items.map((job) => mapHimalayasResult(job, { now, marketCode: market.code })).filter(Boolean);
  const saved = await savePublicFeedListings({
    supabase,
    source: "himalayas",
    sourceScope: marketSourceScope("himalayas", market.code),
    rows,
    runMode: feed.stats.reachedTerminalPage
      ? LISTING_SOURCE_RUN_MODE.AUTHORITATIVE_SNAPSHOT
      : LISTING_SOURCE_RUN_MODE.OBSERVATION_ONLY,
    now,
  });
  return { market: market.code, ...feed.stats, ...saved };
}
