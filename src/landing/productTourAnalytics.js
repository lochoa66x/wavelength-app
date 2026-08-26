export const PRODUCT_TOUR_EVENT = "gigscapes:product-tour-event";

const ALLOWED_EVENTS = new Set([
  "impression",
  "autoplay_started",
  "play",
  "pause",
  "replay",
  "complete",
  "transcript_opened",
  "cta_clicked",
  "error",
]);

export function productTourEventDetail(eventName, surface = "landing_loop") {
  if (!ALLOWED_EVENTS.has(eventName)) return null;
  return Object.freeze({
    eventName: `product_tour_${eventName}`,
    surface: surface === "full_guide" ? "full_guide" : "landing_loop",
  });
}

export function trackProductTourEvent(eventName, surface, target = globalThis.window) {
  const detail = productTourEventDetail(eventName, surface);
  if (!detail || !target?.dispatchEvent || typeof CustomEvent !== "function") return false;
  target.dispatchEvent(new CustomEvent(PRODUCT_TOUR_EVENT, { detail }));
  return true;
}
