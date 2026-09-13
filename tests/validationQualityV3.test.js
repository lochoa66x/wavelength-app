import test from 'node:test';
import assert from 'node:assert/strict';
import { workConditionIssues, explicitToolUseIssues } from '../src/claimConditions.js';
import { claimMeaningIssues } from '../src/documentIntegrity.js';
import { candidateClaimIssues } from '../src/candidateClaims.js';
import { validateApplicationDocument } from '../src/applicationDocumentContract.js';
import { createCoverLetterPlan, updateCoverLetterParagraph, replaceCoverLetterParagraph, getCoverLetterReadiness, createCoverLetterExportContext } from '../src/coverLetterModel.js';
import { createCoverLetterHandler } from '../api/cover-letter.js';
import { buildAtsReview } from '../api/_lib/atsValidation.js';
import { getResumeExportReadiness } from '../src/resumeReadiness.js';
import { reviewResumeSummary } from '../src/resumeSummaryWriting.js';
import { reviewCoverLetterWriting } from '../src/coverLetterWriting.js';
import { reviewApplicationContent } from '../api/_lib/contentEditorialReview.js';

const approval = 'Design alterations required the supervisor’s approval.';
const supervised = 'Repaired loose hems under the supervisor’s direction.';
const source = 'Alex Bell\nalex@example.com\nWardrobe Assistant | Cedar Theatre | 2022 - 2026\n'+approval+'\n'+supervised;
const item = {title:'Wardrobe Assistant',company:'River Theatre',description:'Repair costumes and follow supervisor instructions.',responsibilities:['Repair costumes and follow supervisor instructions.']};
const resumeData={name:'Alex Bell',contact:'alex@example.com',title:'Wardrobe Assistant',profile:'Wardrobe assistant with theatre production experience.',experience:[{role:'Wardrobe Assistant',company:'Cedar Theatre',dates:'2022 - 2026',bullets:[approval,supervised]}]};
const atsReview={posting_readiness:{status:'reviewed_complete',fit_allowed:true,application_ready_allowed:true},readiness:{status:'strong_fit'},requirements:[],integrity:{status:'pass'}};
const context={baseResume:source,resumeData,item,atsReview};
const draft=()=>({length:'short',paragraphs:[
 {id:'o',purpose:'opening',text:supervised,evidence_refs:[supervised],requirement_refs:[item.description]},
 {id:'e',purpose:'evidence',text:approval,evidence_refs:[approval],requirement_refs:[item.description]},
 {id:'c',purpose:'closing',text:'I welcome the opportunity to discuss the role.',evidence_refs:[],requirement_refs:[]},
]});
async function invoke(outputs,{capture,extra={},sourceText=source}={}) {
 let call=0;
 const handler=createCoverLetterHandler({recordEvaluationEvent:capture,reviewContent:async({document})=>({document,applied:false,status:'not_tested_here'}),authenticate:async()=>({user:{id:'qa'}}),getApiKey:()=> 'test',getOpenAIKey:()=>undefined,
 fetchImpl:async()=>({ok:true,json:async()=>({content:[{type:'tool_use',name:'return_evidence_first_cover_letter',input:structuredClone(outputs[Math.min(call++,outputs.length-1)])}]})})});
 const res={statusCode:200,setHeader(){},status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}};
 await handler({method:'POST',headers:{authorization:'Bearer qa'},body:{resume:sourceText,customJob:item,length:'short',...extra}},res);
 return res;
}
for(const text of [
 'Design alterations required no approval.',
 'Design alterations did not require the supervisor’s approval.',
 'Approval was optional for design alterations.',
 'No approval was required for design alterations.',
 'The supervisor’s approval was not required for design alterations.',
 'I made design alterations independently.',
 'I made design alterations without approval.',
 'I approved design alterations.',
 'Design alterations required the client’s approval.',
 'I made design alterations.',
]) test('approval condition rejects: '+text,async()=>{
 assert.ok(workConditionIssues(text,[approval]).length);
 const raw=draft();raw.paragraphs[1].text=text;
 assert.equal(validateApplicationDocument({kind:'cover-letter',document:raw,candidateCorpus:source}).valid,false);
 assert.equal((await invoke([raw])).statusCode,422);
 const plan=createCoverLetterPlan(draft(),context), before=structuredClone(plan);
 assert.equal(updateCoverLetterParagraph(plan,'e',text,context).ok,false);
 assert.deepEqual(plan,before);
 assert.throws(()=>replaceCoverLetterParagraph(plan,'e',raw.paragraphs[1],context));
 assert.equal((await invoke([{paragraphs:[raw.paragraphs[1]]}],{extra:{regenerateParagraph:'e',existingDraft:plan}})).statusCode,422);
 const forged={...plan,paragraphs:raw.paragraphs};
 assert.equal(getCoverLetterReadiness(forged,context).canExport,false);
 assert.throws(()=>createCoverLetterExportContext(forged,context));
});
for(const text of ['Design alterations needed the supervisor’s approval.','Design alterations were subject to the supervisor’s approval.','The supervisor’s approval was required for design alterations.']) test('approval paraphrase passes every letter path: '+text,async()=>{
 assert.deepEqual(workConditionIssues(text,[approval]),[]);
 const raw=draft();raw.paragraphs[1].text=text;
 assert.equal((await invoke([raw])).statusCode,200);
 const plan=createCoverLetterPlan(draft(),context),edited=updateCoverLetterParagraph(plan,'e',text,context);
 assert.equal(edited.ok,true,edited.message);
 assert.equal(getCoverLetterReadiness(edited.plan,context).canExport,true);
 assert.ok(createCoverLetterExportContext(edited.plan,context));
 assert.ok(replaceCoverLetterParagraph(plan,'e',raw.paragraphs[1],context));
});
test('authority and supervision remain scoped to the same action',()=>{
 assert.ok(workConditionIssues('I repaired loose hems independently.',[supervised,'I independently labelled storage boxes.']).length);
 assert.ok(workConditionIssues('I repaired loose hems.',[supervised]).length);
 assert.deepEqual(workConditionIssues('I repaired loose hems under the supervisor’s direction.',[supervised]),[]);
 assert.deepEqual(workConditionIssues('The supervisor approved design changes.',['Design changes were approved by the supervisor.']),[]);
 assert.deepEqual(claimMeaningIssues('Design alterations did not require approval.',['Design alterations required no approval.']),[]);
 assert.deepEqual(workConditionIssues('Design alterations needed no approval.',['Design alterations required no approval.']),[]);
 assert.deepEqual(workConditionIssues('I independently labelled storage boxes.',[supervised,'I independently labelled storage boxes.']),[]);
 assert.deepEqual(workConditionIssues('I ran approved programmes.',['Ran approved programmes.']),[]);
});
test('résumé provenance and export reject changed approval conditions',()=>{
 const changed=structuredClone(resumeData);changed.experience[0].bullets[0]='Design alterations required no approval.';
 const review=buildAtsReview(changed,source,{keywords:[]});
 assert.equal(getResumeExportReadiness(changed,review).canExport,false);
 const original=buildAtsReview(resumeData,source,{keywords:[]});
 assert.equal(getResumeExportReadiness(resumeData,original).canExport,true);
});
for(const text of ['Thank you for considering my application.','Thank you for your time and consideration. I welcome a conversation.'])test('non-factual courtesy needs no source vocabulary: '+text,async()=>{
 const raw=draft();raw.paragraphs[2].text=text;
 assert.equal((await invoke([raw])).statusCode,200);
 const plan=createCoverLetterPlan(draft(),context),edited=updateCoverLetterParagraph(plan,'c',text,context);
 assert.equal(edited.ok,true,edited.message);assert.ok(createCoverLetterExportContext(edited.plan,context));
});
test('shared tool checks reject unsupported tools but allow cited tools and courtesy',()=>{
 assert.ok(explicitToolUseIssues('I used Kubernetes.',[supervised]).length);
 assert.ok(explicitToolUseIssues('I used Excel and Kubernetes.',['Used Excel.']).length);
 assert.deepEqual(explicitToolUseIssues('I used Microsoft Excel for inventory records.',['Used Microsoft Excel for inventory records.']),[]);
 assert.deepEqual(explicitToolUseIssues('Thank you for considering my application.',[]),[]);
 const raw=draft();raw.paragraphs[0].text='I used Kubernetes for costume repairs.';
 assert.equal(validateApplicationDocument({kind:'cover-letter',document:raw,candidateCorpus:source}).valid,false);
 assert.equal(updateCoverLetterParagraph(createCoverLetterPlan(draft(),context),'o',raw.paragraphs[0].text,context).ok,false);
});
test('quantities use their cited object and rate even when another clause has more overlap',()=>{
 const sources=['Prepared 12 table arrangements with an assistant; this was our combined total.','Kept table sightlines clear using low containers and the approved cream and green palette.'];
 const valid='With an assistant, I prepared 12 table arrangements and kept table sightlines clear using low containers and the approved cream and green palette.';
 assert.deepEqual(candidateClaimIssues(valid,sources),[]);
 for(const invalid of [valid.replace('12 table arrangements','12 bouquets'),valid.replace('12 table arrangements','13 table arrangements'),valid.replace('With an assistant, I','I independently')]) assert.ok(candidateClaimIssues(invalid,sources).length,invalid);
 assert.ok(candidateClaimIssues(valid,[sources[1]]).length);
 assert.ok(candidateClaimIssues('I prepared 12 table arrangements.',sources).length);
 assert.ok(candidateClaimIssues('Prepared 12 packages per hour.',['Prepared 12 packages per shift.']).length);
 assert.ok(candidateClaimIssues('At Birch, I prepared 12 arrangements.',[{excerpt:'Prepared 12 arrangements.',employer:'Cedar'},{excerpt:'Prepared arrangements.',employer:'Birch'}]).length);
});
test('evaluation capture preserves the first rejection, repair and final outcome separately',async()=>{
 const raw=draft();raw.paragraphs[1].text='Design alterations required no approval.';
 const events=[];const result=await invoke([raw,{paragraphs:[draft().paragraphs[1]]}],{capture:event=>events.push(event)});
 assert.equal(result.statusCode,200);assert.deepEqual(events.map(e=>e.stage),['first_draft','repair','outcome']);
 assert.deepEqual(events.map(e=>e.sequence),[1,2,3]);assert.equal(new Set(events.map(e=>e.requestId)).size,1);
 assert.ok(events[0].issues.length);assert.ok(events[0].candidateCatalog.length);assert.ok(events[0].raw.paragraphs[1].text.includes('no approval'));
 assert.deepEqual(events[1].issues,[]);assert.equal(events[2].repairApplied,true);assert.equal(events[2].firstDraftIntegrityPass,false);
 assert.equal(events[2].status,'accepted');assert.ok(!('raw' in result.body));
 const blocked=[];assert.equal((await invoke([raw,{paragraphs:[raw.paragraphs[1]]}],{capture:e=>blocked.push(e)})).statusCode,422);
 assert.equal(blocked.at(-1).status,'blocked');assert.ok(blocked[1].issues.length);
});
test('an evaluation recorder cannot mutate the checked draft or change acceptance on failure',async()=>{
 assert.equal((await invoke([draft()],{capture:event=>{if(event.raw)event.raw.paragraphs=[];throw Error('recorder unavailable');}})).statusCode,200);
});
const scores=n=>({relevance:n,useful_detail:n,document_purpose:n,selection:n,natural_writing:n});
test('title-only profiles are advisory and cannot win an editorial revision',async()=>{
 const titleOnly={...resumeData,profile:'Wardrobe assistant with wardrobe assistant experience.'};
 assert.ok(reviewResumeSummary(titleOnly,source).some(i=>i.code==='summary_title_only'));
 assert.deepEqual(reviewResumeSummary(resumeData,source),[]);
 assert.deepEqual(reviewResumeSummary({title:'Baker',profile:'Baker specializing in sourdough.'}),[]);
 const result=await reviewApplicationContent({kind:'profile',document:resumeData,source,generate:async()=>({decision:'revise',before:scores(2),after:scores(4),changes:[{original_excerpt:resumeData.profile,source_excerpt:approval,benefit:'Purports to make the professional focus more concise and clear.'}],document:titleOnly}),validate:async()=>({valid:true})});
 assert.equal(result.reason,'profile_lost_context');assert.equal(result.document,resumeData);
});
test('low-scored keep remains review-needed; model self-scoring cannot hide visible repetition',async()=>{
 for(const [document,value] of [[resumeData,1],[{...resumeData,profile:'Wardrobe assistant with wardrobe assistant experience.'},4]]){
  const result=await reviewApplicationContent({kind:'profile',document,source,generate:async()=>({decision:'keep',before:scores(value),after:scores(value)}),validate:async()=>({valid:true})});
  assert.equal(result.status,'needs_review');assert.equal(result.reviewNeeded,true);assert.equal(result.document,document);
 }
});
test('restatement advice covers required/included without deleting a distinct constraint',()=>{
 for(const text of ['I repaired loose hems and replaced buttons. This work required repairing hems and replacing buttons.','I repaired loose hems and replaced buttons. This hands-on work included loose hems and replacement buttons.'])assert.ok(reviewCoverLetterWriting([{id:'o',purpose:'opening',text}]).issues.some(i=>i.code==='restated_work_description'));
 assert.ok(!reviewCoverLetterWriting([{id:'o',purpose:'opening',text:'I repaired loose hems and replaced buttons. This work required the supervisor’s approval for changes to the original design.'}]).issues.some(i=>i.code==='restated_work_description'));
});

test('authenticated opt-in evaluation response retains a failed draft without enabling default logging',async()=>{
 const raw=draft();raw.paragraphs[1].text='Design alterations required no approval.';
 const result=await invoke([raw],{extra:{captureEvaluation:true}});
 assert.equal(result.statusCode,422);assert.equal(result.body.evaluationReport.version,1);
 assert.ok(result.body.evaluationReport.events[0].raw.paragraphs[1].text.includes('no approval'));
 assert.equal(result.body.evaluationReport.events.at(-1).status,'blocked');
 assert.equal('evaluationReport' in (await invoke([raw])).body,false);
});
