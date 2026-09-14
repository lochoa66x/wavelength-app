// Deterministic checks for consequential claims, shared by API, editor and export.
// An exact citation establishes a source, not unrestricted permission to rewrite it.
const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[’‘]/g, "'").replace(/[^\p{L}\p{N}%]+/gu, ' ').trim();
const sentences = value => String(value || '').split(/\n|(?<=[.!?])\s+/).map(x => x.trim()).filter(Boolean);
import { resumeSectionKind } from './resumeOrganization.js';
import {normalizeClaimNumbers,quantityFacts,sameQuantity,polarityIssues,assuranceIssues} from './claimFacts.js';
export {normalizeClaimNumbers} from './claimFacts.js';
const quantities = value => [...normalizeClaimNumbers(value).matchAll(/\b\d+(?:[,.]\d+)*(?:\s*%|\+)?/g)].map(m => m[0].replace(/[\s,]/g, ''));
const words = value => normalize(value).split(' ').filter(x => x.length > 3 && !/^(?:with|that|this|from|have|work|team|experience|through|their|these)$/.test(x));
const leadership = /\b(?:led|lead|leads|leading|owned|own|owns|managed|manage|manages|directed|direct|oversaw|oversee|supervised|supervise|accountable for|responsible for)\b/i;
const leadershipClaim = /\b(?:led|owned|managed|directed|oversaw|supervised|accountable for|responsible for)\b|\b(?:I (?:also |currently )?|and )(?:lead|own|manage|direct|oversee|supervise)\b/i;
const support = /\b(?:observed|assisted|supported|participated|helped|knowledge of|familiarity with|under supervision|under .*supervision|supervised (?:clinical )?(?:placements?|training|practice|sessions?))\b/i;
const activeLeadership = value => {
 const text=String(value)
  .replace(/\b(?:crew[- ]leader|supervisor|manager|instructor)[- ](?:directed|supervised)\b/gi,'')
  .replace(/\b(?:(?:was|were|been|being)\s+supervised\b|supervised\s+(?:clinical\s+)?(?:placements?|training|practice|sessions?)\b)/gi,'')
  .replace(/\b(?:with|including|through|during|under|of|in)\s+(?:(?:a|an|the)\s+)?supervised\b/gi,'');
 // An active sentence/bullet retains its supervision assertion.
 const nounProfile=/\b(?:experience|skills|knowledge|background)\b/i.test(text) && !/\b(?:I|we)\b/i.test(text);
 return nounProfile ? text.replace(/(?<=[,;]\s*(?:and\s+)?)supervised\s+(?=(?:leak|pressure|safety|quality)\s+checks?\b)/gi,'') : text;
};
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

function credentialKeys(text, {prose=false}={}) {
 const parts=String(text).split(/\s+(?:and|&)\s+|,\s*/i);
 if(parts.length>1)return parts.flatMap((part,index)=>prose && index>0 && !credentialMarker.test(part) && !credentialNames.some(([,pattern])=>pattern.test(part)) ? [] : credentialKeys(part,{prose}));
 // In a candidate sentence, the noun phrase names the credential. A following
 // explanation is not another part of its name. Keep specialty/provider phrases.
 if(prose){
  const marker=/\b(?:certificat(?:e|ion)|licen[cs]e|authori[sz]ation|registration)\b/i.exec(text);
  if(marker){const end=marker.index+marker[0].length,tail=String(text).slice(end);
   if(!/^\s+(?:in|of|for|from|issued by)\b/i.test(tail))text=String(text).slice(0,end);
  }
 }
 const named=credentialNames.filter(([,pattern])=>pattern.test(text)).map(([key])=>key);
 if(named.length)return named;
 // Generic credentials retain the specialty and level rather than a SAP-only allowlist.
 const value=String(text).split(/[|;—–]/)[0];
 const key=normalize(value).replace(/\b(?:i|my|a|an|also|am|hold|have|earned|obtained|from|issued|by|current|active|valid|required|preferred|certification|certificate|certified|credential|license|licence|authorization|registration)\b/g,'').replace(/\s+/g,' ').trim();
 return key?[key]:[];
}

function credentialClauseMatches(key,source) {
 const named=credentialNames.find(([name])=>name===key);
 return named?named[1].test(source):key.split(' ').every(word=>normalize(source).split(' ').includes(word));
}

function credentialClauses(text) {
 return String(text).split(/;(?!\s*(?:expired|active|current|valid|not held|in progress|pending|revoked|suspended|lapsed)\b)\s*|\n|(?<=[.!?])\s+|\s+(?:and|but)\s+(?=(?:(?:I\s+)?(?:am|hold|have|studying|pursuing|current|active|expired|my)\b|[^.;\n]{1,75}\b(?:certificate|certification|licen[cs]e|registration)\b))/i);
}

function credentialProseParts(value) {
 return String(value).split(/\s+(?:and|&)\s+|,\s*/i).filter(part=>credentialMarker.test(part)||credentialNames.some(([,pattern])=>pattern.test(part))).map(part=>{
  const firstMarker=/\b(?:certificat(?:e|ion)|licen[cs]e|authori[sz]ation|registration)\b/i.exec(part);
  if(firstMarker){const end=firstMarker.index+firstMarker[0].length;if(!/^\s+(?:in|of|for|from|issued by)\b/i.test(part.slice(end)))part=part.slice(0,end);}
  const introduced=part.replace(/^.*\b(?:with|hold|holds|have|has|earned|obtained|holding)\s+(?:(?:a|an|the)\s+)?/i,'');
  const marker=/\b(?:certificat(?:e|ion)|licen[cs]e|authori[sz]ation|registration)\b/i.exec(introduced);
  if(!marker)return introduced;
  const end=marker.index+marker[0].length,tail=introduced.slice(end);
  return /^\s+(?:in|of|for|from|issued by)\b/i.test(tail)?introduced:introduced.slice(0,end);
 });
}

export function credentialEvidenceIssues(requirement, evidence, {prose=false}={}) {
 if(!credentialMarker.test(requirement))return [];
 const alternatives=String(requirement).split(/\s+(?:or|and\/or)\s+/i);
 const evidenceText=Array.isArray(evidence)?evidence.map(s=>typeof s==='string'?s:s?.excerpt||'').join('\n'):String(evidence||'');
 // Split separate credentials, but retain a status suffix following a semicolon.
 const clauses=credentialClauses(evidenceText);
 const matches=alternatives.some(alternative=>{
  const requested=prose?credentialProseParts(alternative):[alternative];
  return requested.length>0 && requested.every(part=>{
   const keys=credentialKeys(part,{prose});
   return keys.length>0&&keys.every(key=>clauses.some(clause=>credentialClauseMatches(key,clause)&&credentialMarker.test(clause)&&['held','current'].includes(credentialStatus(clause))&&(!/\b(?:current|active|valid)\b/i.test(part)||credentialStatus(clause)==='current')));
  });
 });
 return matches?[]:['The cited evidence does not establish every required credential with the stated current status.'];
}

function contextForExcerpt(excerpt, corpus) {
 let employer='';
 for(const line of String(corpus||'').split(/\r?\n/)){
  const heading=line.match(/^(.+?)\s+(?:[-–—]|\|)\s+(.+?)\s*[|]\s*.*(?:19|20)\d{2}/);
  if(heading)employer=heading[2].trim();
  else if(/^(?:education|(?:professional )?(?:training|certifications?)|languages|selected projects|core skills|professional summary)\s*$/i.test(line.trim()))employer='';
  if(normalize(line).includes(normalize(excerpt)))return employer;
 }
 return '';
}

export function candidateEvidenceFacts(sources=[], {candidateCorpus=''}={}) {
 const sectionByExcerpt=new Map();let section='';
 for(const line of String(candidateCorpus).split(/\r?\n/)){section=resumeSectionKind(line)||section;sectionByExcerpt.set(normalize(line),section);}
 return sources.flatMap(source=>{
  const excerpt=typeof source==='string'?source:source?.excerpt||'';
  const employer=(typeof source==='object'&&source.employer)||contextForExcerpt(excerpt,candidateCorpus);
  return sentences(excerpt).map(text=>({text,employer,quantities:quantities(text),measures:quantityFacts(text),contribution:sectionByExcerpt.get(normalize(excerpt))==='skills'?'support':support.test(text)?'support':leadership.test(activeLeadership(text))?'leadership':'execution',credentialStatus:credentialStatus(text)}));
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
  const namedEmployer=sentence.match(/\b(?:At|at)\s+([\p{Lu}][\p{L}\p{N}&.'’-]*(?:\s+(?:(?:and|of|the)\s+)?[\p{Lu}][\p{L}\p{N}&.'’-]*)*)/u)?.[1]?.trim().replace(/[.]$/, '');
  const calendarRanges=[...sentence.matchAll(/\b(?:from|between)\s+((?:19|20)\d{2})\s+(?:to|through|until|and)\s+((?:19|20)\d{2})\b/gi)];
  for(const measure of requiredNumbers){
   const number=measure.number;
   // A compound sentence can cite several facts. Select a measured fact by its
   // own unit/rate and employer, not the other clause's larger word overlap.
   // Percentages and untyped values retain lexical scope. An explicit calendar
   // year can belong to a separately cited project heading.
   const calendarRange=calendarRanges.find(range=>range[1]===number||range[2]===number);
   const calendarYear = measure.kind === 'calendar';
   const projectName = calendarYear ? sentence.match(new RegExp(`\\b${number}\\s+([A-Z][\\p{L}-]+(?:\\s+[A-Z][\\p{L}-]+)*)`, 'u'))?.[1] : '';
   const numericFacts=(measure.unit && measure.unit!=='percent') || calendarYear ? scored : relevant;
   // Both endpoints must occur together in one cited fact; do not stitch a
   // tenure from separate employers, projects or single-year milestones.
   const matches=numericFacts.filter(f=>(!namedEmployer || !f.employer || normalize(f.employer)===normalize(namedEmployer) || normalize(f.text).includes(normalize(namedEmployer))) && (!projectName || normalize(f.text).includes(normalize(projectName))) && f.measures.some(source=>sameQuantity(measure,source)) && (!calendarRange || new RegExp(`\\b${calendarRange[1]}\\s*(?:[-–—]|to|through|until|and)\\s*${calendarRange[2]}\\b`, 'i').test(f.text)));
   if(!matches.length){issues.push('A number or duration is not supported by this claim’s cited candidate evidence.');continue;}
   const shared = f => /\b(?:as part of|with|our|the)\s+(?:an?\s+)?(?:[a-z]+\s+)?(?:team|crew|assistant)\b|\bcombined(?: [a-z-]+){0,2} (?:total|output)\b/i.test(f.text);
   const sharedSubject = /\b(?:(?:an?|the|my|our)\s+)?(?:[a-z-]+\s+){0,3}(?:assistant|team|crew)\s+and\s+I\s+(?:have\s+)?(?:prepared|made|produced|created|completed|built|assembled|baked)\b|\bI\s+and\s+(?:an?|the|my|our)\s+(?:[a-z-]+\s+){0,3}(?:assistant|team|crew)\s+(?:have\s+)?(?:prepared|made|produced|created|completed|built|assembled|baked)\b/i.test(sentence);
   const sharedClaim = shared({text:sentence}) || sharedSubject || /\btogether\b/i.test(sentence);
   if(matches.every(shared) && (/\b(?:independently|personally|single.hand(?:ed)?ly)\b/i.test(sentence) || (/\bI\s+(?:prepared|made|produced|created|completed|built|assembled|baked)\b/i.test(sentence) && !sharedClaim)))issues.push('Preserve the team or crew attribution for this quantity.');
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
   if(credentialMarker.test(assertion)&&['held','current'].includes(credentialStatus(assertion))&&/\b(?:I (?:also )?(?:hold|have|am|earned|obtained)|certified|certification|certificate|licen[cs]e|authorization)\b/i.test(assertion))issues.push(...credentialEvidenceIssues(assertion,facts.map(f=>f.text),{prose:true}));
  }
  if(namedEmployer&&relevant.some(f=>f.employer)&&!relevant.some(f=>normalize(f.employer)===normalize(namedEmployer)||normalize(f.text).includes(normalize(namedEmployer))))issues.push('Keep this claim attached to the employer or project established by its cited evidence.');
 }
 return [...new Set(issues)];
}
