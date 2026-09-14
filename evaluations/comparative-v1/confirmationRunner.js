import { createHash, timingSafeEqual } from 'node:crypto';
import { comparisonCases as unconfirmedCases, comparisonArms } from './cases.js';
import { createTailorHandler } from '../../api/tailor.js';
import { createCoverLetterHandler } from '../../api/cover-letter.js';
import { authenticateSupabaseRequest, bearerToken } from '../../api/_lib/requestAuth.js';
import { applyPrivateResponseHeaders } from '../../api/_lib/privateResponse.js';

export const EXPERIMENT_CLOSES = Date.parse('2026-09-15T06:00:00Z');
export const CAPABILITY_HASH = 'f7ae0c9868e372c539d88de79a884e3cf02ba3d9db27a02bec6e70cd00e1dfcd';
const comparisonCases = unconfirmedCases.map(c => ({...c, job:{...c.job,source_review:{mode:'paste',appears_complete:true,user_confirmed_complete:true,conflicts:[],conflicts_resolved:true}}}));
const hash = value => createHash('sha256').update(value).digest('hex');
const object = properties => ({ type: 'object', additionalProperties: false, properties, required: Object.keys(properties) });
const string = { type: 'string' };
const strings = { type: 'array', items: string };
export const schemas = {
  resume: object({ name: string, headline: string, profile: string, skills: strings,
    experience: { type: 'array', items: object({ role: string, organization: string, dates: string, bullets: strings }) },
    projects: { type: 'array', items: object({ name: string, context: string, bullets: strings }) },
    education: strings, training: strings, links: strings }),
  letter: object({ salutation: string, paragraphs: strings, signoff: string }),
};
export function simplePrompt(fixture, arm, kind) {
  return `Write an employer-facing ${kind === 'resume' ? 'résumé' : 'cover letter'} tailored to this job. Use only candidate facts from the source. Preserve contribution level, shared results, dates, credential status and academic/project context. Do not turn job requirements into candidate history. Choose the strongest relevant evidence, retain useful concrete detail, and write clear natural professional English. ${kind === 'resume' ? 'Use a short professional profile that synthesizes the candidate’s focus rather than repeating the experience bullets. Keep relevant projects and qualifications.' : 'Make a focused case through one or two relevant examples rather than reciting the résumé. Avoid generic praise and invented motivation. Use 2–4 paragraphs, at most 320 words, a salutation and signoff.'}\n\nJOB\n${JSON.stringify(fixture.job)}\n\nCANDIDATE SOURCE\n${fixture.resume}${arm === 'selection' ? `\n\nEDITOR-SELECTED SOURCE EXCERPTS TO PRIORITIZE (the full source still applies)\n${fixture.selected.join('\n')}` : ''}`;
}
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
export function createConfirmationHandler({ authenticate = authenticateSupabaseRequest, fetchImpl = globalThis.fetch,
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
    const fixture = comparisonCases.find(c => c.id === caseId);
    if (!fixture || arm !== 'pipeline' || !['resume', 'letter'].includes(kind)
      || Object.keys(req.body).some(key => !['caseId', 'arm', 'kind', 'capability'].includes(key))) {
      return res.status(400).json({ error: 'Only frozen comparison cells are accepted' });
    }
    const calls = [];
    const traced = traceFetch(fetchImpl, calls);
    const start = now();
    const result = { version: 1, experiment: 'comparative-v1', caseId, arm: 'confirmed_pipeline', kind, attempt: 1,
      startedAt: new Date(start).toISOString(), sourceHash: hash(JSON.stringify(fixture)),
      deploymentRevision: process.env.VERCEL_GIT_COMMIT_SHA || null, calls };
    try {
      if (arm === 'pipeline') {
        const handler = (kind === 'resume' ? createTailorHandler : createCoverLetterHandler)({ authenticate: async () => auth, fetchImpl: traced });
        const captureResponse = { setHeader() {}, status(code) { result.httpStatus = code; return this; }, json(payload) { result.delivered = payload; return payload; } };
        await handler({ method: 'POST', headers: req.headers, body: { resume: fixture.resume, customJob: fixture.job, captureEvaluation: true, voice: 'direct', length: 'standard' } }, captureResponse);
      } else {
        const model = (kind === 'resume' ? process.env.OPENAI_TAILOR_MODEL : process.env.OPENAI_COVER_LETTER_MODEL) || process.env.OPENAI_MODEL || 'gpt-5.6-terra';
        if (!openAIKey()) throw new Error('provider_unavailable');
        const payload = { model, instructions: 'You write accurate, useful application documents from supplied source material.',
          input: simplePrompt(fixture, arm, kind), reasoning: { effort: arm === 'reasoning' ? 'high' : 'low' },
          max_output_tokens: 6000, store: false, parallel_tool_calls: false,
          tools: [{ type: 'function', name: 'return_document', description: 'Return the application document.', parameters: schemas[kind], strict: true }],
          tool_choice: { type: 'function', name: 'return_document' } };
        const response = await traced('https://api.openai.com/v1/responses', { method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${openAIKey()}` },
          body: JSON.stringify(payload), signal: AbortSignal.timeout(110000) });
        result.httpStatus = response.status;
        if (response.ok) {
          const raw = await response.json();
          const call = raw.output?.find(item => item.type === 'function_call' && item.name === 'return_document');
          if (raw.status !== 'completed' || !call?.arguments) throw new Error('incomplete_document');
          result.delivered = JSON.parse(call.arguments);
        } else result.error = 'upstream_http_error';
      }
    } catch (error) {
      result.error = ['provider_unavailable', 'incomplete_document'].includes(error.message) ? error.message : error.name === 'TimeoutError' ? 'timeout' : 'generation_error';
    }
    result.completedAt = new Date(now()).toISOString();
    result.durationMs = now() - start;
    return res.status(200).json(result); // Transport success preserves failed experimental outcomes too.
  };
}
