import test from "node:test";
import assert from "node:assert/strict";

import { createTailorHandler } from "../api/tailor.js";

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

test("tailoring rejects a missing authorization header before external work", async () => {
  let authenticated = false;
  let fetched = false;
  const handler = createTailorHandler({
    authenticate: async () => {
      authenticated = true;
      return null;
    },
    fetchImpl: async () => {
      fetched = true;
      throw new Error("should not fetch");
    },
    getApiKey: () => "test-key",
  });
  const res = responseRecorder();

  await handler({ method: "POST", headers: {}, body: { resume: "Resume", listingId: 1 } }, res);

  assert.equal(res.statusCode, 401);
  assert.equal(authenticated, false);
  assert.equal(fetched, false);
});

test("tailoring rejects an invalid token before calling Anthropic", async () => {
  let fetched = false;
  const handler = createTailorHandler({
    authenticate: async () => null,
    fetchImpl: async () => {
      fetched = true;
      throw new Error("should not fetch");
    },
    getApiKey: () => "test-key",
  });
  const res = responseRecorder();

  await handler({
    method: "POST",
    headers: { authorization: "Bearer invalid-token" },
    body: { resume: "Resume", listingId: 1 },
  }, res);

  assert.equal(res.statusCode, 401);
  assert.equal(fetched, false);
});

test("tailoring loads the trusted listing by id and ignores a caller URL", async () => {
  let loadedId = null;
  let anthropicRequest = null;
  const handler = createTailorHandler({
    authenticate: async () => ({ user: { id: "user-1" }, supabase: {} }),
    loadListing: async (_supabase, listingId) => {
      loadedId = listingId;
      return {
        id: listingId,
        title: "Junior Plumber Helper",
        company: "Trusted Company",
        type: "full-time",
        category: "trades",
        description: "Trusted stored description with supervised entry-level plumbing work.",
        reason: "Stored reason",
      };
    },
    fetchImpl: async (url, options) => {
      anthropicRequest = { url, options };
      return {
        ok: true,
        json: async () => ({
          content: [{
            type: "tool_use",
            name: "return_trades_resume",
            input: {
              profile: "Entry-level candidate with transferable leadership experience.",
              experience: [{ role: "SAP Manager", bullets: ["Led teams."] }],
              skills: ["Team leadership"],
              certifications: [],
              safety_certifications: [],
              fit_assessment: { path: "career_change", recommended_level: "Helper", note: "Entry-level positioning." },
            },
          }],
        }),
      };
    },
    getApiKey: () => "test-key",
  });
  const res = responseRecorder();

  await handler({
    method: "POST",
    headers: { authorization: "Bearer valid-token" },
    body: {
      resume: "SAP Manager resume",
      listingId: 42,
      item: { url: "http://127.0.0.1/private", description: "Untrusted description" },
    },
  }, res);

  const anthropicBody = JSON.parse(anthropicRequest.options.body);
  const prompt = anthropicBody.messages[0].content;
  assert.equal(loadedId, 42);
  assert.equal(anthropicRequest.url, "https://api.anthropic.com/v1/messages");
  assert.match(prompt, /Trusted stored description/);
  assert.doesNotMatch(prompt, /127\.0\.0\.1|Untrusted description/);
  assert.equal(res.statusCode, 200);
});
