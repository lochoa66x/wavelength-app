// These are conservative editorial signals, never evidence or eligibility gates.
const STOP_WORDS = new Set('a an the i my we our you your and or in on at to of for with by from as is are was were be been have has had this that these those experience experienced professional approximately average monthly daily per'.split(' '));
const normalize = (text) => String(text || '').normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
export const editorialSentences = (text) => String(text || '').split(/(?<=[.!?])\s+/).filter((sentence) => sentence.trim());
const tokens = (text) => (normalize(text).match(/\p{L}[\p{L}\p{N}]*/gu) || []).filter((word) => !STOP_WORDS.has(word));
const ACTION_FORMS = new Map([
  ['prepare', 'prepares', 'prepared', 'preparing'], ['process', 'processes', 'processed', 'processing'],
  ['record', 'records', 'recorded', 'recording'], ['reconcile', 'reconciles', 'reconciled', 'reconciling'],
  ['build', 'builds', 'built', 'building'], ['clean', 'cleans', 'cleaned', 'cleaning'],
  ['update', 'updates', 'updated', 'updating'], ['support', 'supports', 'supported', 'supporting'],
  ['translate', 'translates', 'translated', 'translating'], ['create', 'creates', 'created', 'creating'],
  ['plan', 'plans', 'planned', 'planning'], ['lead', 'leads', 'led', 'leading'],
  ['manage', 'manages', 'managed', 'managing'], ['repair', 'repairs', 'repaired', 'repairing'],
  ['install', 'installs', 'installed', 'installing'], ['coordinate', 'coordinates', 'coordinated', 'coordinating'],
].flatMap((forms) => forms.map((form) => [form, forms[0]])));
const actionKey = (word) => ACTION_FORMS.get(word) || word;

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
  const numberedRecap = repeated.some((bullet) => sentences.some((sentence) => {
    if (!repeatsContribution(sentence, bullet)) return false;
    const quantities = bullet.match(/\b\d[\d,.]*(?:%)?/g) || [];
    const profileQuantities = sentence.match(/\b\d[\d,.]*(?:%)?/g) || [];
    return quantities.some((quantity) => profileQuantities.includes(quantity));
  }));
  const exactCopy = sentences.some((sentence) => normalize(sentence).split(' ').length >= 8 && bullets.some((bullet) => normalize(sentence) === normalize(bullet)));
  const firstWord = (text) => actionKey(normalize(text).split(' ')[0]);
  const clauses = sentences.flatMap((sentence) => sentence.split(/\band\b|,/i));
  const actionRecap = clauses.some((clause) => bullets.some((bullet) => {
    if (firstWord(clause) !== firstWord(bullet)) return false;
    const sourceTokens = new Set(tokens(bullet).map(actionKey));
    return [...new Set(tokens(clause).map(actionKey))].filter((word) => sourceTokens.has(word)).length >= 3;
  }));
  const issues = [];
  const taskActions = profile.match(/\b(?:preparing|building|processing|reconciling|translating|creating|recording|discussing|supporting|cleaning|working|planning|developing|managing|leading|coordinating|installing|repairing|measuring|scheduling|picking|packing|updating|checking)\b/gi) || [];
  if (new Set(taskActions.map((word) => word.toLowerCase())).size >= 2 && /\band\b/i.test(profile)) {
    issues.push({ code: 'summary_task_list', advice: 'Remove the list of activities introduced as experience. State the profession, work setting or distinctive background instead; leave what the candidate did in the experience bullets.' });
  }
  if (sentences.some((sentence) => /^(?:brings?|background includes|experience includes|skills include)\b/i.test(sentence.trim()) && /\band\b/i.test(sentence) && tokens(sentence).length >= 6)) {
    issues.push({ code: 'summary_activity_inventory', advice: 'Replace the list of duties or skills with the candidate’s work setting or distinctive professional background. Choose one useful focus; leave the inventory in skills and experience. Use plain wording, not noun stacks.' });
  }
  const direction = profile.match(/\b([A-Z][a-z]+)-to-([A-Z][a-z]+)\b/);
  if (direction && new RegExp(`\\b${direction[1]}\\b[^.!?]{0,100}\\b(?:into|to) ${direction[2]}\\b`).test(profile.slice(direction.index + direction[0].length))) {
    issues.push({ code: 'summary_repeated_direction', advice: 'State the language direction once. Use the rest of the profile for a supported subject focus or professional background rather than explaining the same direction again.' });
  }
  if (repeated.length >= 2 || exactCopy || actionRecap || numberedRecap) issues.push({ code: 'summary_repeats_experience', advice: 'Replace the retold experience bullets with one or two sentences identifying the candidate’s supported profession, work setting and distinctive focus. Keep assignments, quantities and outcomes in experience. Do not replace the repetition with generic praise.' });
  if (profile.trim().split(/\s+/).filter(Boolean).length > 60 || sentences.length > 2) issues.push({ code: 'summary_too_long', advice: 'Use one or two selective sentences, usually 10–35 words and no more than 60. A short source may need only one sentence. Do not inventory every tool or contribution.' });
  for (const phrase of ['high-volume', 'high volume', 'large-scale', 'large scale', 'fast-paced', 'fast paced']) {
    if (normalize(profile).includes(normalize(phrase)) && !normalize(source).includes(normalize(phrase))) {
      issues.push({ code: 'summary_unsubstantiated_scale', advice: 'Remove the added relative scale claim. Preserve supplied quantities in their experience bullets; do not label a workload high-volume, large-scale or fast-paced without source support.' });
      break;
    }
  }
  return issues;
}

export const RESUME_SUMMARY_INSTRUCTIONS = 'Write a selective professional profile, not a condensed experience section. Prefer ONE plain sentence about the candidate’s proven profession or level, relevant work setting, and one distinctive source-supported background. Use a second sentence only if it adds a different useful dimension. Usually 10–35 words is enough; there is no minimum and the maximum is 60. Do not enumerate duties with Background includes, Brings, or a similar inventory opener. Leave employer-specific actions, metrics and results in experience, and tool lists in skills. Mention one central tool only when essential to the professional focus. State a language direction once. Use ordinary language instead of compressed noun stacks such as client-review incorporation. Do not paraphrase two or more bullets, add generic praise, or invent relative scale such as high-volume. Preserve supervision, team membership and credential status. Never turn the target job title into a qualification the candidate has not established.';

// Delete only a trailing duty catalogue when a substantial context phrase
// already stands on its own. The caller still validates the resulting résumé.
export function trimSummaryTaskList(profile) {
  const match = String(profile || '').match(/^([^.!?]+?)\s+and experience\b[\s\S]+$/i);
  if (!match || match[1].trim().split(/\s+/).length < 7) return '';
  return match[1].trim().replace(/[,;:]$/, '') + '.';
}
