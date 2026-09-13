import test from 'node:test';
import assert from 'node:assert/strict';
import {candidateClaimIssues,credentialEvidenceIssues} from '../src/candidateClaims.js';
import {validateApplicationDocument} from '../src/applicationDocumentContract.js';
import {createCoverLetterHandler} from '../api/cover-letter.js';
import {createCoverLetterPlan,updateCoverLetterParagraph,getCoverLetterReadiness,createCoverLetterExportContext,validateCoverLetterExportContext} from '../src/coverLetterModel.js';
const credential='Veterinary Assistant certificate | Example Community College | 2023';
const validClaims=['I hold a Veterinary Assistant certificate from Example Community College.','My Veterinary Assistant certificate complements my clinical experience.','I have a Veterinary Assistant certificate and clinical practice experience.'];
test('candidate credential prose separates the name from sentence context and retains issuer tokens',()=>{
 for(const text of validClaims)assert.deepEqual(candidateClaimIssues(text,[credential]),[],text);
 assert.deepEqual(candidateClaimIssues('I hold an Orbital Welding certificate issued by Example Trade College.',['Orbital Welding certificate | Example Trade College | 2024']),[]);
 for(const text of ['I hold an Advanced Veterinary Assistant certificate.','I hold a Veterinary Assistant certificate from Another College.','I hold a current Veterinary Assistant certificate.','I hold a Veterinary Assistant certificate and a Surgical Assistant certificate.'])assert.ok(candidateClaimIssues(text,[credential]).length,text);
 for(const source of [credential+'; expired',credential+'; in progress',credential+'; not held'])assert.ok(candidateClaimIssues(validClaims[0],[source]).length,source);
});
test('credential conjunctions, specialty and current status remain strict after prose parsing',()=>{
 assert.ok(credentialEvidenceIssues('Veterinary Assistant certificate and clinical practice certificate',[credential]).length);
 assert.ok(candidateClaimIssues('I hold a current Veterinary Assistant certificate and current First Aid certificate.',[credential,'First Aid certificate | Example Centre | current']).length);
 assert.ok(candidateClaimIssues('I hold a Veterinary Assistant certificate in Emergency Care.',[credential]).length);
 assert.deepEqual(candidateClaimIssues('I hold a Veterinary Assistant certificate and First Aid certificate.',[credential,'First Aid certificate | Example Centre | current']),[]);
});
const source='Theo Martins\nf02@example.com\nVeterinary Assistant | Example Willow Animal Practice | 2023 - 2026\nPrepared examination rooms according to clinic procedures.\nEducation\n'+credential;
const item={title:'Veterinary Assistant',company:'Example Maple Animal Clinic',description:'Prepare examination rooms and assist the clinical team.',responsibilities:['Prepare examination rooms'],required_qualifications:['Veterinary assistant training']};
const resumeData={name:'Theo Martins',contact:'f02@example.com',title:'Veterinary Assistant',experience:[{role:'Veterinary Assistant',company:'Example Willow Animal Practice',dates:'2023 - 2026',bullets:['Prepared examination rooms according to clinic procedures.']}]};
const context={baseResume:source,resumeData,item,atsReview:{posting_readiness:{status:'reviewed_complete',fit_allowed:true,application_ready_allowed:true},integrity:{status:'pass'},readiness:{status:'strong_fit'},requirements:[{id:'R1',requirement:item.required_qualifications[0],evidence_match:'direct'}],coverage:{direct:1,missing:0,adjacent:0,transferable:0}}};
const raw=text=>({voice:'direct',length:'standard',paragraphs:[{id:'o',purpose:'opening',text,evidence_refs:[credential],requirement_refs:[item.required_qualifications[0]]},{id:'c',purpose:'closing',text:'I welcome the opportunity to discuss my application.',evidence_refs:[],requirement_refs:[]}]});
async function generate(document){const handler=createCoverLetterHandler({reviewContent:async({document})=>({document,applied:false,status:'not_tested_here'}),authenticate:async()=>({user:{id:'fixture'},supabase:{}}),getApiKey:()=> 'fixture',getOpenAIKey:()=>undefined,fetchImpl:async()=>({ok:true,json:async()=>({content:[{type:'tool_use',name:'return_evidence_first_cover_letter',input:document}]})})});const r={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(v){this.body=v;return this;}};await handler({method:'POST',headers:{authorization:'Bearer fixture'},body:{resume:source,customJob:item,length:'standard'}},r);return r;}
test('supported issuer wording passes generation, manual editing, readiness and export with one contract',async()=>{
 const response=await generate(raw(validClaims[0]));assert.equal(response.statusCode,200,JSON.stringify(response.body));
 const plan=createCoverLetterPlan(response.body.letter,context);
 const edited=updateCoverLetterParagraph(plan,'o','I have a Veterinary Assistant certificate from Example Community College.',context);assert.equal(edited.ok,true,edited.message);
 assert.equal(getCoverLetterReadiness(edited.plan,context).canExport,true);
 assert.equal(validateCoverLetterExportContext(createCoverLetterExportContext(edited.plan,context)).plan.contentHash,edited.plan.contentHash);
});
test('unsupported issuer remains blocked by generation, editing and export',async()=>{
 const bad=raw('I hold a Veterinary Assistant certificate from Another College.');
 assert.equal(validateApplicationDocument({kind:'cover-letter',document:bad,candidateCorpus:source}).valid,false);
 assert.equal((await generate(bad)).statusCode,422);
 const good=createCoverLetterPlan(raw(validClaims[0]),context);
 assert.equal(updateCoverLetterParagraph(good,'o',bad.paragraphs[0].text,context).ok,false);
 assert.throws(()=>createCoverLetterExportContext(createCoverLetterPlan(bad,context),context));
});
