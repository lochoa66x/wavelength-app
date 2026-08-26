import { validateQualitySignal } from "./qualitySignalContract.js";

export const QUALITY_SIGNAL_MIN_COHORT = 10;

export function evaluateQualitySignals(entries, { minCohort = QUALITY_SIGNAL_MIN_COHORT, groupBy = "eventName" } = {}) {
  if (!Array.isArray(entries)) throw new Error("Quality signal entries must be an array.");
  if (!Number.isInteger(minCohort) || minCohort < QUALITY_SIGNAL_MIN_COHORT) {
    throw new Error(`Minimum cohort must be at least ${QUALITY_SIGNAL_MIN_COHORT}.`);
  }
  const groups = new Map();
  let total = 0;
  for (const entry of entries) {
    const signal = entry?.signal || entry;
    const count = entry?.signal ? Number(entry.count) : 1;
    const validation = validateQualitySignal(signal);
    if (!validation.ok || !Number.isSafeInteger(count) || count < 1) throw new Error("Evaluation input violates the quality signal contract.");
    const key = signal[groupBy];
    if (typeof key !== "string") throw new Error("Evaluation group must be an allowlisted signal field.");
    groups.set(key, (groups.get(key) || 0) + count);
    total += count;
  }
  const publishableGroups = {};
  let suppressedEvents = 0;
  let suppressedGroups = 0;
  for (const [key, count] of [...groups.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    if (count < minCohort) {
      suppressedEvents += count;
      suppressedGroups += 1;
    } else {
      publishableGroups[key] = count;
    }
  }
  return {
    schemaVersion: 1,
    redacted: true,
    totalEvents: total,
    minCohort,
    groupBy,
    publishableGroups,
    suppression: { groups: suppressedGroups, events: suppressedEvents },
  };
}
