// Deterministic checks for consequential claims, shared by API, editor and export.
// An exact citation establishes a source, not unrestricted permission to rewrite it.
const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[’‘]/g, "'").replace(/[^\p{L}\p{N}%]+/gu, ' ').trim();
const sentences = value => String(value || '').split(/\n|(?<=[.!?])\s+/).map(x => x.trim()).filter(Boolean);
import {normalizeClaimNumbers,quantityFacts,sameQuantity,polarityIssues,assuranceIssues} from './claimFacts.js';
export {normalizeClaimNumbers} from './claimFacts.js';
const quantities = value => [...normalizeClaimNumbers(value).matchAll(/\b\d+(?:[,.]\d+)*(?:\s*%|\+)?/g)].map(m => m[0].replace(/[\s,]/g, ''));
const words = value => normalize(value).split(' ').filter(x => x.length > 3 && !/^(?:with|that|this|from|have|work|team|experience|through|their|these)$/.test(x));
const leadership = /\b(?:led|lead|leads|leading|owned|own|owns|managed|manage|manages|directed|direct|oversaw|oversee|supervised|supervise|accountable for|responsible for)\b/i;
const leadershipClaim = /\b(?:led|owned|managed|directed|oversaw|supervised|accountable for|responsible for)\b|\b(?:I (?:also |currently )?|and )(?:lead|own|manage|direct|oversee|supervise)\b/i;
const support = /\b(?:observed|assisted|supported|participated|helped|knowledge of|familiarity with|under supervision|under .*supervision|supervised (?:clinical )?(?:placements?|training|practice|sessions?))\b/i;
const activeLeadership = text => String(text).replace(/\b(?:(?:was|were|been|being)\s+supervised\b|supervised\s+(?:clinical\s+)?(?:placements?|training|practice|sessions?)\b)/gi,'');
const credentialMarker = /\b(?:certificat(?:e|ion)|certified|credential|licen[cs]e|authori[sz]ation|registered|registration|PMP|CPA)\b/i;
const credentialNames = [
 ['cpa', /\bCPA\b/i], ['pmp', /\bPMP\b/i], ['sap activate', /\bSAP Activate\b/i],
 ['first aid', /\bFirst Aid\b/i], ['cpr', /\bCPR\b/i], ['forklift', /\bforklift(?: operator)?\b/i],
 ['master plumber', /\bmaster\s+plumb(?:er|ing)\b/i],
 ['plumbing apprentice', /\b(?:registered )?plumbing apprentice\b/i],
 ['plumbing journeyperson', /\b(?:journeyperson|journeyman)\s+plumb(?:er|ing)\b/i],
 ['carpentry journeyperson', /\b(?:journeyperson|journeyman)\s+carpent(?:er|ry)\b/i],
];

export function credentialStatus(value) {
 const text=String(value||'');
 if(/\b(?:not held|not certified|no (?:current )?(?:certification|credential)|without|revoked|suspended|(?:does|do) not (?:currently )?(?:hold|have)|lack(?:s|ing)?)\b/i.test(text))return 'not_held';
 if(/\b(?:expired|lapsed|formerly|previously held)\b/i.test(text))return 'expired';
 if(/\b(?:preparation|preparing|prep|studying|pursuing|pending|in progress|candidate for|towards?|planning|aspiring)\b/i.test(text))return 'in_progress';
 if(/\b(?:current|active|valid)\b/i.test(text))return 'current';
 if(credentialMarker.test(text))return 'held';
 return 'unknown';
}

function credentialKeys(text) {
 const parts=String(text).split(/\s+(?:and|&)\s+|,\s*/i);
 if(parts.length>1)return parts.flatMap(credentialKeys);
 const named=credentialNames.filter(([,pattern])=>pattern.test(text)).map(([key])=>key);
 if(named.length)return named;
 // Generic credentials retain the specialty and level rather than a SAP-only allowlist.
 const value=String(text).split(/[|;—–]/)[0];
 const key=normalize(value).replace(/\b(?:i|a|an|also|am|hold|have|earned|obtained|current|active|valid|required|preferred|certification|certificate|certified|credential|license|licence|authorization|registration)\b/g,'').replace(/\s+/g,' ').trim();
 return key?[key]:[];
}

function credentialClauseMatches(key,source) {
 const named=credentialNames.find(([name])=>name===key);
 return named?named[1].test(source):key.split(' ').every(word=>normalize(source).split(' ').includes(word));
}

function credentialClauses(text) {
 return String(text).split(/;\s*(?!expired\b|active\b|current\b|valid\b|not held\b)|\n|(?<=[.!?])\s+|\s+(?:and|but)\s+(?=(?:(?:I\s+)?(?:am|hold|have|studying|pursuing|current|active|expired|my)\b|[^.;\n]{1,75}\b(?:certificate|certification|licen[cs]e|registration)\b))/i);
}

export function credentialEvidenceIssues(requirement, evidence) {
 if(!credentialMarker.test(requirement))return [];
 const alternatives=String(requirement).split(/\s+(?:or|and\/or)\s+/i);
 const evidenceText=Array.isArray(evidence)?evidence.map(s=>typeof s==='string'?s:s?.excerpt||'').join('\n'):String(evidence||'');
 // Split separate credentials, but retain a status suffix following a semicolon.
 const clauses=credentialClauses(evidenceText);
 const matches=alternatives.some(alternative=>{
  const keys=credentialKeys(alternative);
  return keys.length>0&&keys.every(key=>clauses.some(clause=>credentialClauseMatches(key,clause)&&credentialMarker.test(clause)&&['held','current'].includes(credentialStatus(clause))&&(!/\b(?:current|active|valid)\b/i.test(alternative)||credentialStatus(clause)==='current')));
 });
 return matches?[]:['The cited evidence does not establish every required credential with the stated current status.'];
}

function contextForExcerpt(excerpt, corpus) {
 let employer='';
 for(const line of String(corpus||'').split(/\r?\n/)){
  const heading=line.match(/^(.+?)\s+[-–—]\s+(.+?)\s*[|]\s*.*(?:19|20)\d{2}/);
  if(heading)employer=heading[2].trim();
  else if(/^(?:education|(?:professional )?(?:training|certifications?)|languages|selected projects|core skills|professional summary)\s*$/i.test(line.trim()))employer='';
  if(normalize(line).includes(normalize(excerpt)))return employer;
 }
 return '';
}

export function candidateEvidenceFacts(sources=[], {candidateCorpus=''}={}) {
 return sources.flatMap(source=>{
  const excerpt=typeof source==='string'?source:source?.excerpt||'';
  const employer=(typeof source==='object'&&source.employer)||contextForExcerpt(excerpt,candidateCorpus);
  return sentences(excerpt).map(text=>({text,employer,quantities:quantities(text),measures:quantityFacts(text),contribution:support.test(text)?'support':leadership.test(activeLeadership(text))?'leadership':'execution',credentialStatus:credentialStatus(text)}));
 });
}

export function candidateClaimIssues(proposed,sources=[],context={}) {
 const facts=candidateEvidenceFacts(sources,context);const issues=[];
 for(const sentence of sentences(proposed)){
  const exact=facts.some(f=>normalize(f.text)===normalize(sentence));
  if(exact)continue;
  const claimWords=words(sentence);
  const scored=facts.map(f=>({...f,overlap:words(f.text).filter(w=>claimWords.includes(w)).length}));
  const best=Math.max(0,...scored.map(f=>f.overlap));
  const relevant=scored.filter(f=>best===0||f.overlap>=Math.max(1,best-1));
  const numeric=quantityFacts(sentence);
  // Ignore the article "one" unless it modifies a measurable quantity.
  const requiredNumbers=numeric.filter(n=>n.number!=='1'||n.unit);
  for(const measure of requiredNumbers){
   const number=measure.number;
   const matches=relevant.filter(f=>f.measures.some(source=>sameQuantity(measure,source)));
   if(!matches.length){issues.push('A number or duration is not supported by this claim’s cited candidate evidence.');continue;}
   if(/\b(?:independently|personally|single.hand(?:ed)?ly)\b/i.test(sentence)&&matches.every(f=>/\b(?:as part of|with|our|the)\s+(?:a\s+)?(?:[a-z]+\s+)?(?:team|crew)\b/i.test(f.text)))issues.push('Preserve the team or crew attribution for this quantity.');
   const years=normalizeClaimNumbers(sentence).match(new RegExp(`\\b${number}\\s*(?:\\+\\s*)?years?\\b`,'i'));
   if(years&&!matches.some(f=>new RegExp(`\\b${number}\\s*(?:\\+\\s*)?years?\\b`,'i').test(normalizeClaimNumbers(f.text))))issues.push('The cited evidence does not establish the claimed years of experience.');
   if(matches.every(f=>/\b(?:team|store|department|company|program)\b/i.test(f.text)&&/\b(?:participated|helped|contributed|supported|team.s|store.s)\b/i.test(f.text))&&/\bI\s+(?:(?:personally|independently|directly|single.hand(?:ed)?ly)\s+)?(?:reduced|increased|improved|delivered|achieved|saved|cut|grew)\b/i.test(sentence))issues.push('Keep this result attributed to the team or programme and preserve the candidate’s contribution.');
  }
  issues.push(...polarityIssues(sentence,relevant.map(f=>f.text)),...assuranceIssues(sentence,relevant.map(f=>f.text)));
  if(leadershipClaim.test(activeLeadership(sentence))&&!/\b(?:assist|assisted|support|supported|observe|observed|help|helped)\b.*\b(?:led|managed|supervised|lead|manage|supervise)\b/i.test(sentence)){
   const established=relevant.some(f=>f.contribution==='leadership');
   if(!established)issues.push('The verified sources do not establish leadership or ownership of this work.');
  }
  if(/\b(?:independently|certified installation|certify installation)\b/i.test(sentence)&&relevant.length&&relevant.every(f=>f.contribution==='support'))issues.push('Supervised or observed work cannot be presented as independent execution or certification.');
  const credentialAssertion = sentence.replace(/\s+and\s+(?:I\s+)?(?:lead|manage|prepare|coordinate|support|own|direct)\b.*$/i, '');
  for(const assertion of credentialClauses(credentialAssertion)){
   if(credentialMarker.test(assertion)&&['held','current'].includes(credentialStatus(assertion))&&/\b(?:I (?:also )?(?:hold|have|am|earned|obtained)|certified|certification|certificate|licen[cs]e|authorization)\b/i.test(assertion))issues.push(...credentialEvidenceIssues(assertion,facts.map(f=>f.text)));
  }
  const namedEmployer=sentence.match(/\b(?:At|at)\s+([\p{Lu}][\p{L}\p{N}&.' -]{1,65}?)(?=,|\s+I\b|[.!?]?$)/u)?.[1]?.trim();
  if(namedEmployer&&relevant.some(f=>f.employer)&&!relevant.some(f=>normalize(f.employer)===normalize(namedEmployer)||normalize(f.text).includes(normalize(namedEmployer))))issues.push('Keep this claim attached to the employer or project established by its cited evidence.');
 }
 return [...new Set(issues)];
}
