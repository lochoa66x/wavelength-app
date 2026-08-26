import { extractJobPostingsFromHtml, composeJobPostingText, readablePageMatchesListing, selectMatchingJobPosting } from "./_lib/jobPostingHtml.js";
import {
  assessDescriptionStatus,
  classifyEnrichmentError,
  descriptionHash,
  descriptionWordCount,
  isFailureCoolingDown,
  isFreshCompleteDescription,
  publicDescriptionMetadata,
  shouldPreserveExistingDescription,
} from "./_lib/listingDescription.js";
import { fetchPublicJobPage } from "./_lib/publicJobPage.js";
import { authenticateSupabaseRequest, bearerToken } from "./_lib/requestAuth.js";
import { createServerSupabaseClient } from "./_lib/serverSupabase.js";

function fallbackPayload(row, errorCode, message, cached = false) {
  return {
    ok: false,
    fallbackRequired: true,
    cached,
    errorCode,
    message,
    listing: publicDescriptionMetadata(row),
  };
}

async function updateListing(supabase, listingId, patch) {
  const { data, error } = await supabase
    .from("listings")
    .update(patch)
    .eq("id", listingId)
    .select("id,description,description_snippet,description_source,description_status,description_source_url,description_fetched_at,description_content_hash,description_enrichment_error_code")
    .single();
  if (error) throw new Error(`Could not save enriched posting: ${error.message}`);
  return data;
}

export function createListingEnrichmentHandler({
  authenticate = authenticateSupabaseRequest,
  createAdmin = createServerSupabaseClient,
  fetchPage = fetchPublicJobPage,
  now = () => new Date(),
} = {}) {
  return async function listingEnrichmentHandler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const token = bearerToken(req);
    if (!token) return res.status(401).json({ error: "Authentication required" });
    const auth = await authenticate(token).catch(() => null);
    if (!auth?.user) return res.status(401).json({ error: "Invalid or expired session" });

    const listingId = String(req.body?.listingId || "").trim();
    if (!listingId) return res.status(400).json({ error: "A listing id is required" });

    let supabase;
    try {
      supabase = createAdmin();
    } catch (error) {
      return res.status(500).json({ error: error.message });
    }

    const { data: listing, error: loadError } = await supabase
      .from("listings")
      .select("*")
      .eq("id", listingId)
      .single();
    if (loadError || !listing) return res.status(404).json({ error: "Listing not found" });

    const attemptedAt = now();
    if (isFreshCompleteDescription(listing, attemptedAt)) {
      return res.status(200).json({ ok: true, cached: true, fallbackRequired: false, listing: publicDescriptionMetadata(listing) });
    }
    if (isFailureCoolingDown(listing, attemptedAt)) {
      return res.status(200).json(fallbackPayload(
        listing,
        listing.description_enrichment_error_code,
        "This source shared only a summary. Add the full posting or tailor a preliminary version from the summary.",
        true,
      ));
    }
    if (!listing.url) {
      return res.status(200).json(fallbackPayload(listing, "unreadable", "This listing has no original posting link."));
    }

    const startedAt = Date.now();
    try {
      const page = await fetchPage(listing.url);
      const structured = extractJobPostingsFromHtml(page.html);
      const matched = selectMatchingJobPosting(structured, listing);
      let candidateText = "";
      let source = "";

      if (matched) {
        candidateText = composeJobPostingText(matched);
        source = "employer_jsonld";
      } else if (readablePageMatchesListing(page.text, listing)) {
        candidateText = page.text;
        source = "employer_html";
      } else {
        const mismatch = new Error("The resolved page does not match the selected title and employer.");
        mismatch.code = "source_mismatch";
        throw mismatch;
      }

      const status = assessDescriptionStatus(candidateText);
      const preserve = shouldPreserveExistingDescription(listing, candidateText);
      const patch = {
        description_snippet: listing.description_snippet || listing.description || null,
        description_fetched_at: attemptedAt.toISOString(),
        description_enrichment_error_code: status === "complete" ? null : "incomplete",
      };
      if (!preserve && descriptionWordCount(candidateText) > descriptionWordCount(listing.description)) {
        Object.assign(patch, {
          description: candidateText,
          description_source: source,
          description_status: status,
          description_source_url: page.url,
          description_content_hash: descriptionHash(candidateText),
        });
      }

      const saved = await updateListing(supabase, listingId, patch);
      console.info("listing_enrichment", {
        listingId,
        source: saved.description_source,
        status: saved.description_status,
        cached: false,
        durationMs: Date.now() - startedAt,
      });
      if (saved.description_status !== "complete") {
        return res.status(200).json(fallbackPayload(
          saved,
          "incomplete",
          "We found the original page, but it still does not contain a complete posting.",
        ));
      }
      return res.status(200).json({ ok: true, cached: false, fallbackRequired: false, listing: publicDescriptionMetadata(saved) });
    } catch (error) {
      const errorCode = classifyEnrichmentError(error);
      const failedRow = await updateListing(supabase, listingId, {
        description_snippet: listing.description_snippet || listing.description || null,
        description_source: listing.description_source || "provider_snippet",
        description_status: listing.description_status || assessDescriptionStatus(listing.description),
        description_source_url: listing.description_source_url || listing.url,
        description_fetched_at: attemptedAt.toISOString(),
        description_enrichment_error_code: errorCode,
      }).catch(() => ({ ...listing, description_fetched_at: attemptedAt.toISOString(), description_enrichment_error_code: errorCode }));
      console.warn("listing_enrichment_failed", {
        listingId,
        errorCode,
        durationMs: Date.now() - startedAt,
      });
      return res.status(200).json(fallbackPayload(
        failedRow,
        errorCode,
        "This source shared only a summary. Add the full posting, upload screenshots, or tailor a preliminary version from the summary.",
      ));
    }
  };
}

export default createListingEnrichmentHandler();
