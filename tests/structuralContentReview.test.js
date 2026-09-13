import test from 'node:test';
import assert from 'node:assert/strict';
import { sourceHistoryEntries, restoreEmptyHistoryFromSource, buildAtsReview } from '../api/_lib/atsValidation.js';
import { organizeResumeSections } from '../src/resumeOrganization.js';
import { resumeProfessionalLinks } from '../src/resumeIdentity.js';
import { validateApplicationDocument } from '../src/applicationDocumentContract.js';
import { credentialEvidenceIssues } from '../src/candidateClaims.js';
import { academicStatusIssues } from '../src/academicClaims.js';
import { contentReviewTool, reviewApplicationContent, credibleEditorialRevision } from '../api/_lib/contentEditorialReview.js';
import { createCoverLetterHandler } from '../api/cover-letter.js';
import { freshCareerCases } from '../evaluations/fresh-careers-v1.mjs';

const source = 'Alex Reed\nalex@example.com\nFibre Artisan | Loom House | 2022 - 2026\nWove custom panels to measured patterns and logged material batches.\nRelief Hand | County Works | 2020 - 2022\nSorted reusable fittings and labelled storage boxes for the next shift.\nTraining\nMachine workshop | Learning House | 2021';
const entries = [
 { role: 'Fibre Artisan', company: 'Loom House', dates: '2022 - 2026', bullets: [] },
 { role: 'Relief Hand', company: 'County Works', dates: '2020 - 2022', bullets: [] },
];
test('unlisted structured roles and unfamiliar action verbs restore only their own source facts', () => {
 assert.deepEqual(sourceHistoryEntries(source).map(r => r.role), ['Fibre Artisan','Relief Hand']);
 const result = restoreEmptyHistoryFromSource({experience:entries}, source);
 assert.deepEqual(result.experience[0].bullets, ['Wove custom panels to measured patterns and logged material batches.']);
 assert.deepEqual(result.experience[1].bullets, ['Sorted reusable fittings and labelled storage boxes for the next shift.']);
 assert.ok(buildAtsReview({name:'Alex Reed',contact:'alex@example.com',experience:entries},source,{keywords:[]}).missing_history.length);
});
test('unclassified dated rows bound history even when they are not valid job headers', () => {
 const base='Designer | Cedar Studio | 2020 - 2024\nDrew installation plans for the studio team.\nDegree workshop | Another Place | 2024\nWorked with software in a training exercise.';
 const restored=restoreEmptyHistoryFromSource({experience:[{role:'Designer',company:'Cedar Studio',dates:'2020 - 2024',bullets:[]}]},base);
 assert.deepEqual(restored.experience[0].bullets,['Drew installation plans for the studio team.']);
});
test('qualification sections never become employment when the course contains a role title', () => {
 assert.deepEqual(sourceHistoryEntries('Education\nLaboratory Assistant diploma | Cedar College | 2023\nTraining\nManager workshop | Cedar House | 2024'),[]);
});
for(const c of freshCareerCases) test('post-holdout regression: source history remains complete for '+c.id,()=>{
 const headers=sourceHistoryEntries(c.resume);
 assert.equal(headers.length,2);
 const result=restoreEmptyHistoryFromSource({experience:headers.map(h=>({role:h.role,company:h.company,dates:h.dates,bullets:[]}))},c.resume);
 assert.equal(result.experience[0].bullets.length,3);
 assert.ok(result.experience[1].bullets.length>=1);
});
test('one qualification has one section, with renewals and status preserved',()=>{
 const line='First Aid certificate | Learning House | 2025, current';
 const q={name:'First Aid certificate',provider:'Learning House',dates:'2025, current'};
 const result=organizeResumeSections({training:[q],education:[{degree:q.name,institution:q.provider,dates:q.dates}],safety_certifications:[line,'First Aid certificate | Learning House | 2021, expired']});
 assert.equal(result.training.length,1);assert.equal(result.education.length,0);
 assert.deepEqual(result.safety_certifications,['First Aid certificate | Learning House | 2021, expired']);
 assert.deepEqual(organizeResumeSections(result),result);
});
test('a labelled portfolio on the next line survives, unrelated project URLs do not',()=>{
 assert.deepEqual(resumeProfessionalLinks('Portfolio\nhttps://example.com/audio\nExperience\nClient project https://unrelated.example.com'),[{label:'Portfolio',url:'https://example.com/audio'}]);
 assert.deepEqual(resumeProfessionalLinks('Portfolio\nhttps://user:password@example.com'),[]);
});
test('current credential metadata passes and cannot confer status on a different expired credential',()=>{
 assert.deepEqual(credentialEvidenceIssues('Current First Aid certificate','First Aid certificate | Centre | 2025, current'),[]);
 assert.ok(credentialEvidenceIssues('Current CPR certificate','First Aid certificate | Centre | 2025, current\nCPR certificate | Centre | 2023, expired').length);
});
const degree='B.Sc. in Geography | Cedar University | 2026';
test('academic status cannot be inferred from the year or borrowed from another qualification',()=>{
 assert.ok(academicStatusIssues('I am completing a B.Sc. in Geography.',[degree]).length);
 assert.deepEqual(academicStatusIssues('I am completing a B.Sc. in Geography.',[degree+', in progress']),[]);
 assert.ok(academicStatusIssues('I hold a B.Sc. in Geography.',[degree+', in progress']).length);
 assert.deepEqual(academicStatusIssues('I completed sample measurements.',[source]),[]);
 assert.ok(academicStatusIssues('I am pursuing a degree in Geography.',[degree,'Diploma in Music | Cedar | in progress']).length);
 assert.equal(validateApplicationDocument({kind:'resume',document:{profile:'I am completing a B.Sc. in Geography.'},candidateCorpus:degree}).valid,false);
});
const letter={length:'standard',salutation:'Dear Hiring Team,',signoff:'Sincerely,',paragraphs:[
 {id:'o',purpose:'opening',text:'I wove custom panels to measured patterns and logged material batches.',evidence_refs:['Wove custom panels to measured patterns and logged material batches.'],requirement_refs:['Prepare panels to measured patterns.']},
 {id:'c',purpose:'closing',text:'I welcome the opportunity to discuss this work.',evidence_refs:[],requirement_refs:[]},
]};
test('factual closing citations are required through the same letter contract',()=>{
 assert.equal(validateApplicationDocument({kind:'cover-letter',document:letter}).valid,true);
 const factual=structuredClone(letter); factual.paragraphs[1].text='I hold a current First Aid certificate.';
 assert.equal(validateApplicationDocument({kind:'cover-letter',document:factual}).valid,false);
 factual.paragraphs[1].evidence_refs=['First Aid certificate | Centre | 2025, current'];
 assert.equal(validateApplicationDocument({kind:'cover-letter',document:factual}).valid,true);
 factual.paragraphs[1].text='I am completing a B.Sc. in Geography.';factual.paragraphs[1].evidence_refs=[degree];
 assert.equal(validateApplicationDocument({kind:'cover-letter',document:factual}).valid,false);
});
const scores=n=>({relevance:n,useful_detail:n,document_purpose:n,selection:n,natural_writing:n});
const original={profile:'I wove custom panels to measured patterns and logged material batches.',experience:entries};
const revised={profile:'Fibre artisan with custom panel workshop experience and an earlier background in reusable fittings.'};
const review={decision:'revise',before:scores(2),after:scores(3),changes:[{original_excerpt:original.profile,source_excerpt:'Fibre Artisan | Loom House | 2022 - 2026',benefit:'Establishes professional setting instead of repeating the task list.'}],document:revised};
test('editorial review validates a useful revision and preserves all other résumé fields',async()=>{
 let checks=0;
 const result=await reviewApplicationContent({kind:'profile',document:original,source,posting:'Custom panels',generate:async()=>review,validate:async candidate=>{checks++;assert.equal(candidate.experience,entries);return {valid:true,validation:{status:'ready'}};}});
 assert.equal(result.applied,true);assert.equal(checks,1);assert.equal(result.document.profile,revised.profile);
});
test('shortening or self-awarded scores alone cannot authorize an editorial revision',async()=>{
 for(const invalid of [{...review,changes:[]},{...review,after:scores(2)},{...review,changes:[{...review.changes[0],source_excerpt:'Invented source facts are not acceptable.'}]},{...review,document:{profile:original.profile}}]){
  assert.equal(credibleEditorialRevision(invalid,{kind:'profile',original,source}),false);
 }
});
test('editorial timeout or unsupported rewrite preserves the already checked original',async()=>{
 for(const generate of [async()=>{throw Error('timeout');},async()=>review]){
  const result=await reviewApplicationContent({kind:'profile',document:original,source,generate,validate:async()=>({valid:false})});
  assert.equal(result.applied,false);assert.equal(result.document,original);
 }
});
test('letter editorial cannot change ids or purposes even with a favourable review',async()=>{
 const altered={...review,changes:[{original_excerpt:letter.paragraphs[0].text,source_excerpt:'Wove custom panels to measured patterns and logged material batches.',benefit:'Develops the source-supported process and setting.'}],document:{...letter,paragraphs:[{...letter.paragraphs[0],id:'new',text:'Custom panel work involves measured patterns.'},letter.paragraphs[1]]}};
 const result=await reviewApplicationContent({kind:'cover-letter',document:letter,source,generate:async()=>altered,validate:async()=>{throw Error('must not validate wrong structure');}});
 assert.equal(result.status,'rejected_structure');
});
test('production letter handler invokes content review even when mechanical writing checks pass',async()=>{
 const calls=[];
 const handler=createCoverLetterHandler({authenticate:async()=>({user:{id:'qa'}}),getApiKey:()=> 'test',getOpenAIKey:()=>undefined,
  fetchImpl:async(_url,options)=>{const req=JSON.parse(options.body);const name=req.tools[0].name;calls.push(name);const input=name==='return_content_editorial_review'?{decision:'keep',before:scores(3),after:scores(3),changes:[],document:letter}:letter;return {ok:true,json:async()=>({content:[{type:'tool_use',name,input}]})};}});
 const res={statusCode:0,setHeader(){},status(code){this.statusCode=code;return this;},json(body){this.body=body;return this;}};
 await handler({method:'POST',headers:{authorization:'Bearer qa'},body:{resume:source,customJob:{title:'Panel Artisan',company:'Example Craft',description:'Prepare panels to measured patterns.',responsibilities:['Prepare panels to measured patterns.'],required_qualifications:['Workshop experience']}}},res);
 assert.equal(res.statusCode,200);assert.deepEqual(calls,['return_evidence_first_cover_letter','return_content_editorial_review']);assert.equal(res.body.validation.editorialStatus,'kept');
});
