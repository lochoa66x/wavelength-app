import { supabase } from "./supabase.js";
import { authenticatedJsonPost } from "./authenticatedRequest.js";

export async function generateCoverLetter(payload, { signal } = {}) {
  const data = await authenticatedJsonPost("/api/cover-letter", payload, {auth:supabase.auth, signal});
  if (!data.letter?.paragraphs?.length) throw new Error("The cover-letter generator returned an incomplete draft.");
  return { ...data.letter, evaluationReport: data.evaluationReport, editorialReview: data.validation?.editorialReviewNeeded === true ? 'needs_review' : null };
}
