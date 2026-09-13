import { editorialContentTokens } from './resumeSummaryWriting.js';

const sectionLabel = /^(?:education|training|professional training|certifications?|skills|languages|portfolio|selected projects|projects|professional experience|experience)$/i;
const contextHeading = /\|.*\b(?:19|20)\d{2}\b/;
const detail = /\b(?:using|against|before|after|within|under|approved|approval|required|when|unless|combined|per|each|so that|to preserve|while)\b/i;
const generic = new Set('experience ability work support role required qualification responsibility example skills company seeks responsibilities'.split(' '));

// These are exact source excerpts for selection, never newly inferred facts.
// A heading bounds an example; adjacent employers/projects must not be merged.
export function buildWritingEvidenceBrief(catalog = [], posting = '') {
  const target = new Set(editorialContentTokens(posting).filter(token => !generic.has(token)));
  const blocks = [];
  let section = 'experience', current = null;
  for (const entry of catalog) {
    const excerpt = String(entry?.excerpt || '').trim();
    if (sectionLabel.test(excerpt)) { section = excerpt.toLowerCase(); current = null; continue; }
    if (/https?:|@/.test(excerpt) || !excerpt || /^\[/.test(excerpt)) continue;
    if (contextHeading.test(excerpt)) {
      if (/education|training|certification|language|skill/.test(section)) { current = null; continue; }
      current = { context: { source_id: entry.id, excerpt }, details: [] };
      blocks.push(current); continue;
    }
    if (!current || excerpt.split(/\s+/).length < 7 || /^(?:keywords|location|employment type):/i.test(excerpt)) continue;
    const tokens = [...new Set(editorialContentTokens(excerpt))];
    const relevance = tokens.filter(token => target.has(token)).length;
    current.details.push({ source_id: entry.id, excerpt, processOrConstraint: detail.test(excerpt), relevance });
  }
  return blocks.map((block, order) => {
    const details = [...block.details].sort((a,b) => (b.relevance + (b.processOrConstraint ? 2 : 0)) - (a.relevance + (a.processOrConstraint ? 2 : 0))).slice(0,4);
    return { ...block, details, order, score: Math.max(0,...details.map(d => d.relevance)) + details.filter(d => d.processOrConstraint).length };
  }).filter(block => block.details.length).sort((a,b) => b.score-a.score || a.order-b.order).slice(0,2)
    .map(({context,details}) => ({context,details:details.map(({source_id,excerpt,processOrConstraint}) => ({source_id,excerpt,processOrConstraint}))}));
}

export const WRITING_BRIEF_INSTRUCTIONS = 'Use this brief to choose evidence before writing. Each block is a separate employer or project: do not combine its identity, dates or results with another block. Select the principal need from the posting and develop the relevant work from one block, including an available process, decision or constraint. Connect actions by their actual shared work object; use chronology only when the source states it. A second block is optional and must add a different useful contribution. These excerpts are suggestions for selection, not extra evidence or mandatory content. The full source catalog remains authoritative. Preserve exact source IDs and material qualifiers. Do not print the brief, labels or reasoning in the document.';
