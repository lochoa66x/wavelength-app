import test from 'node:test';
import assert from 'node:assert/strict';
import { reviewResumeSummary, repeatsContribution } from '../src/resumeSummaryWriting.js';
import { reviewCoverLetterWriting } from '../src/coverLetterWriting.js';
import { polishResumeSummary } from '../api/_lib/resumeSummaryPolish.js';
import { sourceHistoryEntries, restoreEmptyHistoryFromSource, buildAtsReview } from '../api/_lib/atsValidation.js';
import { liveCareerCases } from './fixtures/liveCareerCorpus.mjs';

const contexts = [
  'Bookkeeper with a background in small-business accounts and QuickBooks Online.',
  'Residential plumber with experience in occupied homes and an earlier plumbing apprenticeship.',
  'Finish carpenter with a residential renovation background and carpentry training.',
  'Dental receptionist with part-time practice experience and an earlier customer-service background in retail.',
  'Warehouse associate with experience in order fulfilment and stockroom operations.',
  'Early childhood educator with preschool-room experience and earlier supervised placements.',
  'Customer support representative with experience in customer service and support operations.',
  'French-to-English translator with a museum-text focus and an earlier background in arts publishing.',
  'Bicycle mechanic with seasonal workshop experience and a background in volunteer repair work.',
  'Data analysis intern with a statistics degree and experience in community research.',
];
function resumeFor(c) {
  const history = sourceHistoryEntries(c.baseResume);
  return restoreEmptyHistoryFromSource({ name: c.name, title: c.title, skills: [], experience: history.map((entry) => ({role: entry.role, company: entry.company, dates: entry.dates, bullets: []})) }, c.baseResume);
}

test('all ten careers distinguish an experience recap from a selective professional context', () => {
  liveCareerCases.forEach((c, index) => {
    const resume = resumeFor(c);
    const recap = { ...resume, profile: resume.experience[0].bullets.slice(0, 2).join(' ') };
    assert.ok(reviewResumeSummary(recap, c.baseResume).some((issue) => issue.code === 'summary_repeats_experience'), c.id);
    assert.deepEqual(reviewResumeSummary({ ...resume, profile: contexts[index] }, c.baseResume), [], c.id);
  });
});

test('bookkeeper paraphrase and unsubstantiated scale receive summary advice', () => {
  const c = liveCareerCases[0], resume = resumeFor(c);
  const profile = 'Bookkeeping professional with recent experience in QuickBooks Online and monthly bank account reconciliations. Processed high-volume supplier invoices, resolved duplicate invoice entries, and prepared monthly expense reports for an owner. Brings an accounting diploma and practical accounts support experience.';
  const issues = reviewResumeSummary({ ...resume, profile }, c.baseResume);
  assert.ok(issues.some((issue) => issue.code === 'summary_unsubstantiated_scale'));
  assert.ok(issues.some((issue) => issue.code === 'summary_too_long'));
  assert.ok(!reviewResumeSummary({ ...resume, profile: 'Bookkeeper in a high-volume invoice processing setting.' }, c.baseResume + '\nWorked in a high-volume invoice processing setting.').some((issue) => issue.code === 'summary_unsubstantiated_scale'));
});

test('shared occupation terminology alone does not make two contributions duplicates', () => {
  assert.equal(repeatsContribution('I configured SAP Finance posting rules at Cedar.', 'At Birch, I tested SAP Finance interfaces during the release.'), false);
  assert.equal(repeatsContribution('I reduced SAP integration defects during testing by 20% at Cedar.', 'I reduced SAP integration defects during testing by 40% at Birch.'), false);
  assert.equal(repeatsContribution('I translated French museum exhibition texts into English.', 'I translated French museum exhibition texts into English, averaging 8,000 source words per month.'), true);
});

test('the live translator profile cannot repeat its direction or disguise a skills list as a summary', () => {
  const c = liveCareerCases[7], resume = resumeFor(c);
  const issues = reviewResumeSummary({ ...resume, profile: 'French-to-English translator with freelance experience translating French museum exhibition texts into English. Brings terminology-management practice, client-review incorporation, and arts-publication editorial experience.' }, c.baseResume);
  assert.ok(issues.some((issue) => issue.code === 'summary_repeated_direction'));
  assert.ok(issues.some((issue) => issue.code === 'summary_activity_inventory'));
  assert.deepEqual(reviewResumeSummary({ ...resume, profile: 'French-to-English museum translator with an earlier background in arts publishing.' }, c.baseResume), []);
});

test('an analyst summary cannot paraphrase an achievement as a second profile sentence', () => {
  const c=liveCareerCases[9], resume=resumeFor(c);
  const context='Data Analysis Intern and Statistics graduate with experience preparing survey and attendance data for community-focused programmes.';
  assert.ok(reviewResumeSummary({...resume,profile:context+' Built a Power BI dashboard for programme coordinators and prepared SQL queries under supervisory review.'},c.baseResume).some((issue)=>issue.code==='summary_repeats_experience'));
  assert.deepEqual(reviewResumeSummary({...resume,profile:context},c.baseResume),[]);
});

test('a trailing analyst task list can be removed without another model call or any change to work history', async () => {
  const c=liveCareerCases[9], resume=resumeFor(c);
  resume.profile='Data Analysis Intern with a Bachelor of Science in Statistics and experience preparing SQL queries, working with survey-response data in Python, and building Power BI dashboards for programme coordinators.';
  assert.ok(reviewResumeSummary(resume,c.baseResume).some((issue)=>issue.code==='summary_task_list'));
  const result=await polishResumeSummary({resume,review:{status:'ready'},source:c.baseResume,generate:async()=>{throw Error('No extra generation needed');},validate:async(candidate)=>{assert.deepEqual(candidate.experience,resume.experience);return {status:'ready'};}});
  assert.equal(result.applied,true);
  assert.equal(result.resume.profile,'Data Analysis Intern with a Bachelor of Science in Statistics.');
});

test('application announcements are flagged across careers without banning ordinary first-person evidence', () => {
  for (const c of liveCareerCases) {
    for (const prefix of ['I am applying for', 'I’m applying for', 'I am writing to apply for', 'I would like to apply for']) {
      const result = reviewCoverLetterWriting([{ id: 'opening', purpose: 'opening', text: `${prefix} the ${c.title} role.` }]);
      assert.ok(result.issues.some((issue) => issue.code === 'formulaic_opening'), `${c.id}: ${prefix}`);
    }
    const text = 'I ' + resumeFor(c).experience[0].bullets[0].replace(/^./, (letter) => letter.toLowerCase());
    assert.ok(!reviewCoverLetterWriting([{ id: 'opening', purpose: 'opening', text }]).issues.some((issue) => issue.code === 'formulaic_opening'), c.id);
  }
});

test('a concrete opening is not padded with a second sentence defining the same work', () => {
  const text = 'I translate French museum exhibition texts into English as a freelance translator, averaging 8,000 source words per month. My work centers on rendering exhibition material in English for readers while working from French source text.';
  assert.ok(reviewCoverLetterWriting([{id:'o',purpose:'opening',text}]).issues.some((issue) => issue.code === 'restated_work_description'));
  assert.ok(!reviewCoverLetterWriting([{id:'o',purpose:'opening',text:'My work focuses on museum exhibition translation.'}]).issues.some((issue) => issue.code === 'restated_work_description'));
});

test('a repeated opening example is detected in complete letters and targeted opening revisions', () => {
  const opening = { id: 'o', purpose: 'opening', text: 'I translated French museum exhibition texts into English.' };
  const evidence = { id: 'e', purpose: 'evidence', text: 'I translated French museum exhibition texts into English, averaging 8,000 source words per month.' };
  const full = reviewCoverLetterWriting([opening, evidence]);
  assert.ok(full.issues.some((issue) => issue.paragraphId === 'o' && issue.code === 'opening_repeats_evidence'));
  assert.ok(full.issues.some((issue) => issue.paragraphId === 'e' && issue.code === 'opening_repeats_evidence'));
  const partial = reviewCoverLetterWriting([opening], 'short', { partial: true, existingDraft: { paragraphs: [opening, evidence] } });
  assert.ok(partial.issues.some((issue) => issue.code === 'opening_repeats_evidence'));
  assert.ok(partial.issues.every((issue) => issue.paragraphId === 'o'));
  const bodyRevision = reviewCoverLetterWriting([evidence], 'short', { partial: true, existingDraft: { paragraphs: [opening, evidence] } });
  assert.ok(bodyRevision.issues.some((issue) => issue.paragraphId === 'e' && issue.code === 'opening_repeats_evidence'));
});

test('summary polish changes only the profile after full validation and skips a good profile', async () => {
  const c = liveCareerCases[3], resume = resumeFor(c);
  resume.profile = resume.experience[0].bullets.slice(0, 2).join(' ');
  let calls = 0, checks = 0;
  const revised = await polishResumeSummary({ resume, source: c.baseResume, review: { status: 'review' }, targetTitle: c.title,
    generate: async () => { calls++; return { profile: contexts[3], title: 'Invented director', experience: [] }; },
    validate: async (candidate) => { checks++; assert.equal(candidate.experience, resume.experience); assert.equal(candidate.title, resume.title); return { status: 'ready' }; },
  });
  assert.equal(calls, 1); assert.equal(checks, 1); assert.equal(revised.applied, true);
  assert.deepEqual(revised.resume, { ...resume, profile: contexts[3] });
  const unchanged = await polishResumeSummary({ resume: revised.resume, review: revised.review, source: c.baseResume, generate: async () => { throw Error('Must not call provider'); } });
  assert.equal(unchanged.applied, false);
  assert.equal(unchanged.resume, revised.resume);
});

test('summary polish preserves the checked original on provider failure, repetition, or new unsupported metrics', async () => {
  const c = liveCareerCases[0], resume = resumeFor(c);
  resume.profile = resume.experience[0].bullets.slice(0, 2).join(' ');
  for (const generate of [async () => { throw Error('Timeout'); }, async () => ({profile: resume.profile}), async () => ({profile: 'Bookkeeper who processed 9000 invoices per hour.'})]) {
    const result = await polishResumeSummary({ resume, review: {status:'review'}, source:c.baseResume, generate, validate: async (candidate) => buildAtsReview(candidate, c.baseResume, { keywords: [] }) });
    assert.equal(result.applied, false);
    assert.equal(result.resume, resume);
  }
});
