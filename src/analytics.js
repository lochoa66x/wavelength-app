const SUPPRESSED_PATHS = new Set(["/auth/callback"]);

export function sanitizeVercelAnalyticsEvent(event, origin = globalThis.location?.origin || "https://gigscapes.invalid") {
  if (!event || typeof event.url !== "string") return null;
  try {
    const parsed = new URL(event.url, origin);
    if (SUPPRESSED_PATHS.has(parsed.pathname)) return null;
    parsed.search = "";
    parsed.hash = "";
    return { ...event, url: parsed.toString() };
  } catch {
    return null;
  }
}
