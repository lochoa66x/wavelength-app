import { supabase } from "./supabase.js";

async function authenticatedPost(path, body) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Your session expired. Sign in again to continue.");

  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

export async function tailorResume(resume, target) {
  const data = await authenticatedPost("/api/tailor", { resume, ...target });
  if (!data.resume?.profile) throw new Error("The tailor returned an incomplete draft.");
  return {
    resume: data.resume,
    atsReview: data.ats_review || null,
    postingReadiness: data.posting_readiness || data.ats_review?.posting_readiness || null,
    listingRelevance: data.listing_relevance || null,
    candidateFit: data.candidate_fit || data.ats_review?.candidate_fit || null,
    requirements: data.requirements || data.ats_review?.requirements || [],
    applicationReady: data.application_ready === true,
    outputMode: data.output_mode || "preliminary",
  };
}

export async function enrichListing(listingId) {
  return authenticatedPost("/api/listing-enrichment", { listingId });
}

export async function extractCustomJob(payload) {
  const data = await authenticatedPost("/api/job-intake", payload);
  if (!data.brief?.title || !data.brief?.description) throw new Error("The posting could not be extracted completely.");
  return data.brief;
}
