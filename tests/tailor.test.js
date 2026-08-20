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

test("tailoring accepts a reviewed custom job without loading a database listing", async () => {
  let loadCalled = false;
  let anthropicRequest;
  const handler = createTailorHandler({
    authenticate: async () => ({ user: { id: "user-1" }, supabase: {} }),
    loadListing: async () => { loadCalled = true; return null; },
    fetchImpl: async (_url, options) => {
      anthropicRequest = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          content: [{
            type: "tool_use",
            name: "return_tailored_resume",
            input: {
              profile: "Operations manager with stakeholder management experience.",
              experience: [{ role: "Operations Manager", company: "Real Corp", dates: "2020–2023", bullets: ["Led stakeholder programs."] }],
              skills: ["Stakeholder management"],
              fit_assessment: { path: "direct", recommended_level: "Manager", note: "Direct experience." },
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
    headers: { authorization: "Bearer valid" },
    body: {
      resume: "Operations Manager — Real Corp — 2020–2023\nLed stakeholder programs.",
      customJob: {
        title: "Operations Manager",
        company: "Target Co",
        location: "Toronto",
        type: "Full-time",
        category: "business",
        description: "Lead operational programs and stakeholder management across the organization.",
        responsibilities: ["Lead operational programs"],
        required_qualifications: [],
        preferred_qualifications: [],
        keywords: ["stakeholder management"],
      },
    },
  }, res);

  assert.equal(loadCalled, false);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ats_review.status, "ready");
  assert.match(anthropicRequest.messages[0].content, /Candidate-provided posting reviewed before tailoring|Lead operational programs/);
});
