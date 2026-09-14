import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {comparisonCases} from '../evaluations/comparative-v1/cases.js';
import {freshCases} from '../evaluations/validation-recovery-v1/fresh-cases.js';
import {createTailorHandler} from '../api/tailor.js';
import {createCoverLetterHandler} from '../api/cover-letter.js';
import {buildAtsReview} from '../api/_lib/atsValidation.js';
import {recoverSelectedProjects} from '../api/_lib/resumeProjectRecovery.js';
import {protectAttributedOutcomes,restoreProtectedOutcomes,retainsProtectedOutcomes} from '../api/_lib/outcomeSourceRepair.js';
import {createResumeExportContext,getResumeExportReadiness} from '../src/resumeReadiness.js';
import {manifestVisibleText} from '../src/resumeModel.js';
import {createCoverLetterPlan,updateCoverLetterParagraph,getCoverLetterReadiness,createCoverLetterExportContext} from '../src/coverLetterModel.js';
const skipContentReview=async({document})=>({document,applied:false,status:'not_tested_here'});
const fixture=id=>[...comparisonCases,...freshCases].find(c=>c.id===id);
const captured=id=>JSON.parse(fs.readFileSync(new URL('../evaluations/validation-recovery-v1/raw/'+id+'-resume-attempt-1.json',import.meta.url)));
const response=()=>({setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;return this;}});
for(const id of ['C02','R07'])test(id+': normal résumé handler repairs preserved provider output without a rebuild or lost result',async()=>{
 const c=fixture(id),r=captured(id),analysis=JSON.parse(r.calls[0].response.output.find(e=>e.type==='function_call').arguments);
 let calls=0;
 const handler=createTailorHandler({authenticate:async()=>({user:{id:'fixture'},supabase:{}}),getApiKey:()=> 'fixture',getOpenAIKey:()=>undefined,reviewContent:skipContentReview,fetchImpl:async(_url,options)=>{
  const body=JSON.parse(options.body),name=body.tool_choice.name;calls++;
  return {ok:true,json:async()=>({content:[{type:'tool_use',name,input:name==='return_tailoring_analysis'?analysis:r.delivered.resume}]})};
 }});
 const res=response();await handler({method:'POST',headers:{authorization:'Bearer fixture'},body:{resume:c.resume,customJob:c.job,captureEvaluation:true}},res);
 assert.equal(res.code,200,JSON.stringify(res.body));assert.equal(calls,2,'analysis + draft only; no live requests');
 assert.equal(res.body.repair_applied,true);
 const recovery=res.body.evaluationReport.events.find(e=>e.stage==='source_recovery');
 assert.equal(recovery.beforeReview.integrity.status,'blocked');
 const doc=res.body.resume;
 assert.equal(doc.experience.length,2);
 assert.equal(doc.projects.length,1);
 assert.equal(doc.projects[0].bullets.length,1,'complete restored evidence subsumes the prior partial bullet');
 assert.match(doc.projects[0].bullets.join(' '),id==='C02'?/differences fell from 18 to 5/:/exceptions fell from nine to two/);
 assert.match(doc.projects[0].bullets.join(' '),/approved.*adjustments/);
 const context=createResumeExportContext(doc,res.body.ats_review,{item:c.job});
 const text=manifestVisibleText(context.renderPlan.manifest).join(' ');
 assert.match(text,id==='C02'?/differences fell from 18 to 5/:/exceptions fell from nine to two/);
 assert.equal(getResumeExportReadiness(r.delivered.resume,res.body.ats_review).canExport,false,'changed/stale content cannot reuse the new review');
 assert.equal(getResumeExportReadiness(doc,r.delivered.ats_review).canExport,false,'old contract is invalidated');
});
const c=fixture('R07');
const outcome=c.resume.split('\n').find(s=>s.includes('exceptions fell'));
const safe='Unresolved exceptions fell from nine to two over the next three reviews; the manager approved adjustments.';
const claim='I reduced unresolved exceptions from nine to two over the next three reviews; the manager approved adjustments.';
const draft=text=>({length:'standard',paragraphs:[
 {id:'o',purpose:'opening',text,evidence_refs:[outcome],requirement_refs:[c.job.responsibilities[0]]},
 {id:'c',purpose:'closing',text:'Thank you for considering my application.',evidence_refs:[],requirement_refs:[]}
]});
async function letterResponse(raw){
 const handler=createCoverLetterHandler({authenticate:async()=>({user:{id:'fixture'},supabase:{}}),getApiKey:()=> 'fixture',getOpenAIKey:()=>undefined,reviewContent:skipContentReview,
 fetchImpl:async()=>({ok:true,json:async()=>({content:[{type:'tool_use',name:'return_evidence_first_cover_letter',input:raw}]})})});
 const res=response();await handler({method:'POST',headers:{authorization:'Bearer fixture'},body:{resume:c.resume,customJob:c.job,length:'standard',captureEvaluation:true}},res);return res;
}
test('cover-letter generation restores outcome evidence; editing and export reject the ownership upgrade',async()=>{
 const res=await letterResponse(draft(claim));
 assert.equal(res.code,200,JSON.stringify(res.body));
 assert.equal(res.body.validation.firstDraftIntegrityPass,false);
 assert.equal(res.body.validation.repairApplied,true);
 assert.match(res.body.letter.paragraphs[0].text,/exceptions fell from nine to two/);
 assert.match(res.body.letter.paragraphs[0].text,/repeated upload/,'diagnostic evidence retained');
 const first=res.body.evaluationReport.events.find(e=>e.stage==='first_draft');
 assert.match(first.document.paragraphs[0].text,/I reduced/,'failed original is preserved');
 const resume=recoverSelectedProjects(captured('R07').delivered.resume,c.resume),atsReview=buildAtsReview(resume,c.resume,{keywords:[]});
 const context={baseResume:c.resume,resumeData:resume,item:c.job,atsReview};
 const plan=createCoverLetterPlan(draft(safe),context);
 assert.equal(getCoverLetterReadiness(plan,context).canExport,true);
 assert.ok(createCoverLetterExportContext(plan,context));
 assert.equal(updateCoverLetterParagraph(plan,'o',claim,context).ok,false);
 const bad=createCoverLetterPlan(draft(claim),context);
 assert.equal(getCoverLetterReadiness(bad,context).canExport,false);
 assert.throws(()=>createCoverLetterExportContext(bad,context));
});
test('a later repair cannot become successful by deleting the protected outcome or paragraph',()=>{
 const protectedOutcomes=protectAttributedOutcomes(draft(claim));
 assert.equal(protectedOutcomes.length,1);
 const stripped=draft('I tested the handover checklist with the manager.');
 assert.equal(retainsProtectedOutcomes(stripped,protectedOutcomes),false);
 const restored=restoreProtectedOutcomes(stripped,protectedOutcomes);
 assert.equal(retainsProtectedOutcomes(restored,protectedOutcomes),true);
 assert.match(restored.paragraphs[0].text,/exceptions fell from nine to two/);
 assert.match(restored.paragraphs[0].text,/manager approved adjustments/);
 assert.equal(retainsProtectedOutcomes({paragraphs:[draft(safe).paragraphs[1]]},protectedOutcomes),false);
});

test('shared and qualitative outcome repairs also preserve their source evidence',()=>{
 for(const source of ['The team reduced unresolved exceptions from nine to two.','Customer satisfaction improved after the pilot.']){
  const claim=source.startsWith('The team')?'I reduced unresolved exceptions from nine to two.':'I improved customer satisfaction.';
  const original=draft(claim);original.paragraphs[0].evidence_refs=[source];
  const protection=protectAttributedOutcomes(original);
  assert.equal(protection.length,1);
  const stripped=draft('I tested the revised checklist with the manager.');
  assert.equal(retainsProtectedOutcomes(stripped,protection),false,source);
  const restored=restoreProtectedOutcomes(stripped,protection);
  assert.ok(restored.paragraphs[0].text.includes(source));
 }
});
