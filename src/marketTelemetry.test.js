import test from "node:test";
import assert from "node:assert/strict";

import { marketSearchEvent } from "./marketTelemetry.js";

test("market search analytics expose only an allow-listed market and outcome", () => {
  const calls = [];
  const track = (...args) => calls.push(args);

  assert.equal(marketSearchEvent("US", "results", track), true);
  assert.equal(marketSearchEvent("Canada", "empty", track), true);
  assert.equal(marketSearchEvent("GB", "results", track), false);
  assert.equal(marketSearchEvent("US", "clicked-SAP-in-New-York", track), false);
  assert.deepEqual(calls, [
    ["market_search", { market: "us", outcome: "results" }],
    ["market_search", { market: "ca", outcome: "empty" }],
  ]);
});
