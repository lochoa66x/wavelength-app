import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { reviewApplicationContent, isVerifiedRedundancyRemoval } from '../api/_lib/contentEditorialReview.js';
import { reviewCoverLetterWriting } from '../src/coverLetterWriting.js';
import { validateApplicationDocument } from '../src/applicationDocumentContract.js';
import { buildWritingEvidenceBrief } from '../src/writingEvidenceBrief.js';
import { freshCareerCases } from '../evaluations/fresh-careers-v2.mjs';
const captured=JSON.parse(fs.readFileSync(new URL('./fixtures/editorialCapturedWardrobe.json',import.meta.url),'utf8'));
const source=freshCareerCases.find(c=>c.id==='F10').resume;

test('captured one-point editorial improvement reaches the validated document',async()=>{
 assert.equal(isVerifiedRedundancyRemoval(captured.original,captured.review.document),true);
 let validated=0;
 const result=await reviewApplicationContent({kind:'cover-letter',document:captured.original,source,generate:async()=>captured.review,validate:async document=>{validated++;return validateApplicationDocument({kind:'cover-letter',document,candidateCorpus:source});}});
 assert.equal(result.applied,true,JSON.stringify(result));
 assert.equal(result.selectionBasis,'verified_redundancy_removal');
 assert.equal(validated,1);
 assert.doesNotMatch(result.document.paragraphs[0].text,/This work followed/);
 assert.equal(result.document.paragraphs[1].text,captured.original.paragraphs[1].text);
});

test('redundancy removal can pass with unchanged scores but still needs the factual contract',async()=>{
 const review={...captured.review,after:captured.review.before};
 const okay=await reviewApplicationContent({kind:'cover-letter',document:captured.original,source,generate:async()=>review,validate:async()=>({valid:true})});
 assert.equal(okay.applied,true);
 const blocked=await reviewApplicationContent({kind:'cover-letter',document:captured.original,source,generate:async()=>review,validate:async()=>({valid:false})});
 assert.equal(blocked.applied,false); assert.equal(blocked.status,'rejected_validation');
});

test('small-edit exception cannot remove a distinct constraint, quantity, example, or closing',()=>{
 for(const sentence of ['Design changes required supervisor approval.','This work required keeping costumes below 4 degrees.','This work followed a documented two-person inspection before handover.']) {
  const original=structuredClone(captured.original);original.paragraphs[0].text=editorialBase()+' '+sentence;
  const candidate=structuredClone(original);candidate.paragraphs[0].text=editorialBase();
  assert.equal(isVerifiedRedundancyRemoval(original,candidate),false,sentence);
 }
 const dropExample={...captured.review.document,paragraphs:captured.review.document.paragraphs.filter(p=>p.purpose!=='evidence')};
 assert.equal(isVerifiedRedundancyRemoval(captured.original,dropExample),false);
 const altered=structuredClone(captured.review.document);altered.paragraphs.at(-1).text='I am available immediately for this position.';
 assert.equal(isVerifiedRedundancyRemoval(captured.original,altered),false);
});
function editorialBase(){return captured.review.document.paragraphs[0].text;}

test('a kept high-self-score letter retains observable repetition advice',async()=>{
 const result=await reviewApplicationContent({kind:'cover-letter',document:captured.original,source,generate:async()=>({...captured.review,decision:'keep'}),validate:async()=>{throw Error('keep needs no rewrite');}});
 assert.equal(result.status,'needs_review');assert.equal(result.reviewNeeded,true);
 assert.ok(result.issues.some(i=>i.code==='restated_work_description'));
});

test('source-selection brief preserves employer boundaries, exact excerpts and references',()=>{
 const catalog=[{id:'C1',excerpt:'Workshop Technician | Cedar Works | 2022 - 2026'}, {id:'C2',excerpt:'Checked panels against approved drawings before supervisor review.'},{id:'C3',excerpt:'Project Assistant | Birch Studio | 2020 - 2022'},{id:'C4',excerpt:'Recorded panel dimensions and sent discrepancies to the project lead.'},{id:'C5',excerpt:'Education'},{id:'C6',excerpt:'Engineering diploma | West College | 2020'}];
 const brief=buildWritingEvidenceBrief(catalog,'Check panels against drawings and record dimensions.');
 assert.equal(brief.length,2);
 assert.deepEqual(brief.map(b=>b.context.source_id),['C1','C3']);
 assert.deepEqual(brief.map(b=>b.details.map(d=>d.source_id)),[['C2'],['C4']]);
 for(const block of brief)for(const row of [block.context,...block.details])assert.equal(row.excerpt,catalog.find(e=>e.id===row.source_id).excerpt);
 assert.equal(JSON.stringify(brief).includes('Engineering diploma'),false);
});

test('empty or contact-only evidence does not manufacture an example',()=>{
 assert.deepEqual(buildWritingEvidenceBrief([],'Lead an implementation.'),[]);
 assert.deepEqual(buildWritingEvidenceBrief([{id:'C1',excerpt:'alex@example.com'},{id:'C2',excerpt:'https://example.com/portfolio'}],'Portfolio experience'),[]);
});

test('a distinct follow-up condition is retained by the writing advice',()=>{
 const text='I checked costume labels against the wardrobe plot. This work required keeping costume labels separate until the supervisor approved design changes.';
 assert.ok(!reviewCoverLetterWriting([{id:'o',purpose:'opening',text}]).issues.some(i=>i.code==='restated_work_description'));
});
