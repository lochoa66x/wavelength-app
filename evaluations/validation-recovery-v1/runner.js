import { createHash, timingSafeEqual } from 'node:crypto';
import { recoveryCases as comparisonCases } from './cases.js';
import { createTailorHandler } from '../../api/tailor.js';
import { createCoverLetterHandler } from '../../api/cover-letter.js';
import { authenticateSupabaseRequest, bearerToken } from '../../api/_lib/requestAuth.js';
import { applyPrivateResponseHeaders } from '../../api/_lib/privateResponse.js';

export const EXPERIMENT_CLOSES = Date.parse('2026-09-15T06:00:00Z');
export const CAPABILITY_HASH = 'f7ae0c9868e372c539d88de79a884e3cf02ba3d9db27a02bec6e70cd00e1dfcd';

const hash = value => createHash('sha256').update(value).digest('hex');
export function traceFetch(fetchImpl, calls) {
  return async (url, options = {}) => {
    const start = Date.now();
    // Only model body is recorded. Never record authentication headers or keys.
    const entry = { sequence: calls.length + 1, startedAt: new Date(start).toISOString(), request: JSON.parse(options.body || '{}') };
    calls.push(entry);
    try {
      const response = await fetchImpl(url, options);
      entry.status = response.status;
      if (response.ok) entry.response = await response.clone().json();
      else entry.error = { status: response.status, category: 'upstream_http_error' };
      entry.durationMs = Date.now() - start;
      return response;
    } catch (error) {
      entry.durationMs = Date.now() - start;
      entry.error = { category: error?.name === 'AbortError' || error?.name === 'TimeoutError' ? 'timeout' : 'transport_error' };
      throw error;
    }
  };
}
export function createRecoveryHandler({ authenticate = authenticateSupabaseRequest, fetchImpl = globalThis.fetch,
  now = Date.now, capabilityHash = CAPABILITY_HASH, openAIKey = () => process.env.OPENAI_API_KEY } = {}) {
  return async (req, res) => {
    applyPrivateResponseHeaders(res);
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    const token = bearerToken(req);
    const auth = token ? await authenticate(token).catch(() => null) : null;
    if (!auth?.user) return res.status(401).json({ error: 'Authentication required' });
    const key = typeof req.body?.capability === 'string' && req.body.capability.length <= 128 ? req.body.capability : '';
    if (now() >= EXPERIMENT_CLOSES || !key || !timingSafeEqual(Buffer.from(hash(key)), Buffer.from(capabilityHash))) {
      return res.status(403).json({ error: 'Comparison runner closed or access unavailable' });
    }
    const { caseId, arm, kind } = req.body || {};
    const fixture = comparisonCases.find(c => c.id === caseId && ['R06','R08'].includes(caseId));
    if (!fixture || arm !== 'pipeline' || !['resume', 'letter'].includes(kind)
      || Object.keys(req.body).some(key => !['caseId', 'arm', 'kind', 'capability'].includes(key))) {
      return res.status(400).json({ error: 'Only frozen comparison cells are accepted' });
    }
    const calls = [];
    const traced = traceFetch(fetchImpl, calls);
    const start = now();
    const result = { version: 1, experiment: 'validation-recovery-v1', caseId, arm: 'recovery_pipeline', kind, attempt: 2, round: 'targeted_fix_retest',
      startedAt: new Date(start).toISOString(), sourceHash: hash(JSON.stringify(fixture)),
      deploymentRevision: process.env.VERCEL_GIT_COMMIT_SHA || null, calls };
    try {
      if (arm === 'pipeline') {
        const handler = (kind === 'resume' ? createTailorHandler : createCoverLetterHandler)({ authenticate: async () => auth, fetchImpl: traced });
        const captureResponse = { setHeader() {}, status(code) { result.httpStatus = code; return this; }, json(payload) { result.delivered = payload; return payload; } };
        await handler({ method: 'POST', headers: req.headers, body: { resume: fixture.resume, customJob: fixture.job, captureEvaluation: true, voice: 'direct', length: 'standard' } }, captureResponse);
      }
    } catch (error) {
      result.error = ['provider_unavailable', 'incomplete_document'].includes(error.message) ? error.message : error.name === 'TimeoutError' ? 'timeout' : 'generation_error';
    }
    result.completedAt = new Date(now()).toISOString();
    result.durationMs = now() - start;
    return res.status(200).json(result); // Transport success preserves failed experimental outcomes too.
  };
}
