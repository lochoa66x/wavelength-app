import {
  classifyListingTitle,
  formatWorkArrangement,
  normalizeListingReason,
  normalizeWorkArrangement,
} from "./listingCategories.js";
import { formatListingLocation, normalizeListingLocation } from "./listingLocations.js";

const SOURCE_DISPLAY_NAMES = {
  wwr: "We Work Remotely",
  adzuna: "Jobs by Adzuna",
  jooble: "Jooble",
  jobicy: "Jobicy",
  himalayas: "Himalayas",
  greenhouse: "Greenhouse",
  lever: "Lever",
  ashby: "Ashby",
  craigslist: "Craigslist",
};

export function mapListingRow(row) {
  const classification = classifyListingTitle(row.title, row.category);
  const workArrangement = normalizeWorkArrangement(row.job_type, row.title);
  const locationData = normalizeListingLocation(row);
  const source = SOURCE_DISPLAY_NAMES[row.source] || row.source;
  const postedDate = row.posted_at ? new Date(row.posted_at) : null;
  const postedAt = postedDate && !Number.isNaN(postedDate.getTime()) ? postedDate.toISOString() : null;

  return {
    id: row.id,
    category: classification.category,
    subcategory: classification.subcategory,
    classificationConfidence: classification.confidence,
    tier: row.tier,
    title: row.title,
    company: row.company || "Unknown",
    location: formatListingLocation(locationData, row.location),
    locationData,
    locationQuality: locationData.source,
    type: formatWorkArrangement(workArrangement),
    workArrangement,
    source,
    sourceId: row.source,
    sourceAttributions: [{ id: row.source, label: source, url: row.url || "" }],
    city: row.city,
    reason: normalizeListingReason(row.reason, row.category, classification.category),
    description: null,
    descriptionSnippet: row.description_snippet || null,
    searchDescription: row.description_snippet || "",
    descriptionSourceUrl: row.url || "",
    postedAt,
    url: row.url,
    availabilityStatus: row.availability_status || "active",
    availabilityReason: row.availability_reason || null,
    firstSeenAt: row.first_seen_at || null,
    lastSeenAt: row.last_seen_at || null,
    lastCheckedAt: row.last_checked_at || null,
    closedAt: row.closed_at || null,
    validThrough: row.valid_through || null,
  };
}
