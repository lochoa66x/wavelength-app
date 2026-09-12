import assert from 'node:assert/strict';
import test from 'node:test';
import {copyDocumentText} from '../src/documentClipboard.js';
import {reviewEditorialText} from '../src/coverLetterWriting.js';
import {authenticatedJsonPost} from '../src/authenticatedRequest.js';
import {createResumePackage} from '../src/resumeModel.js';
import {sourceHistoryEntries, restoreEmptyHistoryFromSource, buildTailoringChangeLedger, buildAtsReview} from '../api/_lib/atsValidation.js';
import {liveCareerCases} from './fixtures/liveCareerCorpus.mjs';
import {safeCoverLetterFilename,coverLetterToPlainText,createCoverLetterPlan} from '../src/coverLetterModel.js';
import {claimMeaningIssues} from '../src/documentIntegrity.js';
import {organizeResumeSections} from '../src/resumeOrganization.js';
import {resumeProfessionalLinks,resumeIdentityFromText} from '../src/resumeIdentity.js';
import {structuredPostingRequirementInventory,sanitizeTailoringAnalysis} from '../api/_lib/tailoringEvidence.js';

test('analyst querying and cleaning receive separate source-backed credit without treating SQL alone as data cleaning',()=>{
  const c=liveCareerCases[9];
  const inventory=structuredPostingRequirementInventory(c.job);
  assert.ok(inventory.some(r=>r.requirement==='SQL experience'));
  assert.ok(inventory.some(r=>r.requirement==='data-cleaning experience'));
  const posting={status:'complete',fit_allowed:true,application_ready_allowed:true};
  const review=sanitizeTailoringAnalysis({},c.baseResume,posting,[],[],inventory);
  assert.equal(review.requirements.find(r=>r.requirement==='SQL experience').evidence_match,'direct');
  assert.equal(review.requirements.find(r=>r.requirement==='data-cleaning experience').evidence_match,'direct');
  assert.notEqual(review.requirements.find(r=>/^validate /i.test(r.requirement)).evidence_match,'missing');
  const sqlOnly=sanitizeTailoringAnalysis({},'Prepared SQL queries and checked results with the supervising analyst.',posting,[],[],inventory);
  assert.equal(sqlOnly.requirements.find(r=>r.requirement==='data-cleaning experience').evidence_match,'missing');
  const negative=sanitizeTailoringAnalysis({},'Did not prepare SQL queries. Never cleaned survey data.',posting,[],[],inventory);
  assert.ok(negative.requirements.every(r=>r.evidence_match==='missing'));
});

test('late candidate portfolio links survive both documents without collecting employer URLs or date ranges',()=>{
  const c=liveCareerCases[7];
  const resume=organizeResumeSections({name:c.name,candidate:{professionalLinks:[]},professional_links:[]},c.baseResume);
  assert.equal(createResumePackage(resume).document.candidate.professionalLinks[0].url,'https://example.com/camille-translation');
  const plan=createCoverLetterPlan({paragraphs:[]},{baseResume:c.baseResume,resumeData:{name:c.name},item:c.job});
  assert.match(plan.candidate.contactLine,/https:\/\/example.com\/camille-translation/);
  assert.doesNotMatch(resumeIdentityFromText(c.baseResume).contact,/2021|2026|Self-employed/);
  assert.deepEqual(resumeProfessionalLinks('Employer website: https://example.com\nPortfolio: javascript:alert(1)\nPortfolio: https://user:password@example.com'),[]);
});

test('skills do not repeat certificates already displayed in their own section',()=>{
  const result=organizeResumeSections({certifications:[{name:'Early childhood educator registration',status:'active'},{name:'First Aid and CPR certificate',status:'active'}],skills:['Early childhood educator registration','First Aid and CPR','Play-based activity planning']});
  assert.deepEqual(result.skills,['Play-based activity planning']);
  assert.equal(result.certifications.length,2);
});

test('copied letters include the date and subject from the rendered letter',()=>{
  const plain=coverLetterToPlainText({candidate:{fullName:'Aisha Rahman'},target:{company:'Example Smile Clinic',jobTitle:'Dental Receptionist'},createdAt:'2026-09-11T16:00:00Z',salutation:'Dear Hiring Team,',paragraphs:[{text:'I scheduled appointments for three dentists.'}],signoff:'Sincerely,'});
  assert.match(plain,/September 11, 2026/);
  assert.match(plain,/Re: Dental Receptionist/);
  assert.doesNotMatch(plain,/undefined|Invalid Date/);
});

test('total classroom staffing cannot become additional colleagues alongside the candidate',()=>{
  const source='Planned play-based activities for a preschool room with 16 children and two educators.';
  assert.ok(claimMeaningIssues('Planned activities for 16 children alongside two educators.',[source]).some(x=>/total group size/.test(x)));
  assert.equal(claimMeaningIssues(source,[source]).length,0);
  assert.equal(claimMeaningIssues('Planned activities alongside two educators.',['Planned activities alongside two educators.']).length,0);
});

test('preliminary letter downloads remain distinguishable from the matching resume',()=>{
  assert.equal(safeCoverLetterFilename({candidate:{fullName:'Aisha Rahman'},target:{jobTitle:'Dental Receptionist'}},'docx',{preliminary:true}),'Aisha-Rahman-Dental-Receptionist-cover-letter-preliminary.docx');
});

test('all ten live careers have bounded, profession-independent source history',()=>{
  for(const c of liveCareerCases){
    const headers=sourceHistoryEntries(c.baseResume);
    assert.equal(headers.length,2,c.id);
    assert.ok(headers[0].role,c.id);
    const repaired=restoreEmptyHistoryFromSource({name:c.name,experience:headers.map(h=>({role:h.role,company:h.company,dates:h.dates,bullets:[]}))},c.baseResume);
    assert.equal(repaired.experience[0].bullets.length,3,c.id);
    assert.equal(repaired.experience[1].bullets.length,1,c.id);
    const ledger=buildTailoringChangeLedger(repaired,c.baseResume,{requirements:[]});
    assert.ok(ledger.every(b=>b.citation_complete && b.source_role),c.id);
    assert.ok(repaired.experience.every(e=>e.bullets.every(b=>!/^Education:|^Training:|^Certifications:|^Skills:|^Project:/.test(b))),c.id);
  }
});

test('dental source examples cannot silently disappear or migrate to a retail role',()=>{
  const c=liveCareerCases[3];
  const headers=sourceHistoryEntries(c.baseResume);
  const resume={name:c.name,title:c.title,experience:headers.map(h=>({role:h.role,company:h.company,dates:h.dates,bullets:[]}))};
  const review=buildAtsReview(resume,c.baseResume,{keywords:[]});
  assert.equal(review.missing_history.length,2);
  assert.match(review.missing_history[0].reason,/statements are missing/);
  const repaired=restoreEmptyHistoryFromSource(resume,c.baseResume);
  assert.match(repaired.experience[0].bullets[0],/^Scheduled appointments for three dentists/);
  assert.match(repaired.experience[0].bullets[2],/office manager to review/);
  assert.match(repaired.experience[1].bullets[0],/^Answered customer questions/);
  assert.equal(buildAtsReview(repaired,c.baseResume,{keywords:[]}).missing_history.length,0);
});

test('document copy rejects unavailable or denied clipboard instead of claiming success',async()=>{
  await assert.rejects(copyDocumentText('Current document',{}),/unavailable/);
  await assert.rejects(copyDocumentText('Current document',{writeText:async()=>{throw new Error('Permission denied');}}),/Permission denied/);
  let saved;
  const clipboard={async writeText(text){assert.equal(this,clipboard);saved=text;}};
  await copyDocumentText('Élodie Roy\nFour bank accounts monthly.',clipboard);
  assert.equal(saved,'Élodie Roy\nFour bank accounts monthly.');
});

const session = (token='old',id='same-user') => ({data:{session:{access_token:token,user:{id}}},error:null});
const response = (status,data={}) => ({status,ok:status===200,json:async()=>data});
test('expired application request refreshes once and preserves its body and cancellation signal',async()=>{
  const calls=[]; let refreshCount=0; const controller=new AbortController();
  const auth={getSession:async()=>session(),refreshSession:async()=>{refreshCount++;return session('new');}};
  const data=await authenticatedJsonPost('/api/job-intake',{text:'Original posting'},{auth,signal:controller.signal,fetchImpl:async(path,options)=>{calls.push({path,...options});return response(calls.length===1?401:200,{brief:'ok'});}});
  assert.equal(data.brief,'ok'); assert.equal(refreshCount,1); assert.equal(calls.length,2);
  assert.equal(calls[0].body,calls[1].body); assert.equal(calls[1].signal,controller.signal);
  assert.equal(calls[1].headers.Authorization,'Bearer new');
});
test('authentication recovery never retries generation failures or loops on rejected refreshes',async()=>{
  for(const status of [403,422,500,504]){
    let calls=0,refreshCount=0;
    const auth={getSession:async()=>session(),refreshSession:async()=>{refreshCount++;return session('new');}};
    await assert.rejects(authenticatedJsonPost('/api/tailor',{}, {auth,fetchImpl:async()=>{calls++;return response(status,{error:'Original error'});}}),/Original error/);
    assert.equal(calls,1); assert.equal(refreshCount,0);
  }
  let calls=0; const auth={getSession:async()=>session(),refreshSession:async()=>session('new')};
  await assert.rejects(authenticatedJsonPost('/api/tailor',{}, {auth,fetchImpl:async()=>{calls++;return response(401);}}),/Sign in again/);
  assert.equal(calls,2);
});
test('cancelled and switched-account requests cannot replay private input',async()=>{
  for(const mode of ['cancel','switch']){
    let calls=0; const controller=new AbortController();
    const auth={getSession:async()=>session(),refreshSession:async()=>{if(mode==='cancel')controller.abort();return session('new',mode==='switch'?'different-user':'same-user');}};
    await assert.rejects(authenticatedJsonPost('/api/cover-letter',{resume:'Private input'},{auth,signal:controller.signal,fetchImpl:async()=>{calls++;return response(401);}}));
    assert.equal(calls,1);
  }
});
test('a refreshed session from another request is reused without another refresh',async()=>{
  let reads=0,calls=0;
  const auth={getSession:async()=>session(reads++?'new':'old'),refreshSession:async()=>{throw Error('Unnecessary refresh');}};
  await authenticatedJsonPost('/api/tailor',{}, {auth,fetchImpl:async()=>response(++calls===1?401:200)});
  assert.equal(calls,2);
});
test('held journeyperson plumber certificates are recognized but unfinished and expired ones are not',()=>{
  for(const suffix of ['', ' — expired',' — in progress',' — not held']){
    const p=createResumePackage({name:'Mateo Silva',title:'Residential Plumber',profile:'Installed and repaired piping in homes.',certifications:[{name:'Journeyperson plumber certificate'+suffix}],experience:[{role:'Residential Plumber',company:'Example',dates:'2018 - 2026',bullets:['Installed water supply piping in occupied homes.']},{role:'Plumbing Apprentice',company:'Example',dates:'2014 - 2018',bullets:['Assisted with fixture installation.']}]},{item:{title:'Residential Plumber'}});
    assert.equal(p.classification.missingTradeCredentials.includes('plumbing licence'),Boolean(suffix));
    if(!suffix)assert.equal(p.classification.tradeProfileType,'regulated-trade-professional');
  }
});
test('older helper history does not demote an experienced carpenter, while current helpers remain helpers',()=>{
  const base={name:'Nora Chen',title:'Finish Carpenter',profile:'Installed trim and cabinetry in homes.',experience:[{role:'Finish Carpenter',company:'Example',dates:'2020 - 2026',bullets:['Installed trim in homes.']},{role:'Carpentry Helper',company:'Example',dates:'2017 - 2020',bullets:['Prepared materials.']}]};
  assert.notEqual(createResumePackage(base,{item:{title:'Finish Carpenter'}}).classification.tradeProfileType,'apprentice-helper');
  const helper={...base.experience[1],bullets:['Assisted with trim installation in homes under supervision.']};
  assert.equal(createResumePackage({...base,title:'Carpentry Helper',experience:[helper]},{item:{title:'Carpentry Helper'}}).classification.tradeProfileType,'apprentice-helper');
});

test('live bookkeeper posting echoes receive editorial advice without rejecting ordinary work descriptions',()=>{
  for(const sentence of [
    'This work addresses the supplier invoice processing responsibility in your posting.',
    'I would bring that reporting experience to the monthly expense reporting work described for this position.',
    'I repaired piping, supporting the residential service work described in the posting.',
    'I measured cabinetry, matching the role’s cabinetry and measurement responsibilities.',
  ]) assert.ok(reviewEditorialText(sentence).some(i=>i.code==='posting_echo'));
  for(const sentence of [
    'I process approximately 120 supplier invoices per month and resolve duplicate invoice entries.',
    'I prepare monthly expense reports for the owner.',
    'I documented job descriptions and updated reporting procedures.',
  ]) assert.equal(reviewEditorialText(sentence).some(i=>i.code==='posting_echo'),false);
});
