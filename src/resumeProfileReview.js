import { reviewEditorialText } from './coverLetterWriting.js';
import { reviewResumeSummary, editorialContentTokens } from './resumeSummaryWriting.js';

export function reviewResumeProfile(resume, source = '') {
  return [...reviewEditorialText(resume?.profile || ''), ...reviewResumeSummary(resume, source)];
}

// A conservative acceptance floor for an optional rewrite, not a quality score.
// Empty/generic prose cannot win merely by producing fewer warnings or words.
export function hasUsefulProfileContext(resume, source = '') {
  const generic = new Set('professional results driven proven track record experienced experience extensive motivated dedicated skilled strong excellent capable specialist background work working role'.split(' '));
  const facts = new Set(editorialContentTokens(source).filter((word) => word.length > 2 && !generic.has(word)));
  const supported = new Set(editorialContentTokens(resume?.profile).filter((word) => facts.has(word)));
  return supported.size >= 3 && String(resume?.profile || '').trim().length >= 20;
}
