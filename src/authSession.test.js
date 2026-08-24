import assert from "node:assert/strict";
import test from "node:test";

import {
  INVALID_ACCOUNT_SESSION_MESSAGE,
  loadVerifiedAuthSession,
} from "./authSession.js";

test("a signed-out browser is a normal public session when claims data is null", async () => {
  let sessionReads = 0;
  const result = await loadVerifiedAuthSession({
    getClaims: async () => ({ data: null, error: null }),
    getSession: async () => {
      sessionReads += 1;
      return { data: { session: null }, error: null };
    },
  });

  assert.deepEqual(result, { session: null, error: "" });
  assert.equal(sessionReads, 0);
});

test("a verified claim restores only its matching stored session", async () => {
  const session = { user: { id: "user-1" } };
  const result = await loadVerifiedAuthSession({
    getClaims: async () => ({ data: { claims: { sub: "user-1" } }, error: null }),
    getSession: async () => ({ data: { session }, error: null }),
  });

  assert.deepEqual(result, { session, error: "" });
});

test("a claim and stored-session mismatch falls back to public browsing", async () => {
  const result = await loadVerifiedAuthSession({
    getClaims: async () => ({ data: { claims: { sub: "user-1" } }, error: null }),
    getSession: async () => ({ data: { session: { user: { id: "user-2" } } }, error: null }),
  });

  assert.deepEqual(result, { session: null, error: INVALID_ACCOUNT_SESSION_MESSAGE });
});
