import test from "node:test";
import assert from "node:assert/strict";

import { captureAccountActionOpener, restoreAccountActionFocus } from "./authFocus.js";

function focusable({ connected = true } = {}) {
  return {
    isConnected: connected,
    options: null,
    focus(options) { this.options = options || {}; },
    getAttribute() { return null; },
  };
}

test("captures the opener before dialog autofocus can replace it", () => {
  const button = focusable();
  assert.equal(captureAccountActionOpener({ activeElement: button, body: {} }), button);
});
test("restores the connected opener without scrolling", () => {
  const button = focusable();
  assert.equal(restoreAccountActionFocus(button, { querySelectorAll: () => [] }), "opener");
  assert.deepEqual(button.options, { preventScroll: true });
});
test("uses an explicit safe fallback when the original listing control disappeared", () => {
  const removed = focusable({ connected: false });
  const fallback = focusable();
  assert.equal(restoreAccountActionFocus(removed, { querySelectorAll: () => [fallback] }), "fallback");
  assert.deepEqual(fallback.options, { preventScroll: true });
});
