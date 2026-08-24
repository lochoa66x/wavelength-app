import test from "node:test";
import assert from "node:assert/strict";

import { createJobIntakeHandler } from "../api/job-intake.js";
import { createListingEnrichmentHandler } from "../api/listing-enrichment.js";

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("posting intake rejects a missing token before processing private input", async () => {
  let authenticated = false;
  const handler = createJobIntakeHandler({ authenticate: async () => { authenticated = true; return null; } });
  const res = responseRecorder();
  await handler({ method: "POST", headers: {}, body: { mode: "paste", text: "private" } }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(authenticated, false);
});

test("posting intake rejects an invalid token before processing private input", async () => {
  const handler = createJobIntakeHandler({ authenticate: async () => null });
  const res = responseRecorder();
  await handler({ method: "POST", headers: { authorization: "Bearer invalid" }, body: { mode: "paste", text: "private" } }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, "Invalid or expired session");
});

test("listing enrichment rejects a missing token before privileged database access", async () => {
  let adminCreated = false;
  const handler = createListingEnrichmentHandler({
    createAdmin: () => { adminCreated = true; throw new Error("should not run"); },
  });
  const res = responseRecorder();
  await handler({ method: "POST", headers: {}, body: { listingId: "listing-1" } }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(adminCreated, false);
});

test("listing enrichment rejects an invalid token before privileged database access", async () => {
  let adminCreated = false;
  const handler = createListingEnrichmentHandler({
    authenticate: async () => null,
    createAdmin: () => { adminCreated = true; throw new Error("should not run"); },
  });
  const res = responseRecorder();
  await handler({ method: "POST", headers: { authorization: "Bearer invalid" }, body: { listingId: "listing-1" } }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(adminCreated, false);
});
