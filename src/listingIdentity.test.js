import test from "node:test";
import assert from "node:assert/strict";

import { listingStateKey } from "./listingIdentity.js";

test("tailored results stay attached to listing ids after filtering or reordering", () => {
  const first = { id: 10, title: "First" };
  const second = { id: 20, title: "Second" };
  const tailored = {
    [listingStateKey(first)]: { profile: "For first" },
    [listingStateKey(second)]: { profile: "For second" },
  };

  const afterFiltering = [second];
  assert.equal(tailored[listingStateKey(afterFiltering[0])].profile, "For second");
});

test("a listing without a database id is rejected", () => {
  assert.throws(() => listingStateKey({ title: "No id" }), /database id/);
});
