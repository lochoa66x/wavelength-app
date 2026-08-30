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
  normalizeMarketCode,
} from "../../src/markets.js";
import {
  cleanFeedHtml,
  cleanFeedText,
  feedIsoDate,
  savePublicFeedListings,
} from "./publicFeedStore.js";
import { LISTING_SOURCE_RUN_MODE } from "./listingFreshness.js";

export const ATS_PROVIDERS = new Set(["greenhouse", "lever", "ashby"]);
export const ATS_BOARD_LIMIT = 60;
export const ATS_STALE_AFTER_DAYS = 21;

const GENERIC_REMOTE = /^(?:remote|anywhere|worldwide)$/i;
const CANADA_RELEVANT = /\b(?:canada|canadian|alberta|british columbia|manitoba|new brunswick|newfoundland|labrador|nova scotia|ontario|prince edward island|quebec|québec|saskatchewan|northwest territories|nunavut|yukon|toronto|montreal|montréal|vancouver|calgary|edmonton|ottawa|winnipeg|halifax|north america|worldwide|anywhere)\b/i;
const US_ONLY = /\b(?:united states|u\.?s\.?a?\.? only|us-only)\b/i;
const NORTH_AMERICA_OR_WORLDWIDE = /\b(?:north america|worldwide|anywhere)\b/i;

export function parseAtsBoardConfig(value) {
  if (!cleanFeedText(value)) return [];
  let parsed;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("ATS_JOB_BOARDS must be a JSON array");
  }
  if (!Array.isArray(parsed)) throw new Error("ATS_JOB_BOARDS must be a JSON array");

  const boards = new Map();
  for (const item of parsed.slice(0, ATS_BOARD_LIMIT)) {
    const provider = cleanFeedText(item?.provider).toLowerCase();
    const board = cleanFeedText(item?.board);
    if (!ATS_PROVIDERS.has(provider) || !/^[a-z0-9][a-z0-9_-]{0,99}$/i.test(board)) continue;
    const requestedMarket = cleanFeedText(item?.market || item?.country);
    const marketCode = requestedMarket
      ? normalizeMarketCode(requestedMarket)
      : DEFAULT_MARKET_CODE;
    if (!marketCode) continue;
    const key = `${provider}:${board.toLowerCase()}:${marketCode.toLowerCase()}`;
    if (!boards.has(key)) {
      const config = {
        provider,
        board,
        company: cleanFeedText(item?.company) || board,
      };
      if (requestedMarket) config.marketCode = marketCode;
      boards.set(key, config);
    }
  }
  return [...boards.values()];
}

export function buildAtsBoardUrl({ provider, board }) {
  const token = encodeURIComponent(board);
  if (provider === "greenhouse") {
    return new URL(`https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`);
  }
  if (provider === "lever") {
    return new URL(`https://api.lever.co/v0/postings/${token}?mode=json`);
  }
  if (provider === "ashby") {
    return new URL(`https://api.ashbyhq.com/posting-api/job-board/${token}?includeCompensation=true`);
  }
  throw new Error(`Unsupported ATS provider: ${provider}`);
}

function atsUrl(provider, value) {
  const raw = cleanFeedText(value);
  if (!raw) return "";
  try {
    const parsed = new URL(raw);
    const hostname = parsed.hostname.toLowerCase();
    const allowed = provider === "greenhouse"
      ? hostname === "greenhouse.io" || hostname.endsWith(".greenhouse.io")
      : provider === "lever"
        ? hostname === "lever.co" || hostname.endsWith(".lever.co")
        : hostname === "ashbyhq.com" || hostname.endsWith(".ashbyhq.com");
    return parsed.protocol === "https:" && allowed ? parsed.toString() : "";
  } catch {
    return "";
  }
}

function normalizeAtsJob(config, job) {
  if (config.provider === "greenhouse") {
    return {
      id: job?.id,
      title: job?.title,
      location: job?.location?.name,
      employmentType: job?.metadata?.find?.((field) => /employment type|commitment/i.test(field?.name))?.value,
      description: job?.content,
      url: job?.absolute_url,
      postedAt: job?.updated_at,
      categoryTerms: [job?.departments?.[0]?.name, job?.offices?.[0]?.name].filter(Boolean).join(" "),
    };
  }
  if (config.provider === "lever") {
    return {
      id: job?.id,
      title: job?.text,
      location: job?.categories?.location,
      employmentType: job?.categories?.commitment,
      description: job?.descriptionPlain || job?.description,
      url: job?.hostedUrl,
      postedAt: job?.createdAt,
      categoryTerms: [job?.categories?.team, job?.categories?.department].filter(Boolean).join(" "),
    };
  }
  return {
    id: job?.id || job?.jobUrl,
    title: job?.title,
    location: job?.location,
    employmentType: job?.employmentType,
    description: job?.descriptionPlain || job?.descriptionHtml || job?.description,
    url: job?.jobUrl,
    postedAt: job?.publishedAt,
    categoryTerms: [job?.department, job?.team].filter(Boolean).join(" "),
  };
}

function isMarketRelevant(location, structuredLocation, marketCode) {
  const value = cleanFeedText(location);
  if (structuredLocation.country_code === marketCode) return true;
  if (structuredLocation.country_code && structuredLocation.country_code !== marketCode) return false;
  if (marketCode === "CA" && CANADA_RELEVANT.test(value)) return true;
  if (marketCode === "US" && (US_ONLY.test(value) || NORTH_AMERICA_OR_WORLDWIDE.test(value))) return true;
  if (marketCode === "CA" && US_ONLY.test(value)) return false;
  return GENERIC_REMOTE.test(value);
}

export function mapAtsResult(config, job, { now = new Date() } = {}) {
  const marketCode = normalizeMarketCode(config?.marketCode, DEFAULT_MARKET_CODE);
  const normalized = normalizeAtsJob(config, job);
  const title = cleanFeedHtml(normalized.title);
  const location = cleanFeedHtml(normalized.location) || "Remote";
  const url = atsUrl(config.provider, normalized.url);
  const rawId = cleanFeedText(normalized.id || normalized.url);
  if (!rawId || !title || !url) return null;

  const sourceCategory = guessCategoryFromKeyword(normalized.categoryTerms) || "other";
  const classification = classifyListingTitle(title, sourceCategory);
  const jobType = normalizeWorkArrangement(normalized.employmentType, title);
  const locationType = /\bhybrid\b/i.test(location)
    ? "hybrid"
    : /\bremote\b|anywhere|worldwide/i.test(location)
      ? "remote"
      : "onsite";
  const inferredLocation = toStructuredLocationPatch({
    source: config.provider,
    title,
    location,
    location_type: locationType,
  });
  if (!isMarketRelevant(location, inferredLocation, marketCode)) return null;
  const structuredLocation = {
    ...inferredLocation,
    country_code: inferredLocation.country_code || marketCode,
  };

  const explicitType = jobType !== "unlabeled";
  const description = cleanFeedHtml(normalized.description).slice(0, 12_000) || null;
  return {
    source: config.provider,
    external_id: marketScopedExternalId(`${config.board}:${rawId}`, marketCode),
    title,
    company: config.company,
    location,
    category: classification.category,
    job_type: jobType,
    tier: classification.confidence === "high" && explicitType ? "HIGH" : "MEDIUM",
    reason: explicitType
      ? `Explicitly ${jobType}, employer-direct via ${config.provider}`
      : `Employer-direct listing via ${config.provider}`,
    url,
    description,
    description_snippet: description?.slice(0, 1_200) || null,
    posted_at: feedIsoDate(normalized.postedAt),
    fetched_at: now.toISOString(),
    ...structuredLocation,
  };
}

function jobsFromPayload(provider, payload) {
  if (provider === "greenhouse" || provider === "ashby") {
    return Array.isArray(payload?.jobs) ? payload.jobs : [];
  }
  return Array.isArray(payload) ? payload : [];
}

export async function fetchAtsBoard(config, { fetchImpl = globalThis.fetch, now = new Date() } = {}) {
  let response;
  try {
    response = await fetchImpl(buildAtsBoardUrl(config), {
      headers: {
        Accept: "application/json",
        "User-Agent": "Gigscapes/1.0 (+https://gigscapes.com)",
      },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new Error(`${config.provider} board ${config.board} request failed`);
  }
  if (!response.ok) throw new Error(`${config.provider} board ${config.board} returned HTTP ${response.status}`);
  const payload = await response.json();
  const received = jobsFromPayload(config.provider, payload);
  return {
    rows: received.map((job) => mapAtsResult(config, job, { now })).filter(Boolean),
    received: received.length,
  };
}

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) chunks.push(values.slice(index, index + size));
  return chunks;
}

export async function runAtsBoardIngestion({
  supabase,
  boards,
  fetchImpl = globalThis.fetch,
  now = new Date(),
}) {
  if (!boards?.length) return { skipped: true, boards: 0, received: 0, saved: 0 };

  const results = [];
  for (const batch of chunk(boards, 5)) {
    results.push(...await Promise.allSettled(batch.map(async (config) => ({
      config,
      ...await fetchAtsBoard(config, { fetchImpl, now }),
    }))));
  }
  const successful = results.filter(({ status }) => status === "fulfilled");
  if (successful.length === 0) throw new Error("All configured ATS board requests failed");

  let received = 0;
  const summaries = {};
  for (const result of successful) {
    const { config, rows } = result.value;
    received += result.value.received;
    if (rows.length === 0) continue;
    const sourceScope = marketSourceScope(`${config.provider}:${config.board.toLowerCase()}`, config.marketCode);
    summaries[sourceScope] = await savePublicFeedListings({
      supabase,
      source: config.provider,
      sourceScope,
      rows,
      runMode: LISTING_SOURCE_RUN_MODE.AUTHORITATIVE_SNAPSHOT,
      now,
    });
  }

  return {
    boards: boards.length,
    successfulBoards: successful.length,
    failedBoards: boards.length - successful.length,
    received,
    saved: Object.values(summaries).reduce((total, summary) => total + summary.saved, 0),
    sources: summaries,
  };
}
