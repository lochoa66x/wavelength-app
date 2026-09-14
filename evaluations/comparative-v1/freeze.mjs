import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { comparisonCases, comparisonQueue } from './cases.js';
import { simplePrompt, schemas } from './runner.js';
const sha = value => createHash('sha256').update(value).digest('hex');
const files = ['evaluations/comparative-v1/cases.js', 'evaluations/comparative-v1/runner.js', 'evaluations/comparative-v1/PROTOCOL.md', 'evaluations/QUALITY_RUBRIC.md', 'api/tailor.js', 'api/cover-letter.js'];
const manifest = { experiment: 'comparative-v1', frozenAt: new Date().toISOString(), baselineRevision: '764b5aa98b55408cf2cfa62047f424cc06cdf777',
  files: Object.fromEntries(files.map(p => [p, sha(fs.readFileSync(p))])),
  cases: comparisonCases.map(c => ({ caseId: c.id, sourceHash: sha(JSON.stringify(c)) })),
  queue: comparisonQueue.map(c => ({ ...c, promptHash: c.arm === 'pipeline' ? null : sha(simplePrompt(comparisonCases.find(f => f.id === c.caseId), c.arm, c.kind)), schemaHash: c.arm === 'pipeline' ? null : sha(JSON.stringify(schemas[c.kind])) })),
  humanReviewStatus: 'pending', competitorStatus: { Teal: 'sign-in required', Rezi: 'sign-in required' } };
fs.writeFileSync(new URL('./manifest.json', import.meta.url), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
console.log('Frozen 48 cells before provider execution.');
