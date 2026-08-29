import test from "node:test";
import assert from "node:assert/strict";

import { createEvidenceCoachHandler } from "../api/evidence-coach.js";
import {
  normalizeEvidenceCoachInput,
  validateEvidenceCoachProposal,
} from "../api/_lib/evidenceCoach.js";

function baseInput(overrides = {}) {
  return normalizeEvidenceCoachInput({
    requirement: {
      id: "REQ-1",
      text: "Coordinate an ERP implementation and facilitate stakeholder workshops.",
      question: "Describe one relevant implementation example.",
      ...(overrides.requirement || {}),
    },
    candidate_input: {
      answer: "I facilitated requirements workshops for an SAP S/4HANA integration.",
      context: "The workshops aligned finance and technical teams.",
      employer_or_project: "Northstar rollout",
      approximate_date: "2023",
      contribution_level: "contributed",
      follow_up_answer: "",
      ...(overrides.candidate_input || {}),
    },
  });
}

function reviewable(overrides = {}) {
  return {
    proposed_wording: "Facilitated requirements workshops for an SAP S/4HANA integration, aligning finance and technical teams.",
    facts_used: [
      { source_field: "answer", source_excerpt: "facilitated requirements workshops for an SAP S/4HANA integration" },
      { source_field: "context", source_excerpt: "aligned finance and technical teams" },
    ],
    unresolved_details: [],
    follow_up_question: "",
    contribution_level: "contributed",
    confidence: "high",
    disposition: "reviewable",
    ...overrides,
  };
}

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(name, value) { this.headers[String(name).toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

test("a grounded evidence proposal is reviewable and receives a stable hash", () => {
  const result = validateEvidenceCoachProposal(reviewable(), baseInput());
  assert.deepEqual(result.issues, []);
  assert.equal(result.proposal.disposition, "reviewable");
  assert.match(result.proposal.evidence_hash, /^[a-f0-9]{64}$/);
  assert.equal(
    validateEvidenceCoachProposal(reviewable(), baseInput()).proposal.evidence_hash,
    result.proposal.evidence_hash,
  );
});

test("the validator blocks invented metrics, credentials, regulated actions, and elevated leadership", () => {
  const fixtures = [
    {
      name: "marketing metric",
      input: baseInput({ candidate_input: { answer: "I drafted email campaign copy.", context: "", contribution_level: "supported" } }),
      proposal: reviewable({ proposed_wording: "Drafted campaign copy that increased conversion by 30%.", facts_used: [{ source_field: "answer", source_excerpt: "drafted email campaign copy" }], contribution_level: "supported" }),
      issue: /Numeric claim/,
    },
    {
      name: "electrician licence",
      input: baseInput({ candidate_input: { answer: "I assisted with preventive electrical maintenance.", context: "", contribution_level: "supported" } }),
      proposal: reviewable({ proposed_wording: "Licensed electrician who performed preventive maintenance.", facts_used: [{ source_field: "answer", source_excerpt: "preventive electrical maintenance" }], contribution_level: "supported" }),
      issue: /credential or licence/,
    },
    {
      name: "clinical authority",
      input: baseInput({ candidate_input: { answer: "I scheduled patients and maintained records.", context: "", contribution_level: "supported" } }),
      proposal: reviewable({ proposed_wording: "Diagnosed patients and maintained clinical records.", facts_used: [{ source_field: "answer", source_excerpt: "maintained records" }], contribution_level: "supported" }),
      issue: /regulated clinical action/,
    },
    {
      name: "leadership",
      input: baseInput({ candidate_input: { answer: "I contributed to a warehouse inventory count.", context: "", contribution_level: "contributed" } }),
      proposal: reviewable({ proposed_wording: "Led the warehouse inventory count.", facts_used: [{ source_field: "answer", source_excerpt: "warehouse inventory count" }], contribution_level: "led" }),
      issue: /contribution level/,
    },
  ];

  for (const fixture of fixtures) {
    const result = validateEvidenceCoachProposal(fixture.proposal, fixture.input);
    assert.ok(result.issues.some((issue) => fixture.issue.test(issue)), `${fixture.name}: ${result.issues.join("; ")}`);
  }
});

test("missing facts produce one follow-up and no candidate-ready wording", () => {
  const result = validateEvidenceCoachProposal({
    proposed_wording: "",
    facts_used: [{ source_field: "answer", source_excerpt: "facilitated requirements workshops" }],
    unresolved_details: ["The candidate's personal responsibility is unclear."],
    follow_up_question: "What part of the workshop did you personally own or contribute?",
    contribution_level: "contributed",
    confidence: "low",
    disposition: "follow_up",
  }, baseInput());
  assert.deepEqual(result.issues, []);
  assert.equal(result.proposal.proposed_wording, "");
  assert.match(result.proposal.follow_up_question, /personally/);
});

test("facts used must be exact excerpts from the named candidate field", () => {
  const result = validateEvidenceCoachProposal(reviewable({
    facts_used: [{ source_field: "employer_or_project", source_excerpt: "Invented employer" }],
  }), baseInput());
  assert.match(result.issues.join(" "), /exact supplied excerpt/);
});

test("grounded proposals validate consistently across representative careers", () => {
  const fixtures = [
    ["software", "I tested the API integration.", "Tested the API integration."],
    ["administration", "I scheduled weekly team meetings.", "Scheduled weekly team meetings."],
    ["creative", "I created the event poster in Illustrator.", "Created the event poster in Illustrator."],
    ["education", "I prepared lesson plans for adult learners.", "Prepared lesson plans for adult learners."],
    ["logistics", "I coordinated inbound shipment appointments.", "Coordinated inbound shipment appointments."],
    ["hospitality", "I resolved guest requests at the front desk.", "Resolved guest requests at the front desk."],
    ["plumbing", "I assisted with copper pipe installation.", "Assisted with copper pipe installation."],
  ];
  for (const [name, answer, proposed] of fixtures) {
    const input = baseInput({ candidate_input: { answer, context: "", contribution_level: name === "logistics" ? "contributed" : "supported" } });
    const proposal = reviewable({
      proposed_wording: proposed,
      facts_used: [{ source_field: "answer", source_excerpt: answer.replace(/^I /, "").replace(/\.$/, "") }],
      contribution_level: name === "logistics" ? "contributed" : "supported",
    });
    const checked = validateEvidenceCoachProposal(proposal, input);
    assert.deepEqual(checked.issues, [], `${name}: ${checked.issues.join("; ")}`);
  }
});

test("private evidence coaching authenticates before reading or sending candidate input", async () => {
  let authenticated = false;
  let modelCalled = false;
  const handler = createEvidenceCoachHandler({
    authenticate: async () => { authenticated = true; return null; },
    callModel: async () => { modelCalled = true; return reviewable(); },
    getApiKey: () => "test-key",
  });
  const res = responseRecorder();
  await handler({ method: "POST", headers: {}, body: { full_resume: "PRIVATE" } }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(authenticated, false);
  assert.equal(modelCalled, false);
  assert.match(res.headers["cache-control"], /no-store/);
});

test("the endpoint sends only the normalized requirement and one candidate answer to the model", async () => {
  let modelInput = null;
  const handler = createEvidenceCoachHandler({
    authenticate: async () => ({ user: { id: "user-1" } }),
    callModel: async ({ input }) => { modelInput = input; return reviewable(); },
    getApiKey: () => "test-key",
  });
  const res = responseRecorder();
  await handler({
    method: "POST",
    headers: { authorization: "Bearer valid" },
    body: {
      ...baseInput(),
      full_resume: "SHOULD NEVER REACH THE MODEL",
      contact_email: "private@example.com",
    },
  }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(modelInput.full_resume, undefined);
  assert.equal(modelInput.contact_email, undefined);
  assert.deepEqual(Object.keys(modelInput).sort(), ["candidate_input", "requirement"]);
});

test("provider configuration and upstream failures use provider-neutral candidate copy", async () => {
  const missing = createEvidenceCoachHandler({
    authenticate: async () => ({ user: { id: "user-1" } }),
    getApiKey: () => "",
  });
  const missingRes = responseRecorder();
  await missing({ method: "POST", headers: { authorization: "Bearer valid" }, body: baseInput() }, missingRes);
  assert.equal(missingRes.statusCode, 503);
  assert.doesNotMatch(missingRes.body.error, /Anthropic|OpenAI|Claude/i);

  const upstream = createEvidenceCoachHandler({
    authenticate: async () => ({ user: { id: "user-1" } }),
    getApiKey: () => "test-key",
    callModel: async () => { const error = new Error("secret provider detail"); error.upstream = true; throw error; },
  });
  const upstreamRes = responseRecorder();
  await upstream({ method: "POST", headers: { authorization: "Bearer valid" }, body: baseInput() }, upstreamRes);
  assert.equal(upstreamRes.statusCode, 502);
  assert.doesNotMatch(upstreamRes.body.error, /Anthropic|OpenAI|Claude|secret/i);
});
