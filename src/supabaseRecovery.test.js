import test from "node:test";
import assert from "node:assert/strict";

import { isFutureJwtError, runWithFutureJwtRecovery } from "./supabaseRecovery.js";

test("recognizes the PostgREST future-JWT clock-skew error", () => {
  assert.equal(isFutureJwtError({ message: "JWT issued at future" }), true);
  assert.equal(isFutureJwtError({ message: "permission denied" }), false);
});

test("a future JWT gets one delayed retry before refreshing the session", async () => {
  const events = [];
  const results = [
    { error: { message: "JWT issued at future" } },
    { data: { id: "user-1" }, error: null },
  ];

  const result = await runWithFutureJwtRecovery(
    async () => {
      events.push("operation");
      return results.shift();
    },
    {
      refreshSession: async () => {
        events.push("refresh");
        return { error: null };
      },
      wait: async () => events.push("wait"),
    },
  );

  assert.equal(result.data.id, "user-1");
  assert.deepEqual(events, ["operation", "wait", "operation"]);
});

test("persistent clock skew gets one refresh and one final retry", async () => {
  const events = [];
  const result = await runWithFutureJwtRecovery(
    async () => {
      events.push("operation");
      return events.filter((event) => event === "operation").length < 3
        ? { error: { message: "JWT issued at future" } }
        : { data: { id: "user-1" }, error: null };
    },
    {
      refreshSession: async () => {
        events.push("refresh");
        return { error: null };
      },
      wait: async () => events.push("wait"),
    },
  );

  assert.equal(result.data.id, "user-1");
  assert.deepEqual(events, ["operation", "wait", "operation", "refresh", "wait", "operation"]);
});
