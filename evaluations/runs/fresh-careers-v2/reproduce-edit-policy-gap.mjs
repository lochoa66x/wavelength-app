// Read-only reproducer discovered after the frozen first-generation pass.
// Exit 1 means at least one expected validation outcome is still wrong.
import { freshCareerCases } from '../../fresh-careers-v2.mjs';
import { validateCoverLetterEdit } from '../../../src/coverLetterModel.js';
import { validateApplicationDocument } from '../../../src/applicationDocumentContract.js';

const candidate = freshCareerCases[9];
const original = 'I assisted performers with quick changes using rehearsed cues and recorded repairs needed after the show. Within the supervisor’s instructions, I hand-sewed replacement buttons and repaired loose hems; design alterations required the supervisor’s approval.';
const closing = 'I welcome the opportunity to discuss my wardrobe experience.';
const evidence = candidate.resume.split('\n').filter(line => line.startsWith('Assisted performers') || line.startsWith('Hand-sewed'));
const context = { baseResume: candidate.resume, item: { title: candidate.title, company: 'Example Repertory Stage' } };
const paragraph = { id: 'evidence', purpose: 'evidence', text: original, generatedText: original, evidenceRefs: evidence, requirementRefs: ['Complete minor repairs and escalate design changes'] };
const closingParagraph = { id: 'closing', purpose: 'closing', text: closing, generatedText: closing, evidenceRefs: [], requirementRefs: [] };
const cases = [
  { name: 'courtesy closing', expectedAllowed: true, original: closingParagraph, text: 'Thank you for considering my application. ' + closing },
  { name: 'reversed approval requirement', expectedAllowed: false, original: paragraph, text: original.replace('design alterations required the supervisor’s approval.', 'design alterations required no approval.') },
];
const results = cases.map(test => {
  const next = { ...test.original, text: test.text };
  const paragraphs = test.original.purpose === 'closing' ? [{ ...paragraph, purpose: 'opening' }, next] : [{ ...next, purpose: 'opening' }, closingParagraph];
  const edit = validateCoverLetterEdit(test.text, test.original, context);
  const contract = validateApplicationDocument({ kind: 'cover-letter', document: { length: 'standard', paragraphs }, candidateCorpus: candidate.resume });
  return { name: test.name, expectedAllowed: test.expectedAllowed, editAllowed: edit.ok, contractAllowed: contract.valid, editMessage: edit.message || null, contractIssues: contract.issues, matchesExpectation: edit.ok === test.expectedAllowed && contract.valid === test.expectedAllowed };
});
console.log(JSON.stringify(results, null, 2));
if (results.some(result => !result.matchesExpectation)) process.exitCode = 1;
