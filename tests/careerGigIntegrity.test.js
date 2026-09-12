import {findSemanticIntegrityIssues} from '../api/_lib/tailoringEvidence.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import {careerGigCases} from './fixtures/careerGigCorpus.mjs';
import {candidateClaimIssues,credentialEvidenceIssues} from '../src/candidateClaims.js';
import {createCoverLetterHandler} from '../api/cover-letter.js';
import {createCoverLetterPlan,updateCoverLetterParagraph,getCoverLetterReadiness,createCoverLetterExportContext,validateCoverLetterExportContext,coverLetterToPlainText} from '../src/coverLetterModel.js';
import {createCoverLetterDocxBlob} from '../src/coverLetterDocx.js';
import {createCoverLetterPdfBlob} from '../src/coverLetterPdf.js';
import {pendingApplicationConfirmations} from '../src/applicationConfirmations.js';
import {getResumeExportReadiness,getResumeExportNotice} from '../src/resumeReadiness.js';
import {reviewCoverLetterWriting} from '../src/coverLetterWriting.js';
import {buildWritingReview} from '../api/_lib/resumeWriting.js';
import {removeApplicationNotes} from '../api/_lib/resumeQuality.js';
import {createResumePackage,buildResumeRenderPlan} from '../src/resumeModel.js';

function context(c) {
  const requirements=c.analysis.requirements;
  return {baseResume:c.baseResume,resumeData:c.candidate,item:c.job,atsReview:{...c.analysis,
    posting_readiness:{status:'reviewed_complete',fit_allowed:true,application_ready_allowed:true},
    integrity:{status:'pass'},coverage:Object.fromEntries(['direct','adjacent','transferable','missing'].map(k=>[k,requirements.filter(r=>r.evidence_match===k).length]))}};
}
async function generate(c,raw,{regenerate=false,existingDraft}={}) {
  const handler=createCoverLetterHandler({authenticate:async()=>({user:{id:'fictional-career-regression'},supabase:{}}),getApiKey:()=> 'fixture',getOpenAIKey:()=>undefined,
    fetchImpl:async()=>({ok:true,json:async()=>({content:[{type:'tool_use',name:'return_evidence_first_cover_letter',input:raw}]})})});
  const res={statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;}};
  await handler({method:'POST',headers:{authorization:'Bearer fixture'},body:{resume:c.baseResume,customJob:c.job,voice:'direct',length:'standard',...(regenerate?{regenerateParagraph:'evidence',existingDraft}: {})}},res);
  return res;
}
for(const c of careerGigCases) {
  test(`${c.id}: truthful letter and paragraph regeneration retain evidence and export authorization`,async()=>{
    const response=await generate(c,c.letter);
    assert.equal(response.statusCode,200,JSON.stringify(response.body));
    const ctx=context(c),plan=createCoverLetterPlan(response.body.letter,ctx);
    assert.equal(getCoverLetterReadiness(plan,ctx).canExport,true);
    const authorized=createCoverLetterExportContext(plan,ctx);
    assert.equal(validateCoverLetterExportContext(authorized).plan.contentHash,plan.contentHash);
    const raw={...c.letter,paragraphs:[c.letter.paragraphs.find(p=>p.id==='evidence')]};
    const regenerated=await generate(c,raw,{regenerate:true,existingDraft:plan});
    assert.equal(regenerated.statusCode,200,JSON.stringify(regenerated.body));
    const edited=updateCoverLetterParagraph(plan,'evidence',plan.paragraphs.find(p=>p.id==='evidence').text,ctx);
    assert.equal(edited.ok,true,edited.message);
  });
  const extras=c.id==='G09'?[{id:'minimal-negation',text:'I did administer medication.',refs:[c.candidate.experience[0].bullets[2]]}]
    :c.id==='G07'?[{id:'reused-numeral',text:'I delivered 30 tutoring sessions per month for 30 secondary-school students.',refs:[c.candidate.experience[0].bullets[0]]}]:[];
  for(const attack of [...c.attacks,...extras])test(`${c.id} ${attack.id}: false claim blocked in generation, regeneration, edit, restore, PDF and DOCX`,async()=>{
    assert.ok(candidateClaimIssues(attack.text,attack.refs,{candidateCorpus:c.baseResume}).length,'Must reject the actual claim, not an unrelated readiness error');
    const raw=structuredClone(c.letter),paragraph=raw.paragraphs.find(p=>p.id==='evidence');
    Object.assign(paragraph,{text:attack.text,evidence_refs:attack.refs});
    const ctx=context(c),plan=createCoverLetterPlan(c.letter,ctx),before=JSON.stringify(plan);
    assert.equal((await generate(c,raw)).statusCode,422);
    assert.equal((await generate(c,{...raw,paragraphs:[paragraph]},{regenerate:true,existingDraft:plan})).statusCode,422);
    const edit=updateCoverLetterParagraph(plan,'evidence',attack.text,ctx);
    assert.equal(edit.ok,false);assert.equal(JSON.stringify(plan),before);
    const restored=createCoverLetterPlan(raw,ctx);
    assert.equal(getCoverLetterReadiness(restored,ctx).meaningChanged,true);
    assert.throws(()=>createCoverLetterExportContext(restored,ctx));
    const stale={...createCoverLetterExportContext(plan,ctx),plan:restored};
    assert.throws(()=>validateCoverLetterExportContext(stale));
    await assert.rejects(()=>createCoverLetterPdfBlob(stale));
    await assert.rejects(()=>createCoverLetterDocxBlob(stale));
  });
}

test('generic measured nouns, time units and word/digit paraphrases preserve meaning',()=>{
  const pairs=[
    ['I repaired twenty-four watches per day.','Repaired 24 watches per day.'],
    ['I maintained four looms each week.','Maintained 4 looms per week.'],
    ['I provided care for 6 patients per shift.','Provided care for six patients per shift.'],
    ['I delivered 30 one-hour sessions per month.','Delivered thirty one-hour sessions per month.'],
    ['I delivered images within 7 business days.','Delivered images within seven business days.']
  ];
  for(const [claim,source] of pairs)assert.deepEqual(candidateClaimIssues(claim,[source]),[],claim);
  for(const claim of ['I repaired 24 clocks per day.','I repaired 24 watches per hour.'])assert.ok(candidateClaimIssues(claim,[pairs[0][1]]).length,claim);
  assert.ok(candidateClaimIssues('I delivered images within 7 days.',[pairs[4][1]]).length);
  assert.ok(candidateClaimIssues('I delivered 60 images per customer.',['Delivered 60 images per event.']).length);
});

test('team attribution and action polarity survive small edits',()=>{
  const team='Prepared 80 meals during a dinner shift as part of a kitchen team.';
  assert.ok(candidateClaimIssues('I independently prepared 80 meals during a dinner shift.',[team]).length);
  assert.deepEqual(candidateClaimIssues('I prepared 80 meals during a dinner shift as part of a kitchen team.',[team]),[]);
  assert.ok(candidateClaimIssues('I administered medication.',["I didn't administer medication."]).length);
  assert.deepEqual(candidateClaimIssues('I did not administer medication.',['Followed feeding instructions; did not administer medication.']),[]);
  assert.deepEqual(candidateClaimIssues('During supervised clinical placements, I assisted with patient education.',['Assisted with patient education during supervised clinical placements.']),[]);
  assert.ok(candidateClaimIssues('I supervised clinical staff and managed patient education.',['Assisted with patient education during supervised clinical placements.']).length);
});

test('compound credentials retain AND/OR and individual status in either order',()=>{
  const sources=['First Aid certificate — active','Refrigerant handling certificate — expired'];
  for(const requirement of ['Current First Aid certificate and current refrigerant handling certificate','Current refrigerant handling certificate and current First Aid certificate'])assert.ok(credentialEvidenceIssues(requirement,sources).length);
  assert.deepEqual(credentialEvidenceIssues('Current refrigerant handling certificate or current First Aid certificate',sources),[]);
  assert.deepEqual(credentialEvidenceIssues('Current refrigerant handling certificate and current First Aid certificate',['Refrigerant handling certificate — active','First Aid certificate — current']),[]);
  assert.deepEqual(candidateClaimIssues('I hold a current First Aid certificate and my refrigerant handling certificate expired.',sources),[]);
  assert.ok(candidateClaimIssues('I hold a current refrigerant handling certificate and my First Aid certificate expired.',sources).length);
  assert.ok(credentialEvidenceIssues('Current orbital welding certificate',['Orbital welding certificate preparation; certification not held']).length);
  assert.deepEqual(credentialEvidenceIssues('Current orbital welding certificate',['Orbital welding certificate — active']),[]);
});

test('assurances require source support even with an unrelated negative clause',()=>{
  assert.ok(candidateClaimIssues('I did not administer medication and I carry full liability insurance.',['Did not administer medication.']).length);
  assert.ok(candidateClaimIssues('I am available every weekend and can start immediately.',['I am available every weekend.']).length);
  assert.ok(candidateClaimIssues('I have passed a current background check.',['Recorded customer access instructions.']).length);
  assert.deepEqual(candidateClaimIssues('I am available every weekend.',['Available every weekend.']),[]);
  assert.deepEqual(candidateClaimIssues('I carry full liability insurance.',['Full liability insurance.']),[]);
});

test('required availability is actionable and preliminary; preferences are not blockers',()=>{
  const c=careerGigCases[3],ctx=context(c);
  assert.equal(pendingApplicationConfirmations(ctx.atsReview).length,1);
  assert.equal(getResumeExportReadiness(c.candidate,ctx.atsReview).state,'preliminary');
  assert.match(getResumeExportNotice(c.candidate,ctx.atsReview).message,/weekend/i);
  const plan=createCoverLetterPlan(c.letter,ctx);
  assert.equal(getCoverLetterReadiness(plan,ctx).state,'preliminary');
  assert.match(getCoverLetterReadiness(plan,ctx).message,/Confirm before applying/);
  const confirmed=structuredClone(ctx.atsReview);confirmed.requirements=confirmed.requirements.map(r=>({...r,evidence_match:'direct'}));
  assert.equal(pendingApplicationConfirmations(confirmed).length,0);
  assert.equal(pendingApplicationConfirmations({requirements:[{priority:'preferred',evidence_match:'missing',requirement:'Available every weekend'}]}).length,0);
  assert.equal(pendingApplicationConfirmations(context(careerGigCases[9]).atsReview).length,0);
});

test('writing advice recognizes occupations without a verb allowlist or invented ownership',()=>{
  const bullets=['Diagnosed cooling faults.','Photographed small events.','Tutored algebra.','Walked dogs individually.','Watered nursery plants.','Washed produce.','Responsible for preparing route sheets.'];
  const resume={profile:'',experience:[{role:'Worker',company:'Example',dates:'2022 - 2025',bullets}]};
  const review=buildWritingReview(resume,bullets.join('\n'));
  assert.equal(review.issues.some(i=>i.type==='unrecognized_opener'),false);
  assert.equal(JSON.stringify(review).includes('Managed preparing'),false);
  for(const title of ['Optical instrument repairer','Pet sitter','Landscape crew member','Registered nurse']){
    const bad=reviewCoverLetterWriting([{id:'p',text:`${title} with experience in routine care.`}]);
    assert.ok(bad.issues.some(i=>i.code==='sentence_fragment'),title);
    const good=reviewCoverLetterWriting([{id:'p',text:`I am an ${title.toLowerCase()} with experience in routine care.`}]);
    assert.equal(good.issues.some(i=>i.code==='sentence_fragment'),false,title);
  }
});

test('application notes stay out of prose while source history and portfolio survive',()=>{
  assert.equal(removeApplicationNotes('Worked weekday afternoons; weekend availability is not established.'),'Worked weekday afternoons.');
  assert.equal(removeApplicationNotes('Weekend availability is not established.'),'');
  for(const text of ['Followed feeding instructions; did not administer medication.','Prepared logs. Recorded visits.','Worked part-time on weekday afternoons.'])assert.equal(removeApplicationNotes(text),text);
  const c=careerGigCases[7],plan=createCoverLetterPlan(c.letter,context(c));
  assert.match(coverLetterToPlainText(plan),/https:\/\/example.com\/lea-portfolio/);
  for(const i of [0,1,5]){
    const render=buildResumeRenderPlan(createResumePackage(careerGigCases[i].candidate));
    const ids=render.sections.map(s=>s.id);
    assert.ok(ids.indexOf('certifications')>=0);
    assert.ok(ids.indexOf('certifications')<ids.indexOf('experience'));
  }
});


test('supported personal claims use the same generation and edit contract',async()=>{
  const c=structuredClone(careerGigCases[3]);
  const confirmed='I am available immediately on weekends.';
  c.baseResume+='\n'+confirmed;
  Object.assign(c.letter.paragraphs[1],{text:confirmed,evidence_refs:[confirmed]});
  const response=await generate(c,c.letter);
  assert.equal(response.statusCode,200,JSON.stringify(response.body));
  const ctx=context(c),plan=createCoverLetterPlan(response.body.letter,ctx);
  assert.equal(updateCoverLetterParagraph(plan,'evidence',confirmed,ctx).ok,true);
  assert.equal(getCoverLetterReadiness(plan,ctx).canExport,true);
  assert.ok(candidateClaimIssues('I was referred by Morgan.',['I was referred by Alex.']).length);
  assert.deepEqual(candidateClaimIssues('I was referred by Morgan.',['Referred by Morgan.']),[]);
});


test('a credential gap never deletes a real title, and a mere mention never grants it',()=>{
  const c=careerGigCases[2],analysis={fit_assessment:{path:'transferable'},requirements:[]};
  assert.deepEqual(findSemanticIntegrityIssues(c.candidate,c.baseResume,analysis,c.job.title).unsupported_positioning,[]);
  const absent='Sofia Example\nMaintenance Assistant\nAssisted an HVAC Service Technician with cleaning.';
  assert.ok(findSemanticIntegrityIssues(c.candidate,absent,analysis,c.job.title).unsupported_positioning.length);
});
