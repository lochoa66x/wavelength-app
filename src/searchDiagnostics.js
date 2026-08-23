export function diagnoseSearchResults({
  keyword = "",
  intent,
  availableCount = 0,
  keywordMatchCount = 0,
  workTypeMatchCount = 0,
  filteredCount = 0,
  hasLocationFilter = false,
  filterByWorkType = false,
  locationLabel = "the selected location",
}) {
  if (!keyword.trim()) return null;

  if (!intent?.recognized) {
    return {
      kind: "unrecognized",
      tone: "warning",
      message: `We couldn't identify “${keyword}” as a job, gig, skill, or technology yet. Try a role such as “SAP consultant”, “Java developer”, or “SaaS sales”.`,
      suggestions: [],
      canBroadenLocation: false,
    };
  }

  if (availableCount === 0) {
    return {
      kind: hasLocationFilter ? "location_inventory" : "inventory",
      tone: "info",
      message: hasLocationFilter
        ? `No current listings are loaded for ${locationLabel}. Broaden the location or try again after the next feed refresh.`
        : "No current listings are loaded from the live feeds. Try again after the next refresh.",
      suggestions: intent.suggestions || [],
      canBroadenLocation: hasLocationFilter,
    };
  }

  if (keywordMatchCount === 0) {
    const recognizedLabel = intent.label || keyword;
    return {
      kind: "keyword_inventory",
      tone: "info",
      message: `We recognize ${recognizedLabel} as a valid search, but none of the ${availableCount} loaded listings mention it in the title or description.`,
      suggestions: intent.suggestions || [],
      canBroadenLocation: hasLocationFilter,
    };
  }

  if (filterByWorkType && workTypeMatchCount === 0) {
    return {
      kind: "work_type",
      tone: "info",
      message: `${keywordMatchCount} relevant listing${keywordMatchCount === 1 ? " is" : "s are"} loaded, but none match the selected work type.`,
      suggestions: [],
      canBroadenLocation: false,
    };
  }

  if (hasLocationFilter && filteredCount === 0) {
    return {
      kind: "location",
      tone: "info",
      message: `${workTypeMatchCount || keywordMatchCount} relevant listing${(workTypeMatchCount || keywordMatchCount) === 1 ? " is" : "s are"} loaded, but none match ${locationLabel}.`,
      suggestions: [],
      canBroadenLocation: true,
    };
  }

  return null;
}
