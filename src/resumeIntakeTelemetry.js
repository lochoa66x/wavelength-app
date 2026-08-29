import { track } from "@vercel/analytics";

const SOURCES = new Set(["paste", "docx", "pdf", "photo"]);
const OUTCOMES = new Set(["started", "review_ready", "failed", "saved"]);

export function resumeIntakeEvent(source, outcome, trackImpl = track) {
  if (!SOURCES.has(source) || !OUTCOMES.has(outcome)) return false;
  try {
    trackImpl("resume_intake", { source, outcome });
    return true;
  } catch {
    return false;
  }
}
