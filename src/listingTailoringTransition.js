const PANEL_PREFIX = "listing-tailoring-panel";
const HEADING_PREFIX = "listing-tailoring-heading";
const DEFAULT_TOP_OFFSET = 88;

export function tailoringPanelDomIds(stateKey) {
  const encodedKey = encodeURIComponent(String(stateKey || "listing"));
  return {
    panelId: `${PANEL_PREFIX}-${encodedKey}`,
    headingId: `${HEADING_PREFIX}-${encodedKey}`,
  };
}

export function nextExpandedTailoringState(currentStateKey, requestedStateKey) {
  return currentStateKey === requestedStateKey ? null : requestedStateKey;
}

export function prefersReducedMotion(win = globalThis.window) {
  try {
    return Boolean(win?.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches);
  } catch {
    return false;
  }
}

export function isTailoringPanelVisible(panel, win = globalThis.window, topOffset = DEFAULT_TOP_OFFSET) {
  if (!panel?.getBoundingClientRect) return false;
  const rect = panel.getBoundingClientRect();
  const viewportHeight = Number(win?.innerHeight);
  if (!Number.isFinite(viewportHeight) || viewportHeight <= 0) return false;
  return rect.top >= topOffset && rect.bottom <= viewportHeight;
}

export function focusAndRevealTailoringPanel(panel, { win = globalThis.window } = {}) {
  if (!panel) return { focused: false, scrolled: false };

  let focused = false;
  if (typeof panel.focus === "function") {
    try {
      panel.focus({ preventScroll: true });
      focused = true;
    } catch {
      try {
        panel.focus();
        focused = true;
      } catch {
        // Focus is progressive enhancement; scrolling can still reveal the panel.
      }
    }
  }

  let scrolled = false;
  if (!isTailoringPanelVisible(panel, win) && typeof panel.scrollIntoView === "function") {
    try {
      panel.scrollIntoView({
        behavior: prefersReducedMotion(win) ? "auto" : "smooth",
        block: "nearest",
        inline: "nearest",
      });
      scrolled = true;
    } catch {
      try {
        panel.scrollIntoView();
        scrolled = true;
      } catch {
        // Old or constrained browsers may not support programmatic scrolling.
      }
    }
  }

  return { focused, scrolled };
}

export function scheduleTailoringPanelReveal(panel, {
  win = globalThis.window,
  onComplete,
} = {}) {
  const reveal = () => {
    const result = focusAndRevealTailoringPanel(panel, { win });
    onComplete?.(result);
  };
  if (typeof win?.requestAnimationFrame !== "function") {
    reveal();
    return () => {};
  }

  const frame = win.requestAnimationFrame(reveal);
  return () => {
    if (typeof win.cancelAnimationFrame === "function") win.cancelAnimationFrame(frame);
  };
}
