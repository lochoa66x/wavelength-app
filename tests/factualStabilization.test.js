import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {comparisonCases} from '../evaluations/comparative-v1/cases.js';
import {freshCases} from '../evaluations/validation-recovery-v1/fresh-cases.js';
import {candidateClaimIssues} from '../src/candidateClaims.js';
import {validateApplicationDocument} from '../src/applicationDocumentContract.js';
import {sourceHistoryEntries,buildAtsReview} from '../api/_lib/atsValidation.js';
import {recoverSelectedProjects} from '../api/_lib/resumeProjectRecovery.js';

const fixture=id=>[...comparisonCases,...freshCases].find(c=>c.id===id);
const captured=id=>JSON.parse(fs.readFileSync(new URL('../evaluations/validation-recovery-v1/raw/'+id+'-resume-attempt-1.json',import.meta.url)));
const observed='Tracked a duplicated settlement batch to a repeated upload and tested the revised checklist with the manager. Unresolved exceptions fell from nine to two over the next three reviews; the manager approved adjustments.';
const problems=(text,source=observed)=>candidateClaimIssues(text,[source],{candidateCorpus:source});

test('observed outcomes cannot acquire personal or implied candidate causality',()=>{
 for(const claim of [
  'Reduced unresolved exceptions from nine to two over the next three reviews.',
  'I reduced unresolved exceptions from nine to two over the next three reviews.',
  'Tracked the duplicated batch and reduced unresolved exceptions from nine to two.',
  'Tracked the duplicated batch, reducing unresolved exceptions from nine to two.',
  'My work reduced unresolved exceptions from nine to two.',
  'Helped reduce unresolved exceptions from nine to two.',
 ])assert.ok(problems(claim).some(x=>/outcome|attribut|caus/i.test(x)),claim);
});
test('neutral results, explicit achievements and literal trade tasks remain valid',()=>{
 for(const [claim,source] of [
  ['Unresolved exceptions fell from nine to two over the next three reviews.',observed],
  ['I reduced unresolved exceptions from nine to two.','Reduced unresolved exceptions from nine to two.'],
  ['Cut copper and PEX pipe to the marked lengths.','Measured and cut copper and PEX pipe to the marked lengths.'],
  ['The team reduced unresolved exceptions from nine to two.','The team reduced unresolved exceptions from nine to two.'],
  ['I helped reduce unresolved exceptions from nine to two.','Helped reduce unresolved exceptions from nine to two.'],
 ])assert.deepEqual(problems(claim,source),[],claim);
 assert.ok(problems('I reduced unresolved exceptions from nine to two.','The team reduced unresolved exceptions from nine to two.').length);
 assert.ok(problems('Reduced unresolved exceptions from nine to two.','Reduced invoice errors from nine to two. Unresolved exceptions fell from nine to two.').length);
});
test('C02 source project is not an employment entry; real jobs and source boundaries survive',()=>{
 const entries=sourceHistoryEntries(fixture('C02').resume);
 assert.deepEqual(entries.map(e=>e.role),['Accounting Assistant','Accounts Payable Clerk']);
 const recovered=recoverSelectedProjects(captured('C02').delivered.resume,fixture('C02').resume);
 assert.deepEqual(recovered.experience.map(e=>e.role),['Accounting Assistant','Accounts Payable Clerk']);
 assert.equal(recovered.projects.length,1);
 assert.equal(recovered.projects[0].name,'Month-end Improvement');
 assert.match(recovered.projects[0].bullets.join(' '),/differences fell from 18 to 5/);
 assert.match(recovered.projects[0].bullets.join(' '),/controller approved/);
 assert.ok(!JSON.stringify(recovered.projects).includes('Checked invoice coding'));
 assert.deepEqual(recoverSelectedProjects(recovered,fixture('C02').resume),recovered);
});
test('clear job titles and short unfamiliar engagements do not become projects',()=>{
 const source='Project Manager | Example Co | 2025\nManaged a systems project.\nContinuous Improvement Manager | Other Co | 2024\nMaintained the project plan.\nLuthier | Workshop Co | 2023\nRepaired instruments.';
 assert.deepEqual(sourceHistoryEntries(source).map(e=>e.role),['Project Manager','Continuous Improvement Manager','Luthier']);
});
for(const id of ['C02','R07'])test(id+': captured factual defect is blocked by the shared contract',()=>{
 const c=fixture(id),r=captured(id);
 assert.equal(validateApplicationDocument({kind:'resume',document:r.delivered.resume,candidateCorpus:c.resume}).valid,false);
 const review=buildAtsReview(r.delivered.resume,c.resume,{keywords:[]},{analysis:r.delivered.tailoring_analysis,historyEvidence:c.resume});
 assert.equal(review.integrity.status,'blocked');
});

test('indirect causality and qualitative outcomes keep the source actor',()=>{
 for(const claim of ['The revised checklist reduced unresolved exceptions from nine to two.','This reduced unresolved exceptions from nine to two.','Achieved a reduction in unresolved exceptions from nine to two.'])
  assert.ok(problems(claim).length,claim);
 assert.ok(problems('Improved customer satisfaction.','Customer satisfaction improved after the pilot.').length);
 assert.ok(problems('I reduced unresolved exceptions from nine to two.','The revised checklist reduced unresolved exceptions from nine to two.').length);
});
test('ownership from another employer cannot authorize the observed outcome',()=>{
 const corpus='Analyst | Cedar | 2022 - 2024\nReduced unresolved exceptions from nine to two.\nAnalyst | Birch | 2024 - 2026\nUnresolved exceptions fell from nine to two.';
 assert.ok(candidateClaimIssues('At Birch, I reduced unresolved exceptions from nine to two.',corpus.split('\n'),{candidateCorpus:corpus}).length);
});
test('source project recovery restores the result instead of accepting empty or stripped evidence',()=>{
 const c=fixture('R07'),r=captured('R07').delivered.resume;
 for(const project of [{...r.projects[0],bullets:[]},{...r.projects[0],bullets:['Tested a revised handover checklist with the manager.']}]){
  const stripped={...r,projects:[project]};
  assert.equal(validateApplicationDocument({kind:'resume',document:stripped,candidateCorpus:c.resume}).valid,false);
  const fixed=recoverSelectedProjects(stripped,c.resume);
  assert.match(JSON.stringify(fixed.projects),/exceptions fell from nine to two/);
  assert.match(JSON.stringify(fixed.projects),/manager approved adjustments/);
 }
});
test('project classification preserves single-year jobs, company-first rows and dates',()=>{
 const source='Accounts Clerk | Cedar | 2024\nChecked invoices.\nCedar | Month-end Improvement | 2024\nUnresolved differences fell from 18 to 5; the controller approved adjustments.\nProduction Helper | Workshop | 2020 - 2023\nLabelled trays and checked job numbers.';
 const entries=sourceHistoryEntries(source);
 assert.deepEqual(entries.map(e=>[e.role,e.dates]),[['Accounts Clerk','2024'],['Production Helper','2020 - 2023']]);
 const r=recoverSelectedProjects({experience:[]},source);
 assert.equal(r.projects[0].name,'Month-end Improvement');
 assert.ok(!JSON.stringify(r.projects).includes('Labelled trays'));
});

test('an employer with a project-like name cannot turn its employees into projects',()=>{
 const source='Accounts Clerk | Reconciliation Project | 2025\nChecked the invoice register.\nLuthier | Heritage Restoration Project | 2024\nRepaired and tuned instruments.';
 assert.deepEqual(sourceHistoryEntries(source).map(e=>e.role),['Accounts Clerk','Luthier']);
 assert.equal(recoverSelectedProjects({experience:[]},source).projects,undefined);
});
