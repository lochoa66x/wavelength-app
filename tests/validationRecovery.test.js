import test from 'node:test';
import { shapeTailoredResume } from '../api/_lib/resumeQuality.js';
import { containsSelfDisqualifyingCoverLetterLanguage } from '../src/coverLetterLanguage.js';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { comparisonCases } from '../evaluations/comparative-v1/cases.js';
import { candidateClaimIssues } from '../src/candidateClaims.js';
import { quantityFacts } from '../src/claimFacts.js';
import { sourceHistoryEntries, restoreEmptyHistoryFromSource, buildTailoringChangeLedger, buildAtsReview } from '../api/_lib/atsValidation.js';
import { validateApplicationDocument } from '../src/applicationDocumentContract.js';
import { createSafeResumeFallback } from '../api/_lib/safeResumeFallback.js';
import { findSemanticIntegrityIssues } from '../api/_lib/tailoringEvidence.js';

const fixture = id => comparisonCases.find(c => c.id === id);
const raw = (id,kind='resume',arm='pipeline') => JSON.parse(fs.readFileSync(new URL(`../evaluations/comparative-v1/raw/${id}-${arm}-${kind}-attempt-1.json`,import.meta.url)));
const first = (id,kind) => raw(id,kind).delivered.evaluationReport.events.find(e=>e.stage==='first_draft');
const issues = (text,refs,corpus=refs.join('\n')) => candidateClaimIssues(text,refs,{candidateCorpus:corpus});

for(const id of ['C02','C06']) test(`${id}: captured project-year paragraph retains its date and passes claim checks`,()=>{
 const paragraph=first(id,'letter').document.paragraphs.find(p=>p.text.includes('2025'));
 assert.deepEqual(candidateClaimIssues(paragraph.text,paragraph.evidence_refs,{candidateCorpus:fixture(id).resume}),[]);
 assert.ok(candidateClaimIssues(paragraph.text.replaceAll('2025','2024'),paragraph.evidence_refs,{candidateCorpus:fixture(id).resume}).length);
});
test('calendar years cannot authorize counts, durations or another employer/project',()=>{
 const refs=['Riverside Apartment Series | Example Photographer | 2025','Matched colour across adjoining rooms.'];
 for(const text of ['In the 2025 Riverside Apartment Series, I matched colour across adjoining rooms.','During a 2025 Riverside Apartment Series project, I matched colour across adjoining rooms.']) assert.deepEqual(issues(text,refs),[],text);
 for(const text of ['I completed 2025 projects.','I bring 2025 years of experience.','In the 2024 Riverside Apartment Series, I matched colour across adjoining rooms.','At Another Photographer in 2025, I matched colour across adjoining rooms.','In the 2025 Hillside Apartment Series, I matched colour across adjoining rooms.']) assert.ok(issues(text,refs).length,text);
 assert.deepEqual(issues('I completed 2025 projects.',['Completed 2025 projects.']),[]);
 assert.ok(issues('During 2025 projects, I matched colour.',['Project | Studio | 2025']).length);
 assert.ok(issues('In 2025, I matched colour.',['Completed 2025 projects.']).length);
 assert.equal(quantityFacts('Handled 2025 files per month.')[0].unit,'file');
 assert.ok(issues('During 2025 inspections, I recorded defects.',['Inspection Project | Studio | 2025']).length);
 assert.ok(issues('Handled 2025 files per hour.',['Handled 2025 files per month.']).length);
});
test('captured apprentice profile distinguishes a held certificate and supervised work',()=>{
 const profile=first('C03','resume').raw.profile;
 assert.deepEqual(issues(profile,fixture('C03').resume.split('\n')),[]);
 for(const text of ['I supervised a licensed plumbing crew.','I hold a current Working at Heights certificate.','I hold a Plumbing Techniques certificate and a First Aid certificate.']) assert.ok(issues(text,fixture('C03').resume.split('\n')).length,text);
 assert.deepEqual(issues('I supervised leak checks.',['Supervised leak checks with the apprentice crew.']),[]);
 assert.ok(issues('I supervised leak checks.',['Experience with supervised leak checks.']).length);
});
test('employment after a selected project has its own evidence and survives fallback',()=>{
 const c=fixture('C06'), headers=sourceHistoryEntries(c.resume);
 assert.deepEqual(headers.map(h=>h.role),['Freelance Photo Editor','Event Photo Assistant']);
 const resume=raw('C06').delivered.resume;
 const restored=restoreEmptyHistoryFromSource(resume,c.resume);
 assert.deepEqual(restored.experience.find(e=>e.role==='Event Photo Assistant').bullets,['Labelled memory cards, prepared equipment and organised contact sheets.']);
 const ledger=buildTailoringChangeLedger(restored,c.resume);
 assert.ok(ledger.filter(e=>e.role==='Event Photo Assistant').every(e=>e.citation_complete));
 const crossed=structuredClone(restored);crossed.experience.find(e=>e.role==='Event Photo Assistant').bullets=['Corrected white balance and vertical alignment without removing permanent room features.'];
 assert.ok(buildTailoringChangeLedger(crossed,c.resume).some(e=>e.role==='Event Photo Assistant'&&!e.citation_complete));
 const failed=buildAtsReview(crossed,c.resume,{keywords:[]},{analysis:{requirements:[]}});
 const safe=createSafeResumeFallback(crossed,failed,{});
 assert.ok(restoreEmptyHistoryFromSource(safe.resume,c.resume).experience.find(e=>e.role==='Event Photo Assistant').bullets.length);
});
test('project sections recover explicit new jobs, never project titles or courses',()=>{
 const c=fixture('C06');
 for(const heading of ['Selected Project','Selected Projects','Academic Project']) {
  const source=c.resume.replace('Selected Project',heading);
  assert.deepEqual(sourceHistoryEntries(source).map(h=>h.role),['Freelance Photo Editor','Event Photo Assistant']);
 }
 assert.deepEqual(sourceHistoryEntries('Selected Projects\nEvent Assistant Dashboard | Example College | 2024\nBuilt a course dashboard.\nEducation\nLaboratory Assistant diploma | College | 2025').map(h=>h.role),[]);
});
test('operational transition is accepted while career-change positioning remains flagged',()=>{
 const c=fixture('C04'), base=raw('C04').delivered.resume;
 const check=profile=>findSemanticIntegrityIssues({...base,profile},c.resume,{},c.job.title);
 assert.equal(check(first('C04','resume').raw.profile).unsupported_positioning.length,0);
 const operational='Front desk supervisor who coordinated the transition to online registration.';
 assert.equal(check(operational).unsupported_positioning.length,0);
 assert.equal(containsSelfDisqualifyingCoverLetterLanguage(operational),false);
 assert.equal(shapeTailoredResume({...base,profile:operational},{}).profile,operational);
 assert.ok(check('Front desk supervisor transitioning into a new career in client onboarding.').unsupported_positioning.length);
});
test('shared résumé contract rejects empty role content without relying on parser success',()=>{
 const document={name:'Alex Reed',profile:'Assistant with studio experience.',experience:[{role:'Studio Assistant',company:'Studio',dates:'2020 - 2022',bullets:[]}]};
 assert.equal(validateApplicationDocument({kind:'resume',document}).valid,false);
 document.experience[0].bullets=['Prepared equipment for the photographer.'];
 assert.equal(validateApplicationDocument({kind:'resume',document}).valid,true);
});
