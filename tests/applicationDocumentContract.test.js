// Editorial judgement has its own production-path tests; these fixtures isolate the named validation/repair behaviour.
const skipContentReview = async ({ document }) => ({ document, applied: false, status: "not_tested_here" });
import test from 'node:test';
import assert from 'node:assert/strict';
import { validateApplicationDocument, mergeCoverLetterReplacement, resumeReviewedContentHash } from '../src/applicationDocumentContract.js';
import { createCoverLetterPlan, getCoverLetterReadiness, createCoverLetterExportContext, validateCoverLetterExportContext, updateCoverLetterParagraph, replaceCoverLetterParagraph, removeCoverLetterParagraph } from '../src/coverLetterModel.js';
import { getResumeExportReadiness } from '../src/resumeReadiness.js';
import { createResumePackage } from '../src/resumeModel.js';
import { buildAtsReview } from '../api/_lib/atsValidation.js';
import { createCoverLetterHandler } from '../api/cover-letter.js';
import { reviewResumeSummary, editorialSentences } from '../src/resumeSummaryWriting.js';
import { reviewCoverLetterWriting } from '../src/coverLetterWriting.js';
import { polishResumeSummary } from '../api/_lib/resumeSummaryPolish.js';
import { organizeResumeSections } from '../src/resumeOrganization.js';

const source = 'Jordan Lee\njordan@example.com\nIndustrial Electrician | North Plant | 2021 - 2025\nInstalled and maintained electrical panels.\nCompleted preventive maintenance in a CMMS.';
const resumeData = { name: 'Jordan Lee', contact: 'jordan@example.com', title: 'Industrial Electrician', profile: 'Industrial electrician with plant maintenance experience.', experience: [{role:'Industrial Electrician',company:'North Plant',dates:'2021 - 2025',bullets:['Installed and maintained electrical panels.','Completed preventive maintenance in a CMMS.']}], skills:['CMMS'] };
const item = { title:'Facilities Electrician',company:'Northline Manufacturing',description:'Maintain plant electrical systems and document preventive maintenance.',responsibilities:['Install and maintain electrical panels','Document work in the CMMS'],required_qualifications:['Industrial electrical maintenance experience'] };
const atsReview = { posting_readiness:{status:'reviewed_complete',fit_allowed:true,application_ready_allowed:true},readiness:{status:'strong_fit'},requirements:[{id:'R1',requirement:'Industrial electrical maintenance experience',evidence_match:'direct'}],coverage:{direct:1,adjacent:0,transferable:0,missing:0},integrity:{status:'pass'} };
const context = {baseResume:source,resumeData,item,atsReview};
const draft = () => ({length:'short',voice:'direct',paragraphs:[
 {id:'o',purpose:'opening',text:'I installed and maintained electrical panels at North Plant.',evidence_refs:[resumeData.experience[0].bullets[0]],requirement_refs:[item.responsibilities[0]]},
 {id:'e',purpose:'evidence',text:'I completed preventive maintenance in a CMMS.',evidence_refs:[resumeData.experience[0].bullets[1]],requirement_refs:[item.responsibilities[1]]},
 {id:'c',purpose:'closing',text:'Thank you for considering my application.',evidence_refs:[],requirement_refs:[]},
]});
async function invoke(raw, extra = {}) {
 let calls=0;
 const handler=createCoverLetterHandler({ reviewContent: skipContentReview,authenticate:async()=>({user:{id:'qa'},supabase:{}}),getApiKey:()=> 'test',getOpenAIKey:()=>undefined,fetchImpl:async()=>{calls++;return {ok:true,json:async()=>({content:[{type:'tool_use',name:'return_evidence_first_cover_letter',input:raw}]})}}});
 const response={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(value){this.body=value;return this;}};
 await handler({method:'POST',headers:{authorization:'Bearer test'},body:{resume:source,customJob:item,length:'short',...extra}},response);
 return {...response,calls};
}
const malformed = [
 ['closing-only', value => { value.paragraphs.forEach(p=>{p.purpose='closing';p.evidence_refs=[];p.requirement_refs=[];p.text='Thank you for considering my application.';}); }],
 ['missing-candidate-citation', value => { value.paragraphs[0].evidence_refs=[]; }],
 ['missing-posting-citation', value => { value.paragraphs[0].requirement_refs=[]; }],
 ['wrong-order', value => { [value.paragraphs[0],value.paragraphs[1]]=[value.paragraphs[1],value.paragraphs[0]]; }],
 ['over-budget', value => { value.paragraphs[0].text='I maintained electrical panels. '+Array(181).fill('maintenance').join(' '); }],
 ['unsupported-leadership', value => { value.paragraphs[0].text='I led the electrical maintenance team at North Plant.'; }],
];
for (const [name, mutate] of malformed) test('same contract blocks '+name+' in generation, readiness and export',async()=>{
 const raw=draft();mutate(raw);
 assert.equal(validateApplicationDocument({kind:'cover-letter',document:raw,candidateCorpus:source}).valid,false);
 const response=await invoke(raw);assert.equal(response.statusCode,422);
 const plan=createCoverLetterPlan(raw,context);
 assert.equal(getCoverLetterReadiness(plan,context).canExport,false);
 assert.throws(()=>createCoverLetterExportContext(plan,context));
});
test('valid generation, saved draft, safe edit and export agree',async()=>{
 const response=await invoke(draft());assert.equal(response.statusCode,200);
 const plan=createCoverLetterPlan(response.body.letter,context);
 const edited=updateCoverLetterParagraph(plan,'o','I maintained and installed electrical panels at North Plant.',context);
 assert.equal(edited.ok,true,edited.message);
 assert.equal(getCoverLetterReadiness(edited.plan,context).canExport,true);
 assert.equal(validateCoverLetterExportContext(createCoverLetterExportContext(edited.plan,context)).plan.contentHash,edited.plan.contentHash);
});
test('regeneration cannot change purpose and cannot expand past the complete letter budget',async()=>{
 const plan=createCoverLetterPlan(draft(),context);
 const changed={...draft().paragraphs[0],purpose:'closing',evidence_refs:[],requirement_refs:[]};
 assert.equal(mergeCoverLetterReplacement(plan,changed,'o'),null);
 assert.throws(()=>replaceCoverLetterParagraph(plan,'o',changed,context),/purpose/);
 const response=await invoke({paragraphs:[changed]},{regenerateParagraph:'o',existingDraft:plan});assert.equal(response.statusCode,422);
 const tooLong={...draft().paragraphs[0],text:'I maintained electrical panels. '+Array(181).fill('maintenance').join(' ')};
 assert.throws(()=>replaceCoverLetterParagraph(plan,'o',tooLong,context),/180-word/);
 const oversized=await invoke({paragraphs:[tooLong]},{regenerateParagraph:'o',existingDraft:plan});assert.equal(oversized.statusCode,422);
 assert.equal(updateCoverLetterParagraph(plan,'o',tooLong.text,context).ok,false);
});
test('a valid paragraph regeneration retains untouched paragraphs',async()=>{
 const plan=createCoverLetterPlan(draft(),context);
 const replacement={...draft().paragraphs[0],text:'At North Plant, I installed and maintained electrical panels.'};
 const response=await invoke({paragraphs:[replacement]},{regenerateParagraph:'o',existingDraft:plan});
 assert.equal(response.statusCode,200);
 const merged=replaceCoverLetterParagraph(plan,'o',response.body.letter.paragraphs[0],context);
 assert.deepEqual(merged.paragraphs.slice(1),plan.paragraphs.slice(1));
});
test('removing the opening preserves a reviewable draft but blocks export',()=>{
 const plan=createCoverLetterPlan(draft(),context),removed=removeCoverLetterParagraph(plan,'o');
 assert.equal(removed.paragraphs.length,2);
 assert.equal(getCoverLetterReadiness(removed,context).canExport,false);
 assert.throws(()=>createCoverLetterExportContext(removed,context));
});
test('resume assessment is bound to reviewed content across canonicalization and presentation',()=>{
 const review=buildAtsReview(resumeData,source,{keywords:[]});
 assert.equal(review.document_contract.contentHash,resumeReviewedContentHash(createResumePackage(resumeData,{item})));
 assert.equal(getResumeExportReadiness(resumeData,review).canExport,true);
 assert.equal(getResumeExportReadiness({...resumeData,profile:'I invented a new qualification.'},review).canExport,false);
 assert.equal(getResumeExportReadiness(resumeData,{...review,writing:{status:'blocked'}}).canExport,false);
});
test('valid domain nouns, degree abbreviations and different results are positive controls',()=>{
 assert.equal(editorialSentences('Analyst with a B.Sc. in Statistics. Community research background.').length,2);
 assert.deepEqual(reviewResumeSummary({profile:'Planning consultant with a background in building conservation and urban design.',experience:[]}),[]);
 assert.ok(!reviewResumeSummary({profile:'Reduced integration defects during testing by 20% at Cedar.',experience:[{bullets:['Reduced integration defects during testing by 40% at Birch.']}]}).some(i=>i.code==='summary_repeats_experience'));
 assert.ok(!reviewCoverLetterWriting([{id:'o',purpose:'opening',text:'I am writing SQL queries for a community research programme.'}]).issues.some(i=>i.code==='formulaic_opening'));
 assert.ok(!reviewCoverLetterWriting([{id:'o',purpose:'opening',text:'I installed electrical panels at North Plant. This work combined overnight shutdown access with inspections by the site electrician.'}]).issues.some(i=>i.code==='restated_work_description'));
});
test('nominalized repetition is caught and a generic replacement cannot win by being shorter',async()=>{
 assert.ok(reviewResumeSummary({profile:'My recent work includes preparation of monthly expense reports for the owner.',experience:[{bullets:['Prepared monthly expense reports for the owner.']}]}).some(i=>i.code==='summary_repeats_experience'));
 const resume={...resumeData,profile:resumeData.experience[0].bullets.join(' ')};
 const result=await polishResumeSummary({resume,review:{status:'review'},source,generate:async()=>({profile:'Results-driven professional with a proven track record.'}),validate:async()=>({status:'review'})});
 assert.equal(result.applied,false);
 assert.equal(result.resume,resume);
});
test('languages appear once without losing proficiency',()=>{
 const result=organizeResumeSections({skills:['English fluent','Spanish fluent','Excel'],languages:['English fluent; Spanish fluent']});
 assert.deepEqual(result.skills,['Excel']);
 assert.deepEqual(result.languages,['English fluent','Spanish fluent']);
});
test('whole-letter word budget is reviewed during a partial revision',()=>{
 const existingDraft={paragraphs:draft().paragraphs};
 const replacement={...draft().paragraphs[0],text:Array(181).fill('maintenance').join(' ')};
 assert.ok(reviewCoverLetterWriting([replacement],'short',{partial:true,existingDraft}).issues.some(i=>i.code==='letter_length'));
});
test('service disclaimer advice does not remove material supervision or project scope',()=>{
 const disclaimer=reviewCoverLetterWriting([{id:'o',purpose:'opening',text:'I deliver translations by agreed deadlines; no same-day service promise.'}]);
 assert.ok(disclaimer.issues.some(i=>i.code==='service_disclaimer'));
 const material=reviewCoverLetterWriting([{id:'o',purpose:'opening',text:'I prepared the academic project using public sample data under supervisor review.'}]);
 assert.ok(!material.issues.some(i=>i.code==='service_disclaimer'));
});

test('employer extraction stops before a following verb and handles pipe headings', async()=>{
 const {candidateClaimIssues}=await import('../src/candidateClaims.js');
 const cited=['Coordinated project reporting at NISSAN.'];
 const corpus='PMO Consultant | Capgemini | 2020 - 2024\n'+cited[0];
 assert.deepEqual(candidateClaimIssues('My work at NISSAN included project reporting.',cited,{candidateCorpus:corpus}),[]);
 assert.ok(candidateClaimIssues('At Cedar, I coordinated project reporting.',cited,{candidateCorpus:corpus}).some(i=>i.includes('employer or project')));
});

test('legacy generated assessments need review and cannot bypass the gate through a new export context', async()=>{
 const {createResumeExportContext,validateResumeExportContext}=await import('../src/resumeReadiness.js');
 const legacy=buildAtsReview(resumeData,source,{keywords:[]});delete legacy.document_contract;
 assert.equal(getResumeExportReadiness(resumeData,legacy).canExport,false);
 assert.throws(()=>validateResumeExportContext(createResumeExportContext(resumeData,legacy)));
});
