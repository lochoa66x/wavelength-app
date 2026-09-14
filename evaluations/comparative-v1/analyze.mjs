import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { comparisonCases, comparisonQueue } from './cases.js';

export const root = path.dirname(new URL(import.meta.url).pathname).replace(/^\/([A-Za-z]:)/, '$1');
export function deliveredDocument(result) {
  if (result.error || result.httpStatus >= 400) return null;
  return result.arm.endsWith('pipeline') ? result.delivered?.[result.kind === 'resume' ? 'resume' : 'letter'] : result.delivered;
}
const value = v => typeof v === 'string' ? v : Array.isArray(v) ? v.map(value).filter(Boolean).join(' | ') : v && typeof v === 'object' ? Object.entries(v).filter(([k]) => !/^(?:id|source|evidence|requirement|verified|status)/i.test(k)).map(([, x]) => value(x)).filter(Boolean).join(' | ') : '';
export function documentText(document, kind) {
  if (!document) return 'OUTPUT UNAVAILABLE';
  if (kind === 'letter') return [document.salutation, ...(document.paragraphs || []).map(p => typeof p === 'string' ? p : p.text), document.signoff].filter(Boolean).join('\n\n');
  return [document.name, document.title || document.headline, document.contact, document.profile,
    document.experience?.length ? 'EXPERIENCE' : '',
    ...(document.experience || []).flatMap(e => [[e.role, e.company || e.organization, e.location, e.dates].filter(Boolean).join(' | '), ...(e.bullets || []).map(b => `• ${value(b)}`)]),
    document.projects?.length ? 'PROJECTS' : '',
    ...(document.projects || []).flatMap(p => [[p.name || p.title, p.context, p.description].filter(Boolean).join(' | '), ...(p.bullets || []).map(b => `• ${value(b)}`)]),
    ...(document.additionalSections || []).flatMap(s => [s.heading || s.title || s.name, value(s.items || s.entries || s.content)]),
    ...['skills', 'education', 'certifications', 'training', 'safety', 'safety_certifications', 'languages', 'links', 'professionalLinks'].flatMap(k => document[k]?.length ? [k.toUpperCase(), value(document[k])] : []),
  ].filter(Boolean).join('\n');
}
export function loadResults() {
  const dir = path.join(root, 'raw');
  const queue = [...comparisonQueue, ...comparisonCases.flatMap(c => ['resume', 'letter'].map(kind => ({ caseId: c.id, arm: 'confirmed_pipeline', kind })))];
  return fs.existsSync(dir) ? queue.map(c => path.join(dir, `${c.caseId}-${c.arm}-${c.kind}-attempt-1.json`)).filter(p => fs.existsSync(p)).map(p => JSON.parse(fs.readFileSync(p))) : [];
}
const median = xs => { const s = xs.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? (s[Math.floor((s.length - 1) / 2)] + s[Math.floor(s.length / 2)]) / 2 : null; };
function main() {
  const results = loadResults();
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json')));
  const confirmation = JSON.parse(fs.readFileSync(path.join(root, 'confirmation-manifest.json')));
  for (const r of results) {
    const expected = (r.arm === 'confirmed_pipeline' ? confirmation : manifest).cases.find(c => c.caseId === r.caseId)?.sourceHash;
    if (r.sourceHash && r.sourceHash !== expected) throw new Error('Source changed: ' + r.caseId);
  }
  const metrics = results.map(r => ({ caseId: r.caseId, arm: r.arm, kind: r.kind, available: Boolean(deliveredDocument(r)),
    httpStatus: r.httpStatus, error: r.error || null, durationMs: r.durationMs,
    models: [...new Set((r.calls || []).map(c => c.response?.model || c.request?.model))],
    calls: r.calls?.length || 0,
    inputTokens: (r.calls || []).reduce((sum, c) => sum + (c.response?.usage?.input_tokens || 0), 0),
    outputTokens: (r.calls || []).reduce((sum, c) => sum + (c.response?.usage?.output_tokens || 0), 0),
    reasoningTokens: (r.calls || []).reduce((sum, c) => sum + (c.response?.usage?.output_tokens_details?.reasoning_tokens || 0), 0),
    repairApplied: r.delivered?.repair_applied ?? r.delivered?.validation?.repairApplied ?? null,
    words: documentText(deliveredDocument(r), r.kind).split(/\s+/).length,
    rawSha256: crypto.createHash('sha256').update(JSON.stringify(r)).digest('hex') }));
  fs.writeFileSync(path.join(root, 'metrics.json'), JSON.stringify({ captured: results.length, originalPlanned: 48, confirmationPlanned: 12, metrics }, null, 2));
  fs.mkdirSync(path.join(root, 'readable'), { recursive: true });
  for (const r of results) {
    fs.writeFileSync(path.join(root, 'readable', `${r.caseId}-${r.arm}-${r.kind}.txt`), documentText(deliveredDocument(r), r.kind));
    if (r.arm.endsWith('pipeline')) {
      const first = r.delivered?.evaluationReport?.events?.find(e => e.stage === 'first_draft');
      if (first) fs.writeFileSync(path.join(root, 'readable', `${r.caseId}-${r.arm}-${r.kind}-first-draft.txt`), documentText(first.raw || first.document, r.kind));
    }
  }
  console.log(JSON.stringify({ captured: results.length, arms: [...new Set(results.map(r => r.arm))].map(arm => {
    const rows = metrics.filter(r => r.arm === arm);
    return { arm, available: rows.filter(r => r.available).length, captured: rows.length, medianMs: median(rows.map(r => r.durationMs)), calls: rows.reduce((n, r) => n + r.calls, 0) };
  }) }, null, 2));
}
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(root, 'analyze.mjs')) main();
