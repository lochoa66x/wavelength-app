import {
  extractJobPostingsFromHtml,
  readablePageMatchesListing,
  selectMatchingJobPosting,
} from "./_lib/jobPostingHtml.js";
import {
  classifyAvailabilityFetch,
  isAvailabilityCheckFresh,
  LISTING_AVAILABILITY,
  LISTING_CLOSE_AFTER_MISSES,
} from "./_lib/listingFreshness.js";
import { fetchPublicJobPage } from "./_lib/publicJobPage.js";
import { authenticateSupabaseRequest, bearerToken } from "./_lib/requestAuth.js";
import { createServerSupabaseClient } from "./_lib/serverSupabase.js";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SAFE_SOURCES = new Set(["adzuna", "jooble", "jobicy", "himalayas", "greenhouse", "lever", "ashby", "wwr"]);
const SAFE_SELECT = "id,title,company,url,source,availability_status,availability_reason,last_checked_at,last_seen_at,closed_at,consecutive_misses,valid_through";

function errorProbe(error) {
  if (error?.name === "AbortError" || /timed out|timeout/i.test(error?.message || "")) {
    return { errorCode: "timeout", httpStatus: error?.httpStatus };
  }
  if (error?.httpStatus) return { errorCode: error?.code, httpStatus: error.httpStatus };
  if (/fetch|network|resolve|socket|dns|certificate/i.test(error?.message || "")) {
    return { errorCode: "network_error" };
  }
  return { errorCode: error?.code || "unreadable" };
}

function safePayload(listing, cached = false) {
  return {
    ok: true,
    cached,
    availability: {
      status: listing.availability_status,
      reason: listing.availability_reason,
      lastCheckedAt: listing.last_checked_at,
      lastSeenAt: listing.last_seen_at,
      closedAt: listing.closed_at,
      validThrough: listing.valid_through,
    },
  };
}

function availabilityMessage(status) {
  if (status === LISTING_AVAILABILITY.CLOSED) return "This posting appears to be closed. Your saved history and tailored documents are still available.";
  if (status === LISTING_AVAILABILITY.UNCERTAIN) return "The publisher did not provide enough evidence to confirm whether this posting is still open.";
  return "This posting is currently available on the publisher's page.";
}

export function createListingAvailabilityHandler({
  authenticate = authenticateSupabaseRequest,
  createAdmin = createServerSupabaseClient,
  fetchPage = fetchPublicJobPage,
  now = () => new Date(),
} = {}) {
  return async function listingAvailabilityHandler(req, res) {
    res.setHeader("Cache-Control", "private, no-store");
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const token = bearerToken(req);
    if (!token) return res.status(401).json({ error: "Authentication required" });
    const auth = await authenticate(token).catch(() => null);
    if (!auth?.user) return res.status(401).json({ error: "Invalid or expired session" });

    const listingId = String(req.body?.listingId || "").trim();
    if (!UUID_PATTERN.test(listingId)) return res.status(400).json({ error: "A valid listing id is required" });

    let supabase;
    try {
      supabase = createAdmin();
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }

    const { data: listing, error: loadError } = await supabase
      .from("listings")
      .select(SAFE_SELECT)
      .eq("id", listingId)
      .single();
    if (loadError || !listing) return res.status(404).json({ error: "Listing not found" });

    const checkedAt = now();
    if (isAvailabilityCheckFresh(listing.last_checked_at, { now: checkedAt.getTime() })) {
      return res.status(200).json({ ...safePayload(listing, true), message: availabilityMessage(listing.availability_status) });
    }

    const startedAt = Date.now();
    let classification;
    let validThrough = listing.valid_through;
    try {
      const page = await fetchPage(listing.url);
      const postings = extractJobPostingsFromHtml(page.html);
      const matched = selectMatchingJobPosting(postings, listing);
      validThrough = matched?.validThrough || validThrough;
      classification = classifyAvailabilityFetch({
        httpStatus: 200,
        hasMatchingPosting: Boolean(matched),
        readablePageMatches: readablePageMatchesListing(page.text, listing),
        // Only treat an expiry as current closure evidence when it came from
        // the JobPosting that matched this fetch. A previously stored expiry
        // must not override a currently readable, matching employer page.
        validThrough: matched?.validThrough || null,
        now: checkedAt,
      });
    } catch (error) {
      classification = classifyAvailabilityFetch({ ...errorProbe(error), now: checkedAt });
    }

    if (listing.availability_status === LISTING_AVAILABILITY.CLOSED
      && classification.status === LISTING_AVAILABILITY.UNCERTAIN) {
      classification = {
        status: LISTING_AVAILABILITY.CLOSED,
        reason: listing.availability_reason || "missed_repeatedly",
      };
    }

    const patch = {
      availability_status: classification.status,
      availability_reason: classification.reason,
      last_checked_at: checkedAt.toISOString(),
      valid_through: validThrough || null,
    };
    if (classification.status === LISTING_AVAILABILITY.ACTIVE) {
      Object.assign(patch, { last_seen_at: checkedAt.toISOString(), closed_at: null, consecutive_misses: 0 });
    } else if (classification.status === LISTING_AVAILABILITY.CLOSED) {
      Object.assign(patch, {
        closed_at: listing.closed_at || checkedAt.toISOString(),
        consecutive_misses: Math.max(Number(listing.consecutive_misses || 0), LISTING_CLOSE_AFTER_MISSES),
      });
    }

    const { data: saved, error: saveError } = await supabase
      .from("listings")
      .update(patch)
      .eq("id", listingId)
      .select(SAFE_SELECT)
      .single();
    if (saveError) return res.status(500).json({ error: "Availability could not be saved" });

    console.info(JSON.stringify({
      event: "listing_availability_check",
      status: saved.availability_status,
      reason: saved.availability_reason,
      source: SAFE_SOURCES.has(saved.source) ? saved.source : "other",
      durationBand: Date.now() - startedAt < 1_000 ? "under_1s" : Date.now() - startedAt < 5_000 ? "1_to_5s" : "over_5s",
    }));

    return res.status(200).json({ ...safePayload(saved), message: availabilityMessage(saved.availability_status) });
  };
}

export default createListingAvailabilityHandler();
