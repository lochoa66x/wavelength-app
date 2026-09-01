import test from "node:test";
import assert from "node:assert/strict";

import { createCoverLetterHandler } from "../api/cover-letter.js";

function responseRecorder() {
  return { statusCode: 200, body: null, headers: {}, setHeader(name, value) { this.headers[name] = value; }, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
}

function toolResponse(input) {
  return { ok: true, json: async () => ({ content: [{ type: "tool_use", name: "return_evidence_first_cover_letter", input }] }) };
}

const customJob = {
  title: "Facilities Electrician",
  company: "Northline Manufacturing",
  description: "Maintain plant electrical systems and document preventive maintenance.",
  responsibilities: ["Install and maintain electrical panels", "Document work in the CMMS"],
  required_qualifications: ["Industrial electrical maintenance experience"],
};
const letter = {
  salutation: "Dear Hiring Team,",
  paragraphs: [
    { id: "opening", purpose: "opening", text: "I am applying with hands-on experience installing and maintaining electrical panels.", evidence_refs: ["Installed and maintained electrical panels."], requirement_refs: ["Install and maintain electrical panels"], explanation: "Connects direct experience to the role.", evidence_match: "direct" },
    { id: "evidence", purpose: "evidence", text: "I have also documented preventive maintenance work in a CMMS.", evidence_refs: ["Documented preventive maintenance work in a CMMS."], requirement_refs: ["Document work in the CMMS"], explanation: "Shows the requested documentation capability.", evidence_match: "direct" },
    { id: "closing", purpose: "closing", text: "Thank you for considering my application. I would welcome a conversation about the role.", evidence_refs: [], requirement_refs: [], explanation: "Closes without adding a claim.", evidence_match: "neutral" },
  ],
  signoff: "Sincerely,",
};

test("cover-letter generation rejects missing authentication before external work", async () => {
  let fetched = false;
  const handler = createCoverLetterHandler({ fetchImpl: async () => { fetched = true; }, getApiKey: () => "test" });
  const res = responseRecorder();
  await handler({ method: "POST", headers: {}, body: {} }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(fetched, false);
  assert.equal(res.headers["Cache-Control"], "no-store, max-age=0");
});

test("cover-letter generation uses reviewed sources and exact citations", async () => {
  let requestBody;
  const handler = createCoverLetterHandler({
    authenticate: async () => ({ user: { id: "user-1" }, supabase: {} }),
    fetchImpl: async (_url, options) => { requestBody = JSON.parse(options.body); return toolResponse(letter); },
    getApiKey: () => "test",
  });
  const res = responseRecorder();
  await handler({ method: "POST", headers: { authorization: "Bearer valid" }, body: {
    resume: "Jordan Lee\nInstalled and maintained electrical panels.\nDocumented preventive maintenance work in a CMMS.",
    customJob,
    voice: "warm",
    length: "short",
    candidateEvidence: [],
    assessment: { readiness: { status: "strong_fit" } },
  } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.letter.voice, "warm");
  assert.equal(res.body.letter.paragraphs.length, 3);
  assert.match(requestBody.system, /Never invent/i);
  assert.match(requestBody.messages[0].content, /Do not add a gap-confession/i);
  assert.doesNotMatch(JSON.stringify(res.body), /application-ready|private résumé/i);
});

test("unsupported flattery remains blocked after one bounded repair", async () => {
  let calls = 0;
  const bad = { ...letter, paragraphs: letter.paragraphs.map((entry, index) => index === 0 ? { ...entry, text: "I am thrilled to join your renowned, world-class company." } : entry) };
  const handler = createCoverLetterHandler({
    authenticate: async () => ({ user: { id: "user-1" }, supabase: {} }),
    fetchImpl: async () => { calls += 1; return toolResponse(bad); },
    getApiKey: () => "test",
  });
  const res = responseRecorder();
  await handler({ method: "POST", headers: { authorization: "Bearer valid" }, body: { resume: "Jordan Lee\nInstalled and maintained electrical panels.\nDocumented preventive maintenance work in a CMMS.", customJob, candidateEvidence: [] } }, res);
  assert.equal(calls, 2);
  assert.equal(res.statusCode, 422);
});

test("unsolicited career-transition and gap-confession language remains blocked after repair", async () => {
  let calls = 0;
  const bad = {
    ...letter,
    paragraphs: letter.paragraphs.map((entry, index) => index === 1 ? {
      ...entry,
      purpose: "boundary",
      text: "I am making a career transition and do not have direct industrial maintenance experience.",
      explanation: "Explains the career transition.",
    } : entry),
  };
  const handler = createCoverLetterHandler({
    authenticate: async () => ({ user: { id: "user-1" }, supabase: {} }),
    fetchImpl: async () => { calls += 1; return toolResponse(bad); },
    getApiKey: () => "test",
  });
  const res = responseRecorder();
  await handler({ method: "POST", headers: { authorization: "Bearer valid" }, body: {
    resume: "Jordan Lee\nInstalled and maintained electrical panels.\nDocumented preventive maintenance work in a CMMS.",
    customJob,
    candidateEvidence: [],
  } }, res);
  assert.equal(calls, 2);
  assert.equal(res.statusCode, 422);
});

test("paragraph regeneration must return exactly the requested paragraph", async () => {
  const regenerated = { ...letter, paragraphs: [{ ...letter.paragraphs[1], id: "evidence" }] };
  const handler = createCoverLetterHandler({ authenticate: async () => ({ user: { id: "user-1" }, supabase: {} }), fetchImpl: async () => toolResponse(regenerated), getApiKey: () => "test" });
  const res = responseRecorder();
  await handler({ method: "POST", headers: { authorization: "Bearer valid" }, body: { resume: "Jordan Lee\nInstalled and maintained electrical panels.\nDocumented preventive maintenance work in a CMMS.", customJob, candidateEvidence: [], regenerateParagraph: "evidence", existingDraft: letter } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.letter.paragraphs.length, 1);
});
