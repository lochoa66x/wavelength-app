export const AVAILABILITY_STALE_AFTER_MS = 48 * 60 * 60 * 1000;

function validDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

export function isListingAvailabilityStale(listing, {
  now = Date.now(),
  staleAfterMs = AVAILABILITY_STALE_AFTER_MS,
} = {}) {
  const checkedAt = validDate(listing?.lastCheckedAt)?.getTime();
  return !Number.isFinite(checkedAt) || Math.max(0, now - checkedAt) >= staleAfterMs;
}

export function shouldCheckBeforeTailoring(listing, options = {}) {
  return listing?.availabilityStatus === "uncertain" || isListingAvailabilityStale(listing, options);
}

export function availabilityPatch(payload = {}) {
  const availability = payload.availability || {};
  return {
    availabilityStatus: availability.status || "uncertain",
    availabilityReason: availability.reason || null,
    lastCheckedAt: availability.lastCheckedAt || null,
    lastSeenAt: availability.lastSeenAt || null,
    closedAt: availability.closedAt || null,
    validThrough: availability.validThrough || null,
  };
}

export function formatAvailabilityTime(value, { now = Date.now() } = {}) {
  const date = validDate(value);
  if (!date) return "Not checked yet";
  const elapsed = Math.max(0, now - date.getTime());
  if (elapsed < 60 * 60 * 1000) return "Checked within the hour";
  if (elapsed < 24 * 60 * 60 * 1000) return `Checked ${Math.floor(elapsed / (60 * 60 * 1000))}h ago`;
  const days = Math.floor(elapsed / (24 * 60 * 60 * 1000));
  return `Checked ${days}d ago`;
}

export function getAvailabilityPresentation(listing, options = {}) {
  const status = listing?.availabilityStatus || "active";
  const timing = formatAvailabilityTime(listing?.lastCheckedAt, options);
  if (status === "closed") {
    return { status, label: "Posting closed", detail: timing, tone: "danger" };
  }
  if (status === "uncertain") {
    return { status, label: "Availability uncertain", detail: timing, tone: "warning" };
  }
  if (isListingAvailabilityStale(listing, options)) {
    return { status: "stale", label: "Check availability", detail: timing, tone: "neutral" };
  }
  return { status, label: "Recently available", detail: timing, tone: "positive" };
}
