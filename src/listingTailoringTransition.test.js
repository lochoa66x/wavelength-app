import assert from "node:assert/strict";
import test from "node:test";

import {
  focusAndRevealTailoringPanel,
  isTailoringPanelVisible,
  nextExpandedTailoringState,
  scheduleTailoringPanelReveal,
  tailoringPanelDomIds,
} from "./listingTailoringTransition.js";

function fakePanel(rect = { top: 120, bottom: 520 }) {
  return {
    focusCalls: [],
    scrollCalls: [],
    focus(options) {
      this.focusCalls.push(options);
    },
    getBoundingClientRect() {
      return rect;
    },
    scrollIntoView(options) {
      this.scrollCalls.push(options);
    },
  };
}

test("tailoring panel ids are stable, unique, and safe for ARIA ID references", () => {
  const first = tailoringPanelDomIds("listing:one with spaces");
  const again = tailoringPanelDomIds("listing:one with spaces");
  const second = tailoringPanelDomIds("listing:two");

  assert.deepEqual(first, again);
  assert.notEqual(first.panelId, second.panelId);
  assert.doesNotMatch(first.panelId, /\s/);
  assert.doesNotMatch(first.headingId, /\s/);
});

test("requesting the open listing collapses it while requesting another listing switches exactly once", () => {
  assert.equal(nextExpandedTailoringState(null, "listing:a"), "listing:a");
  assert.equal(nextExpandedTailoringState("listing:a", "listing:a"), null);
  assert.equal(nextExpandedTailoringState("listing:a", "listing:b"), "listing:b");
});

test("a visible panel receives focus without an unnecessary scroll", () => {
  const panel = fakePanel();
  const win = { innerHeight: 800, matchMedia: () => ({ matches: false }) };

  assert.equal(isTailoringPanelVisible(panel, win), true);
  assert.deepEqual(focusAndRevealTailoringPanel(panel, { win }), { focused: true, scrolled: false });
  assert.deepEqual(panel.focusCalls, [{ preventScroll: true }]);
  assert.deepEqual(panel.scrollCalls, []);
});

test("an offscreen panel scrolls smoothly to the nearest visible position", () => {
  const panel = fakePanel({ top: 900, bottom: 1200 });
  const win = { innerHeight: 800, matchMedia: () => ({ matches: false }) };

  assert.deepEqual(focusAndRevealTailoringPanel(panel, { win }), { focused: true, scrolled: true });
  assert.deepEqual(panel.scrollCalls, [{ behavior: "smooth", block: "nearest", inline: "nearest" }]);
});

test("reduced-motion users get an immediate scroll", () => {
  const panel = fakePanel({ top: 900, bottom: 1200 });
  const win = { innerHeight: 800, matchMedia: () => ({ matches: true }) };

  focusAndRevealTailoringPanel(panel, { win });
  assert.equal(panel.scrollCalls[0].behavior, "auto");
});

test("the reveal scheduler works without requestAnimationFrame, focus, or scrolling APIs", () => {
  let completed = false;
  const cleanup = scheduleTailoringPanelReveal({}, {
    win: {},
    onComplete: (result) => {
      completed = true;
      assert.deepEqual(result, { focused: false, scrolled: false });
    },
  });

  assert.equal(completed, true);
  assert.doesNotThrow(cleanup);
});

test("the reveal scheduler uses and cleans up an animation frame when available", () => {
  const panel = fakePanel();
  let callback;
  let cancelledFrame;
  const win = {
    innerHeight: 800,
    matchMedia: () => ({ matches: false }),
    requestAnimationFrame(next) {
      callback = next;
      return 42;
    },
    cancelAnimationFrame(frame) {
      cancelledFrame = frame;
    },
  };

  const cleanup = scheduleTailoringPanelReveal(panel, { win });
  assert.equal(panel.focusCalls.length, 0);
  callback();
  assert.equal(panel.focusCalls.length, 1);
  cleanup();
  assert.equal(cancelledFrame, 42);
});
