// Deterministic checks for consequential claims, shared by API, editor and export.
// An exact citation establishes a source, not unrestricted permission to rewrite it.
const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[’‘]/g, "'").replace(/[^\p{L}\p{N}%]+/gu, ' ').trim();
const sentences = value => String(value || '').split(/\n|(?<=[.!?])\s+/).map(x => x.trim()).filter(Boolean);
const numberWords = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen','twenty'];
export const normalizeClaimNumbers = value => String(value || '').replace(new RegExp(`\\b(${numberWords.join('|')})\\b`, 'gi'), word => String(numberWords.indexOf(word.toLowerCase())));
const quantities = value => [...normalizeClaimNumbers(value).matchAll(/\b\d+(?:[,.]\d+)*(?:\s*%|\+)?/g)].map(m => m[0].replace(/[\s,]/g, ''));
const words = value => normalize(value).split(' ').filter(x => x.length > 3 && !/^(?:with|that|this|from|have|work|team|experience|through|their|these)$/.test(x));
const leadership = /\b(?:led|lead|leads|leading|owned|own|owns|managed|manage|manages|directed|direct|oversaw|oversee|supervised|supervise|accountable for|responsible for)\b/i;
const leadershipClaim = /\b(?:led|owned|managed|directed|oversaw|supervised|accountable for|responsible for)\b|\b(?:I (?:also |currently )?|and )(?:lead|own|manage|direct|oversee|supervise)\b/i;
const support = /\b(?:observed|assisted|supported|participated|helped|knowledge of|familiarity with|under supervision|under .*supervision)\b/i;
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
 const named=credentialNames.filter(([,pattern])=>pattern.test(text)).map(([key])=>key);
 if(named.length)return named;
 // Generic credentials retain the specialty and level rather than a SAP-only allowlist.
 const value=String(text).split('|')[0].replace(/^(?:I (?:also )?(?:hold|have|earned|obtained|am)|current|active|valid|required|preferred)\s+/gi,'');
 const key=normalize(value).replace(/\b(?:i|am|hold|have|earned|obtained|current|active|valid|certification|certificate|certified|credential|license|licence|authorization|registration)\b/g,'').replace(/\s+/g,' ').trim();
 return key?[key]:[];
}

function credentialClauseMatches(key,source) {
 const named=credentialNames.find(([name])=>name===key);
 return named?named[1].test(source):key.split(' ').every(word=>normalize(source).split(' ').includes(word));
}

export function credentialEvidenceIssues(requirement, evidence) {
 if(!credentialMarker.test(requirement))return [];
 const alternatives=String(requirement).split(/\s+(?:or|and\/or)\s+/i);
 const evidenceText=Array.isArray(evidence)?evidence.map(s=>typeof s==='string'?s:s?.excerpt||'').join('\n'):String(evidence||'');
 // Split separate credentials, but retain a status suffix following a semicolon.
 const clauses=evidenceText.split(/;\s*(?=(?:CPA|PMP|SAP|First Aid|CPR|Forklift)\b)|\n|(?<=[.!?])\s+|\s+(?:and|but)\s+(?=(?:I\s+)?(?:am|hold|have|studying|pursuing|current|active|expired|CPA|PMP|SAP|First|forklift))/i);
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
  return sentences(excerpt).map(text=>({text,employer,quantities:quantities(text),contribution:support.test(text)?'support':leadership.test(text)?'leadership':'execution',credentialStatus:credentialStatus(text)}));
 });
}

function quantityUnits(text, number) {
 const source = normalizeClaimNumbers(text).toLowerCase();
 const escaped = number.replace(/[.+]/g, '\\$&');
 if (number.endsWith('%')) return ['percent'];
 const pattern = new RegExp('\\b' + escaped + '\\s*(?:-?\\s*(?:balance-sheet|client|business|small-business|residential|service|registered|new|retail)\\s+){0,3}-?\\s*(years?|months?|days?|weeks?|accounts?|clients?|customers?|calls?|people|persons?|units?)\\b', 'gi');
 return [...source.matchAll(pattern)].map(match=>match[1].replace(/s$/, '').replace(/^people$/, 'person'));
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
  const numeric=quantities(sentence);
  // Ignore the article "one" unless it modifies a measurable quantity.
  const requiredNumbers=numeric.filter(n=>n!=='1'||/\b(?:1|one)\s+(?:year|month|day|week|account|client|project|person|unit|percent)\b/i.test(sentence));
  for(const number of requiredNumbers){
   const units=quantityUnits(sentence,number);
   const matches=relevant.filter(f=>f.quantities.includes(number)&&units.every(unit=>quantityUnits(f.text,number).includes(unit)));
   if(!matches.length){issues.push('A number or duration is not supported by this claim’s cited candidate evidence.');continue;}
   const years=normalizeClaimNumbers(sentence).match(new RegExp(`\\b${number}\\s*(?:\\+\\s*)?years?\\b`,'i'));
   if(years&&!matches.some(f=>new RegExp(`\\b${number}\\s*(?:\\+\\s*)?years?\\b`,'i').test(normalizeClaimNumbers(f.text))))issues.push('The cited evidence does not establish the claimed years of experience.');
   if(matches.every(f=>/\b(?:team|store|department|company|program)\b/i.test(f.text)&&/\b(?:participated|helped|contributed|supported|team.s|store.s)\b/i.test(f.text))&&/\bI\s+(?:(?:personally|independently|directly|single.hand(?:ed)?ly)\s+)?(?:reduced|increased|improved|delivered|achieved|saved|cut|grew)\b/i.test(sentence))issues.push('Keep this result attributed to the team or programme and preserve the candidate’s contribution.');
  }
  if(leadershipClaim.test(sentence)&&!/\b(?:assist|assisted|support|supported|observe|observed|help|helped)\b.*\b(?:led|managed|supervised|lead|manage|supervise)\b/i.test(sentence)){
   const established=relevant.some(f=>f.contribution==='leadership');
   if(!established)issues.push('The verified sources do not establish leadership or ownership of this work.');
  }
  if(/\b(?:independently|certified installation|certify installation)\b/i.test(sentence)&&relevant.length&&relevant.every(f=>f.contribution==='support'))issues.push('Supervised or observed work cannot be presented as independent execution or certification.');
  const credentialAssertion = sentence.replace(/\s+and\s+(?:I\s+)?(?:lead|manage|prepare|coordinate|support|own|direct)\b.*$/i, '');
  if(credentialMarker.test(credentialAssertion)&&(['held','current'].includes(credentialStatus(credentialAssertion)) || /\bI (?:also )?hold (?:a |an )?(?:current|active|valid)\b/i.test(sentence))&&/\b(?:I (?:also )?(?:hold|have|am|earned|obtained)|certified|certification|certificate|licen[cs]e|authorization)\b/i.test(sentence))issues.push(...credentialEvidenceIssues(credentialAssertion,relevant.map(f=>f.text)));
  const namedEmployer=sentence.match(/\b(?:At|at)\s+([\p{Lu}][\p{L}\p{N}&.' -]{1,65}?)(?=,|\s+I\b|[.!?]?$)/u)?.[1]?.trim();
  if(namedEmployer&&relevant.some(f=>f.employer)&&!relevant.some(f=>normalize(f.employer)===normalize(namedEmployer)||normalize(f.text).includes(normalize(namedEmployer))))issues.push('Keep this claim attached to the employer or project established by its cited evidence.');
 }
 return [...new Set(issues)];
}
