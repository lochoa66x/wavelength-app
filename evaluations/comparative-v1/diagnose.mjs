import fs from 'node:fs';
import path from 'node:path';
import { root, loadResults } from './analyze.mjs';
import { quantityFacts } from '../../src/claimFacts.js';
import { candidateClaimIssues } from '../../src/candidateClaims.js';
import { comparisonCases } from './cases.js';
const results = loadResults();
const observations = [];
for (const r of results.filter(r => r.arm.endsWith('pipeline'))) {
  const events = r.delivered?.evaluationReport?.events || [];
  const first = events.find(e => e.stage === 'first_draft');
  const fixture = comparisonCases.find(c => c.id === r.caseId);
  const initial = events.find(e => e.stage === 'validation');
  const current = r.delivered?.ats_review;
  observations.push({ caseId: r.caseId, arm: r.arm, kind: r.kind, status: r.httpStatus,
    firstDraftIssues: first?.issues || initial?.review?.contract_issues || [],
    initialIntegrityIssueCount: initial?.review?.integrity?.issue_count ?? first?.issues?.length ?? null,
    initialPositioningIssues: initial?.review?.unsupported_positioning || [],
    firstProfile: first?.raw?.profile || null, deliveredProfile: r.delivered?.resume?.profile || null,
    repairDrafts: events.filter(e => e.stage === 'repair_draft').length,
    sourceRepair: events.some(e => e.stage === 'source_repair'), editorialValidation: events.some(e => e.stage === 'editorial_validation'),
    fallback: r.delivered?.safety_fallback_applied || false,
    postingStatus: current?.posting?.status || null, exportReadiness: current?.export_readiness || null,
    emptyRoles: (r.delivered?.resume?.experience || []).filter(e => !e.bullets?.length).map(e => ({ role: e.role, company: e.company, dates: e.dates })),
    yearReproductions: (first?.document?.paragraphs || []).filter(p => p.text?.includes('2025')).map(p => ({
      proposed: p.text, exactSources: p.evidence_refs, parsedQuantities: quantityFacts(p.text),
      reproducedIssues: candidateClaimIssues(p.text, p.evidence_refs, { candidateCorpus: fixture.resume }),
    })),
  });
}
fs.writeFileSync(path.join(root, 'diagnostics.json'), JSON.stringify(observations, null, 2));
console.log(JSON.stringify(observations.map(o => ({ caseId: o.caseId, arm: o.arm, kind: o.kind, status: o.status, initialIssues: o.initialIntegrityIssueCount, repairDrafts: o.repairDrafts, fallback: o.fallback, posting: o.postingStatus, readiness: o.exportReadiness?.status, emptyRoles: o.emptyRoles.length })), null, 2));
