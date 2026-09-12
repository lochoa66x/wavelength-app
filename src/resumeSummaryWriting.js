// These are conservative editorial signals, never evidence or eligibility gates.
const STOP_WORDS = new Set('a an the i my we our you your and or in on at to of for with by from as is are was were be been have has had this that these those experience experienced professional approximately average monthly daily per'.split(' '));
const normalize = (text) => String(text || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
export const editorialSentences = (text) => String(text || '').split(/(?<=[.!?])\s+/).filter((sentence) => sentence.trim());
const tokens = (text) => (normalize(text).match(/\p{L}[\p{L}\p{N}]*/gu) || []).filter((word) => !STOP_WORDS.has(word));

export function repeatsContribution(text, example) {
  const numbers = (value) => String(value).match(/\b\d[\d,.]*(?:%)?/g) || [];
  const leftNumbers = numbers(text), rightNumbers = numbers(example);
  // Similar assignments with different explicit results are distinct evidence.
  if (leftNumbers.length && rightNumbers.length && !leftNumbers.some((value) => rightNumbers.includes(value))) return false;
  const left = tokens(text), right = tokens(example);
  const shorter = left.length <= right.length ? left : right;
  const longer = new Set(left.length <= right.length ? right : left);
  const unique = [...new Set(shorter)];
  if (unique.length < 6 || unique.filter((word) => longer.has(word)).length / unique.length < 0.8) return false;
  const pairs = new Set(left.slice(1).map((word, index) => `${left[index]} ${word}`));
  return right.slice(1).filter((word, index) => pairs.has(`${right[index]} ${word}`)).length >= 2;
}

export function reviewResumeSummary(resume, source = '') {
  const profile = String(resume?.profile || '');
  const sentences = editorialSentences(profile);
  const bullets = (resume?.experience || []).flatMap((entry) => entry.bullets || []).filter((bullet) => typeof bullet === 'string' && bullet.trim());
  const repeated = bullets.filter((bullet) => sentences.some((sentence) => repeatsContribution(sentence, bullet)));
  const exactCopy = sentences.some((sentence) => normalize(sentence).split(' ').length >= 8 && bullets.some((bullet) => normalize(sentence) === normalize(bullet)));
  const issues = [];
  if (repeated.length >= 2 || exactCopy) issues.push({ code: 'summary_repeats_experience', advice: 'Replace the retold experience bullets with one or two sentences identifying the candidate’s supported profession, work setting and distinctive focus. Keep assignments, quantities and outcomes in experience. Do not replace the repetition with generic praise.' });
  if (profile.trim().split(/\s+/).filter(Boolean).length > 60 || sentences.length > 2) issues.push({ code: 'summary_too_long', advice: 'Use one or two selective sentences, usually 20–45 words and no more than 60. A short source may need only one sentence. Do not inventory every tool or contribution.' });
  for (const phrase of ['high-volume', 'high volume', 'large-scale', 'large scale', 'fast-paced', 'fast paced']) {
    if (normalize(profile).includes(normalize(phrase)) && !normalize(source).includes(normalize(phrase))) {
      issues.push({ code: 'summary_unsubstantiated_scale', advice: 'Remove the added relative scale claim. Preserve supplied quantities in their experience bullets; do not label a workload high-volume, large-scale or fast-paced without source support.' });
      break;
    }
  }
  return issues;
}

export const RESUME_SUMMARY_INSTRUCTIONS = 'Write a selective professional profile, not a condensed experience section. Use one or two sentences, usually 20–45 words and never more than 60. Establish the candidate’s proven profession or level, relevant work setting, and one source-supported focus that distinguishes their background. A useful profile synthesizes that context; it does not retell a sequence of assignments. Leave employer-specific actions, metrics and results in experience bullets. Do not paraphrase two or more bullets, repeat the skills inventory, or add generic praise and unsupported relative scale such as high-volume. Preserve supervision, team membership and credential status. One factual sentence is enough for sparse evidence; do not pad it. Never turn the target job title into a qualification the candidate has not established.';
