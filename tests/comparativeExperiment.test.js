import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { comparisonCases, comparisonQueue } from '../evaluations/comparative-v1/cases.js';
import { createComparisonHandler, EXPERIMENT_CLOSES, simplePrompt, traceFetch } from '../evaluations/comparative-v1/runner.js';
import { createConfirmationHandler } from '../evaluations/comparative-v1/confirmationRunner.js';
import { assessPostingCompleteness } from '../api/_lib/tailoringEvidence.js';
import { normalizeCustomJobBrief, jobBriefToText } from '../api/_lib/jobBrief.js';

const response = () => ({ code: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return body; } });
const request = overrides => ({ method: 'POST', headers: { authorization: 'Bearer test-session' }, body: { caseId: 'C01', arm: 'simple', kind: 'resume', capability: 'test-capability', ...overrides } });
const config = { authenticate: async () => ({ user: { id: 'test-user' } }), capabilityHash: createHash('sha256').update('test-capability').digest('hex'), now: () => EXPERIMENT_CLOSES - 10000, openAIKey: () => 'test-provider-secret' };

test('comparison freezes 48 unique cells and selection adds no candidate facts', () => {
  assert.equal(comparisonQueue.length, 48);
  assert.equal(new Set(comparisonQueue.map(c => JSON.stringify(c))).size, 48);
  for (const c of comparisonCases) for (const excerpt of c.selected) assert.ok(c.resume.includes(excerpt));
  assert.equal(simplePrompt(comparisonCases[0], 'simple', 'letter'), simplePrompt(comparisonCases[0], 'reasoning', 'letter'));
});
test('confirmation metadata makes the frozen complete postings assessable; runner rejects baseline arms', async () => {
  for (const c of comparisonCases) {
    const original = normalizeCustomJobBrief(c.job);
    assert.equal(assessPostingCompleteness(jobBriefToText(original), original).status, 'partial');
    const confirmed = normalizeCustomJobBrief({ ...c.job, source_review: { mode: 'paste', appears_complete: true, user_confirmed_complete: true } });
    assert.equal(assessPostingCompleteness(jobBriefToText(confirmed), confirmed).status, 'complete');
  }
  const res = response();
  await createConfirmationHandler(config)(request(), res);
  assert.equal(res.code, 400);
});
test('comparison authenticates and gates the capability before any provider call', async () => {
  let calls = 0;
  for (const options of [{ authenticate: async () => null }, { now: () => EXPERIMENT_CLOSES }, {}]) {
    const res = response();
    await createComparisonHandler({ ...config, ...options, fetchImpl: async () => { calls++; } })(request({ capability: 'wrong' }), res);
    assert.ok([401, 403].includes(res.code));
    assert.match(res.headers['Cache-Control'], /no-store/);
  }
  assert.equal(calls, 0);
});
test('comparison rejects arbitrary prompts, models and sources', async () => {
  const res = response();
  await createComparisonHandler(config)(request({ resume: 'private source', model: 'other' }), res);
  assert.equal(res.code, 400);
});
test('baseline attempts are single-call, with actual provider response and failure preserved', async () => {
  let count = 0;
  const res = response();
  await createComparisonHandler({ ...config, fetchImpl: async () => { count++; return new Response('{"error":"provider rejected"}', { status: 429 }); } })(request(), res);
  assert.equal(count, 1);
  assert.equal(res.code, 200);
  assert.equal(res.body.httpStatus, 429);
  assert.equal(res.body.error, 'upstream_http_error');
  assert.equal(res.body.calls.length, 1);
  assert.ok(!JSON.stringify(res.body).includes('test-provider-secret'));
  assert.ok(!JSON.stringify(res.body).includes('test-capability'));
});
test('reasoning changes only effort and selected arm changes only the prompt', async () => {
  const requests = [];
  for (const arm of ['simple', 'reasoning', 'selection']) {
    const res = response();
    await createComparisonHandler({ ...config, fetchImpl: async (_url, options) => {
      requests.push(JSON.parse(options.body));
      return Response.json({ status: 'completed', model: 'reported-model', output: [{ type: 'function_call', name: 'return_document', arguments: '{"paragraphs":["Example"]}' }] });
    } })(request({ arm, kind: 'letter' }), res);
    assert.equal(res.body.calls[0].response.model, 'reported-model');
  }
  assert.deepEqual({ ...requests[1], reasoning: requests[0].reasoning }, requests[0]);
  assert.deepEqual({ ...requests[2], input: requests[0].input }, requests[0]);
});
test('trace captures incomplete upstream attempt without leaking authorization headers', async () => {
  const calls = [];
  const fetch = traceFetch(async () => Response.json({ status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' } }), calls);
  await fetch('https://api.openai.com/v1/responses', { body: '{"model":"test"}', headers: { Authorization: 'Bearer sensitive' } });
  assert.equal(calls[0].response.status, 'incomplete');
  assert.ok(!JSON.stringify(calls).includes('sensitive'));
});
