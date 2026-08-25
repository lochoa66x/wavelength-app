import { canonicalListingUrlForIdentity } from "./listingIdentity.js";

const KNOWN_SOURCE_IDS = new Set([
  "adzuna",
  "ashby",
  "greenhouse",
  "himalayas",
  "jobicy",
  "jooble",
  "lever",
  "wwr",
]);

function sourceBucket(value) {
  const source = String(value || "").trim().toLowerCase();
  return KNOWN_SOURCE_IDS.has(source) ? source : "other";
}

function validDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function auditPublicListingQuality(rows = [], {
  now = new Date(),
  staleAfterDays = 60,
} = {}) {
  const clock = validDate(now) || new Date();
  const staleCutoff = clock.getTime() - staleAfterDays * 24 * 60 * 60 * 1000;
  const futureLimit = clock.getTime() + 24 * 60 * 60 * 1000;
  const sourceStats = new Map();
  const canonicalUrls = new Set();
  let validHttpsUrls = 0;
  let invalidUrls = 0;
  let duplicateUrls = 0;
  let dated = 0;
  let undated = 0;
  let stale = 0;
  let futureDated = 0;
  let snippetsPresent = 0;

  for (const row of rows) {
    const source = sourceBucket(row?.source);
    const sourceSummary = sourceStats.get(source) || {
      source,
      count: 0,
      invalidUrls: 0,
      undated: 0,
      stale: 0,
      futureDated: 0,
      snippetsAbsent: 0,
    };
    sourceSummary.count += 1;
    sourceStats.set(source, sourceSummary);

    const canonicalUrl = canonicalListingUrlForIdentity(row?.url);
    if (canonicalUrl?.startsWith("https://")) {
      validHttpsUrls += 1;
      if (canonicalUrls.has(canonicalUrl)) duplicateUrls += 1;
      else canonicalUrls.add(canonicalUrl);
    } else {
      invalidUrls += 1;
      sourceSummary.invalidUrls += 1;
    }

    const postedAt = validDate(row?.posted_at);
    if (!postedAt) {
      undated += 1;
      sourceSummary.undated += 1;
    } else {
      dated += 1;
      if (postedAt.getTime() < staleCutoff) {
        stale += 1;
        sourceSummary.stale += 1;
      }
      if (postedAt.getTime() > futureLimit) {
        futureDated += 1;
        sourceSummary.futureDated += 1;
      }
    }

    if (String(row?.description_snippet || "").trim()) snippetsPresent += 1;
    else sourceSummary.snippetsAbsent += 1;
  }

  return {
    schemaVersion: 1,
    redacted: true,
    totalRows: rows.length,
    sources: [...sourceStats.values()]
      .sort((left, right) => left.source.localeCompare(right.source)),
    urls: {
      validHttps: validHttpsUrls,
      invalid: invalidUrls,
      canonicalDuplicates: duplicateUrls,
    },
    freshness: {
      dated,
      undated,
      stale,
      futureDated,
      staleAfterDays,
    },
    snippets: {
      present: snippetsPresent,
      absent: rows.length - snippetsPresent,
    },
  };
}
