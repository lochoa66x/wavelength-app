import fs from 'node:fs';
import crypto from 'node:crypto';
import {recoveryCases} from './cases.js';
import {documentText} from '../comparative-v1/analyze.mjs';
const root=new URL('./',import.meta.url);
fs.mkdirSync(new URL('readable/',root),{recursive:true});
const rows=fs.readdirSync(new URL('raw/',root)).filter(p=>p.endsWith('.json')).map(p=>JSON.parse(fs.readFileSync(new URL('raw/'+p,root))));
const metrics=[];
for(const r of rows){
 const c=recoveryCases.find(c=>c.id===r.caseId);
 if(r.sourceHash!==crypto.createHash('sha256').update(JSON.stringify(c)).digest('hex'))throw new Error('Fixture mismatch '+r.caseId);
 const doc=r.httpStatus===200?r.delivered?.[r.kind==='resume'?'resume':'letter']:null;
 const events=r.delivered?.evaluationReport?.events||[],first=events.find(e=>e.stage==='first_draft'),validation=events.find(e=>e.stage==='validation');
 fs.writeFileSync(new URL('readable/'+r.caseId+'-'+r.kind+'.txt',root),documentText(doc,r.kind));
 if(first)fs.writeFileSync(new URL('readable/'+r.caseId+'-'+r.kind+'-first-draft.txt',root),documentText(first.raw||first.document,r.kind));
 metrics.push({caseId:r.caseId,kind:r.kind,httpStatus:r.httpStatus,available:!!doc,revision:r.deploymentRevision,durationMs:r.durationMs,calls:r.calls?.length||0,models:[...new Set((r.calls||[]).map(c=>c.response?.model||c.request?.model))],firstIssueCount:validation?.review?.integrity?.issue_count??first?.issues?.length??null,firstIssues:first?.issues||validation?.review?.contract_issues||[],repairDrafts:events.filter(e=>e.stage==='repair_draft').length,fallback:r.delivered?.safety_fallback_applied||false,emptyRoles:(doc?.experience||[]).filter(e=>!e.bullets?.length).map(e=>e.role),status:r.delivered?.ats_review?.status,writing:r.delivered?.ats_review?.writing,profile:doc?.profile,issues:r.delivered?.ats_review?.contract_issues||[],letterValidation:r.delivered?.validation});
}
fs.writeFileSync(new URL('metrics.json',root),JSON.stringify(metrics,null,2));
console.log(JSON.stringify(metrics.map(r=>({caseId:r.caseId,kind:r.kind,http:r.httpStatus,firstIssues:r.firstIssueCount,repairs:r.repairDrafts,fallback:r.fallback,emptyRoles:r.emptyRoles,seconds:Math.round(r.durationMs/1000)})),null,2));
