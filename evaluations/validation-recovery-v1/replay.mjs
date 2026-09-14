import fs from 'node:fs';
import crypto from 'node:crypto';
import {comparisonCases} from '../comparative-v1/cases.js';
import {buildAtsReview,sourceHistoryEntries} from '../../api/_lib/atsValidation.js';
import {candidateClaimIssues} from '../../src/candidateClaims.js';
const fields=['contract_issues','provenance_issues','unsupported_positioning','missing_history'];
const rows=[];
for(const c of comparisonCases) for(const arm of ['pipeline','confirmed_pipeline']){
 const r=JSON.parse(fs.readFileSync(new URL('../comparative-v1/raw/'+c.id+'-'+arm+'-resume-attempt-1.json',import.meta.url)));
 const initial=r.delivered.evaluationReport.events.find(e=>e.stage==='validation');
 const review=buildAtsReview(initial.document,c.resume,{keywords:r.delivered.tailoring_analysis?.target_keywords||[]},{analysis:r.delivered.tailoring_analysis,historyEvidence:c.resume,targetTitle:c.job.title,category:c.job.category,postingAssessment:r.delivered.tailoring_analysis?.posting_assessment,focusReview:initial.review.focus_review});
 const letter=JSON.parse(fs.readFileSync(new URL('../comparative-v1/raw/'+c.id+'-'+arm+'-letter-attempt-1.json',import.meta.url)));
 const first=letter.delivered?.evaluationReport?.events.find(e=>e.stage==='first_draft');
 rows.push({caseId:c.id,arm,sourceHash:crypto.createHash('sha256').update(c.resume).digest('hex'),unchangedDocumentHash:crypto.createHash('sha256').update(JSON.stringify(initial.document)).digest('hex'),checks:fields.map(field=>({field,before:initial.review[field]||[],after:review[field]||[]})),history:sourceHistoryEntries(c.resume).map(e=>({role:e.role,company:e.company,dates:e.dates})),letterClaims:(first?.document?.paragraphs||[]).map(p=>({paragraph:p.id,text:p.text,issues:candidateClaimIssues(p.text,p.evidence_refs,{candidateCorpus:c.resume})}))});
}
fs.writeFileSync(new URL('./replay.json',import.meta.url),JSON.stringify({kind:'deterministic replay of unchanged captured documents; no model requests',rows},null,2),{flag:'wx'});
console.log(JSON.stringify(rows.map(r=>({caseId:r.caseId,arm:r.arm,checks:r.checks.map(c=>({field:c.field,before:c.before.length,after:c.after.length}))})),null,2));
