import { track } from "@vercel/analytics";

const OUTCOMES = new Set(["started", "proposed", "follow_up", "approved", "edited", "rejected", "cancelled", "failed"]);
const DISPOSITIONS = new Set(["reviewable", "follow_up"]);
const CONFIDENCE = new Set(["high", "medium", "low"]);

export function evidenceCoachEvent(outcome, metadata = {}, trackImpl = track) {
  if (!OUTCOMES.has(outcome)) return false;
  const properties = { outcome };
  if (DISPOSITIONS.has(metadata.disposition)) properties.disposition = metadata.disposition;
  if (CONFIDENCE.has(metadata.confidence)) properties.confidence = metadata.confidence;
  try {
    trackImpl("evidence_coach", properties);
    return true;
  } catch {
    return false;
  }
}
