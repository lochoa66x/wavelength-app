import test from "node:test";
import assert from "node:assert/strict";

import { createTailorHandler } from "../api/tailor.js";

function analysisInput(overrides = {}) {
  return {
    posting_assessment: { status: "complete", reason: "Complete posting." },
    fit_assessment: { path: "direct", recommended_level: "Role-aligned", note: "Supported positioning." },
    content_strategy: "direct",
    readiness: { status: "strong_fit", reason: "Required capabilities are supported." },
    requirements: [],
    verified_transferable_skills: [],
    target_keywords: [],
    missing_evidence: [],
    prohibited_claims: [],
    candidate_questions: [],
    ...overrides,
  };
}

function toolResponse(name, input) {
  return {
    ok: true,
    json: async () => ({ content: [{ type: "tool_use", name, input }] }),
  };
}

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
      const body = JSON.parse(options.body);
      if (body.tool_choice.name === "return_tailoring_analysis") {
        return toolResponse("return_tailoring_analysis", analysisInput({
          fit_assessment: { path: "career_change", recommended_level: "Helper", note: "Entry-level positioning." },
          content_strategy: "trades",
          readiness: { status: "significant_gap", reason: "Direct trade evidence is missing." },
          requirements: [{ id: "R1", requirement: "Supervised plumbing work", priority: "responsibility", evidence_match: "missing", resume_evidence: "", safe_language: "", keywords: ["plumbing"] }],
          verified_transferable_skills: [{ skill: "Team leadership", resume_evidence: "Led cross-functional teams." }],
          target_keywords: ["plumbing"],
        }));
      }
      return toolResponse("return_trades_resume", {
        profile: "Entry-level candidate with transferable leadership experience.",
        experience: [{ role: "SAP Manager", bullets: ["Led cross-functional teams."] }],
        skills: ["Team leadership"],
        certifications: [],
        safety_certifications: [],
        fit_assessment: { path: "career_change", recommended_level: "Helper", note: "Entry-level positioning." },
      });
    },
    getApiKey: () => "test-key",
  });
  const res = responseRecorder();

  await handler({
    method: "POST",
    headers: { authorization: "Bearer valid-token" },
    body: {
      resume: "SAP Manager resume\nLed cross-functional teams.",
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
      if (anthropicRequest.tool_choice.name === "return_tailoring_analysis") {
        return toolResponse("return_tailoring_analysis", analysisInput({
          requirements: [{ id: "R1", requirement: "Stakeholder management", priority: "required", evidence_match: "direct", resume_evidence: "Led stakeholder programs.", safe_language: "Stakeholder management", keywords: ["stakeholder management"] }],
          verified_transferable_skills: [{ skill: "Stakeholder management", resume_evidence: "Led stakeholder programs." }],
          target_keywords: ["stakeholder management"],
        }));
      }
      return toolResponse("return_tailored_resume", {
        profile: "Operations manager with stakeholder management experience.",
        experience: [{ role: "Operations Manager", company: "Real Corp", dates: "2020–2023", bullets: ["Led stakeholder programs."] }],
        skills: ["Stakeholder management"],
        fit_assessment: { path: "direct", recommended_level: "Manager", note: "Direct experience." },
      });
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
  assert.notEqual(res.body.ats_review.status, "blocked");
  assert.equal(res.body.ats_review.coverage.direct, 1);
  assert.equal(res.body.ats_review.coverage.missing, 0);
  assert.ok(res.body.ats_review.coverage.matched_keywords.includes("stakeholder management"));
  assert.deepEqual(res.body.ats_review.coverage.missing_keywords, []);
  assert.match(anthropicRequest.messages[0].content, /Candidate-provided posting reviewed before tailoring|Lead operational programs/);
});

test("tailoring automatically repairs one unsafe model draft before returning it", async () => {
  const requests = [];
  const drafts = [
    {
      profile: "Operations leader moving into web development.",
      experience: [{
        role: "Web Developer",
        company: "Real Corp",
        dates: "2020–2023",
        bullets: ["Led 99 integration programs."],
      }],
      skills: ["Systems integration"],
      fit_assessment: { path: "career_change", recommended_level: "Entry-level", note: "Transferable positioning." },
    },
    {
      profile: "Operations leader moving into web development.",
      experience: [{
        role: "Operations Manager",
        company: "Real Corp",
        dates: "2020–2023",
        bullets: ["Led integration programs."],
      }],
      skills: ["Systems integration"],
      fit_assessment: { path: "career_change", recommended_level: "Entry-level", note: "Transferable positioning." },
    },
  ];
  const handler = createTailorHandler({
    authenticate: async () => ({ user: { id: "user-1" }, supabase: {} }),
    loadListing: async () => ({
      id: 7,
      title: "Web Developer",
      company: "Target Co",
      type: "Full-time",
      category: "technology",
      description: "Build and maintain web applications.",
      reason: "Technology role",
    }),
    fetchImpl: async (_url, options) => {
      const body = JSON.parse(options.body);
      requests.push(body);
      if (body.tool_choice.name === "return_tailoring_analysis") {
        return toolResponse("return_tailoring_analysis", analysisInput({
          fit_assessment: { path: "career_change", recommended_level: "Entry-level", note: "Transferable positioning." },
          content_strategy: "career_change",
          readiness: { status: "significant_gap", reason: "Direct web development evidence is missing." },
          requirements: [{ id: "R1", requirement: "Build web applications", priority: "responsibility", evidence_match: "missing", resume_evidence: "", safe_language: "", keywords: ["web applications"] }],
          verified_transferable_skills: [{ skill: "Systems integration", resume_evidence: "Led integration programs." }],
          target_keywords: ["web applications"],
        }));
      }
      const input = drafts[body.messages[0].content.includes("EVIDENCE REPAIR PASS") ? 1 : 0];
      return toolResponse("return_tailored_resume", input);
    },
    getApiKey: () => "test-key",
  });
  const res = responseRecorder();

  await handler({
    method: "POST",
    headers: { authorization: "Bearer valid" },
    body: {
      resume: "Operations Manager — Real Corp — 2020–2023\nLed integration programs.",
      listingId: 7,
    },
  }, res);

  assert.equal(requests.length, 3);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.repair_applied, true);
  assert.equal(res.body.resume.experience[0].role, "Operations Manager");
  assert.match(requests[2].messages[0].content, /EVIDENCE REPAIR PASS/);
  assert.match(requests[2].messages[0].content, /unsupported_numbers.*99/);
  assert.match(requests[2].messages[0].content, /unsupported_history.*role/);
});
