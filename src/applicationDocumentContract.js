import { coverLetterLengthPolicy, countCoverLetterWords } from './coverLetterControls.js';
import { claimMeaningIssues, contributionEditIssue, hasInternalDocumentLanguage } from './documentIntegrity.js';
import { containsSelfDisqualifyingCoverLetterLanguage } from './coverLetterLanguage.js';
import { createResumePackage, stableHash } from './resumeModel.js';
import { academicStatusIssues } from './academicClaims.js';

// This is a content contract, not an assessment of persuasiveness. Generation,
// edits, saved-draft readiness and every exporter call the same entry point.
// Provider citation resolution, source/identity hashes and authorization remain
// boundary checks; passing this contract never replaces those protections.
export const DOCUMENT_CONTRACT_VERSION = 4;
export const COVER_LETTER_PARAGRAPH_LIMIT = 2400;
export const COVER_LETTER_PARAGRAPH_MIN = 20;
const refs = (paragraph, camel, snake) => paragraph?.[camel] ?? paragraph?.[snake] ?? [];
const strings = (value) => typeof value === 'string' ? [value] : Array.isArray(value) ? value.flatMap(strings) : value && typeof value === 'object' ? Object.values(value).flatMap(strings) : [];

export function candidateDocumentCorpus(baseResume = '', candidateEvidence = []) {
  return [baseResume, ...(Array.isArray(candidateEvidence) ? candidateEvidence : []).filter((entry) => entry?.user_confirmed === true && !entry.declined)
    .map((entry) => [entry.answer, entry.context, entry.employer_or_project, entry.approximate_date].filter(Boolean).join('\n'))].filter(Boolean).join('\n');
}

export function resumeReviewedContentHash(value) {
  const { target, ...content } = createResumePackage(value).document;
  return stableHash(content, 'reviewed-resume');
}

export function mergeCoverLetterReplacement(draft, replacement, paragraphId) {
  const original = draft?.paragraphs?.find((entry) => entry.id === paragraphId);
  if (!original || !replacement || replacement.id !== paragraphId || replacement.purpose !== original.purpose) return null;
  return { ...draft, paragraphs: draft.paragraphs.map((entry) => entry.id === paragraphId ? replacement : entry) };
}

export function validateApplicationDocument({ kind, document, candidateCorpus = '', assessment } = {}) {
  const issues = [];
  const add = (code, message, paragraphId) => issues.push({ code, message, ...(paragraphId ? { paragraphId } : {}) });
  if (kind === 'cover-letter') {
    const paragraphs = Array.isArray(document?.paragraphs) ? document.paragraphs : [];
    const policy = coverLetterLengthPolicy(document?.length);
    if (paragraphs.length < 2 || paragraphs.length > policy.maxParagraphs) add('paragraph_count', `Use two to ${policy.maxParagraphs} paragraphs for this letter length.`);
    if (paragraphs[0]?.purpose !== 'opening' || paragraphs.at(-1)?.purpose !== 'closing'
      || paragraphs.slice(1, -1).some((entry) => entry.purpose !== 'evidence')) {
      add('paragraph_order', 'Use one opening, distinct evidence paragraphs when useful, and one closing, in that order.');
    }
    if (countCoverLetterWords(paragraphs) > policy.maxWords) add('letter_length', `The complete letter exceeds the ${policy.maxWords}-word ${policy.id} limit.`);
    const seen = new Set();
    for (const paragraph of paragraphs) {
      const id = paragraph?.id;
      const text = String(paragraph?.text || '').trim();
      const evidence = refs(paragraph, 'evidenceRefs', 'evidence_refs');
      const requirements = refs(paragraph, 'requirementRefs', 'requirement_refs');
      if (!id || seen.has(id)) add('paragraph_id', 'Every paragraph needs a unique, stable id.', id);
      seen.add(id);
      if (text.length < COVER_LETTER_PARAGRAPH_MIN || text.length > COVER_LETTER_PARAGRAPH_LIMIT) add('paragraph_length', `Keep a complete paragraph between ${COVER_LETTER_PARAGRAPH_MIN} and ${COVER_LETTER_PARAGRAPH_LIMIT} characters; no text is truncated.`, id);
      if (paragraph.purpose !== 'closing' && (!Array.isArray(evidence) || !evidence.some((entry) => typeof entry === 'string' && entry.trim()))) add('candidate_citation', 'This paragraph needs candidate evidence citations.', id);
      if (paragraph.purpose !== 'closing' && (!Array.isArray(requirements) || !requirements.some((entry) => typeof entry === 'string' && entry.trim()))) add('posting_citation', 'This paragraph needs posting requirement citations.', id);
      if (paragraph.purpose === 'closing' && /\b(?:certificat(?:e|ion)|licen[cs]e|degree|diploma|bachelor|master(?:'s| of)|Ph\.?D|B\.?Sc|M\.?Sc|portfolio|available|availability)\b|https?:\/\//i.test(text)
        && (!Array.isArray(evidence) || !evidence.length)) add('candidate_citation', 'Factual claims in a closing need candidate evidence citations too.', id);
      if (hasInternalDocumentLanguage(text)) add('internal_language', 'Remove internal application terminology.', id);
      if (/(?:\[|<)(?:hiring manager|name|company|address|date|insert|unknown)(?:\]|>)/i.test(text)) add('placeholder', 'Replace unresolved placeholder language.', id);
      if (/\b(?:renowned|esteemed|world[- ]class|industry[- ]leading|impressed by|admire your|dream company|thrilled|passionate|excited)\b/i.test(text)) add('unsupported_motivation', 'Remove unsupported motivation or employer flattery.', id);
      if (containsSelfDisqualifyingCoverLetterLanguage(text)) add('gap_language', 'Remove self-disqualifying or gap-focused positioning.', id);
      const safeEvidence = Array.isArray(evidence) ? evidence : [];
      for (const message of claimMeaningIssues(text, safeEvidence, { candidateCorpus })) add('claim_meaning', message, id);
      const contribution = contributionEditIssue(text, safeEvidence);
      if (contribution) add('claim_meaning', contribution, id);
    }
  } else if (kind === 'resume') {
    const content = document?.document || document || {};
    if (candidateCorpus) for (const value of strings({ profile: content.profile ?? content.summary, education: content.education }))
      for (const message of academicStatusIssues(value, [candidateCorpus])) add('academic_status', message);
    if (strings(content).some(hasInternalDocumentLanguage)) add('internal_language', 'Remove internal application terminology from the résumé.');
    if (assessment?.integrity?.status === 'blocked') add('evidence_integrity', 'Resolve the résumé evidence integrity issues before exporting.');
    if (assessment?.writing?.status === 'blocked') add('contribution_language', 'Correct unsupported contribution wording before exporting.');
    if (assessment?.writing_review && !assessment?.document_contract) add('stale_assessment', 'This older résumé needs a fresh evidence review before export. Regenerate or recheck the draft.');
    if (assessment?.document_contract && (assessment.document_contract.version !== DOCUMENT_CONTRACT_VERSION || assessment.document_contract.contentHash !== resumeReviewedContentHash(document))) add('stale_assessment', 'The résumé or validation rules changed after its evidence review. Recheck this draft before exporting.');
    // Missing fit/posting evidence allows a clearly labelled preliminary file.
    // A known false claim does not become exportable by changing its label.
  } else add('document_kind', 'A supported application document kind is required.');
  return { version: DOCUMENT_CONTRACT_VERSION, valid: issues.length === 0, issues };
}
