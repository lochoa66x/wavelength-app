import { supabase } from "./supabase.js";

async function authenticatedPost(path, body, { signal } = {}) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("Your session expired. Sign in again to continue.");

  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(body),
    cache: "no-store",
    credentials: "same-origin",
    signal,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}

export async function tailorResume(resume, target, options = {}) {
  const data = await authenticatedPost("/api/tailor", { resume, ...target }, options);
  if (!data.resume?.profile) throw new Error("The tailor returned an incomplete draft.");
  return {
    resume: data.resume,
    atsReview: data.ats_review || null,
    postingReadiness: data.posting_readiness || data.ats_review?.posting_readiness || null,
    listingRelevance: data.listing_relevance || null,
    candidateFit: data.candidate_fit || data.ats_review?.candidate_fit || null,
    requirements: data.requirements || data.ats_review?.requirements || [],
    evidenceQuestions: data.evidence_questions || data.ats_review?.evidence_questions || [],
    candidateEvidence: data.candidate_evidence || [],
    applicationReady: data.application_ready === true,
    outputMode: data.output_mode || "preliminary",
  };
}

export async function enrichListing(listingId, options = {}) {
  return authenticatedPost("/api/listing-enrichment", { listingId }, options);
}

export async function checkListingAvailability(listingId, options = {}) {
  return authenticatedPost("/api/listing-availability", { listingId }, options);
}

export async function extractCustomJob(payload, options = {}) {
  const data = await authenticatedPost("/api/job-intake", payload, options);
  if (!data.brief?.title || !data.brief?.description) throw new Error("The posting could not be extracted completely.");
  return data.brief;
}

export async function extractResumeImages(images, options = {}) {
  const data = await authenticatedPost("/api/resume-intake", { images }, options);
  if (typeof data.text !== "string" || data.text.trim().length < 40) throw new Error("The résumé images did not contain enough readable text.");
  return { text: data.text.trim(), warnings: Array.isArray(data.warnings) ? data.warnings : [] };
}

export async function clarifyCandidateEvidence(payload, options = {}) {
  const data = await authenticatedPost("/api/evidence-coach", payload, options);
  if (!data.proposal?.disposition) throw new Error("The evidence clarification response was incomplete.");
  return data.proposal;
}
