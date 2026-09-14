import { normalizeClaimNumbers } from './claimFacts.js';
const norm = value => normalizeClaimNumbers(String(value || '')).toLowerCase().replace(/[^\p{L}\p{N}%]+/gu, ' ').trim();
const stop = new Set('a an the and or of to from by in on at for with my our i we its their it this that unresolved recurring next over across review reviews month months monthly year years percent percentage point points result results outcome outcomes work process project team crew company manager controller department'.split(' '));
const verbs = /\b(achiev(?:ed|ing) (?:a )?(?:reduction|increase|improvement) in|reduc(?:e[ds]?|ing)|cut(?:s|ting)?|lower(?:ed|s|ing)?|decreas(?:e[ds]?|ing)|increas(?:e[ds]?|ing)|improv(?:e[ds]?|ing)|boost(?:ed|s|ing)?|sav(?:e[ds]?|ing)|grew|grow(?:s|ing)?|fell|fall(?:s|ing)?|dropped|declin(?:e[ds]?|ing)|rose|risen|ris(?:e[sn]?|ing))\b/gi;
const observedVerb = /^(?:fell|falls?|falling|dropped|declin\w*|rose|risen|rises?|rising)$/i;
const resultNoun = /\b(?:exceptions?|differences?|errors?|costs?|revenue|sales|profits?|backlogs?|delays?|time|turnaround|throughput|productivity|efficiency|defects?|waste|rework|satisfaction|retention|conversion|accuracy|incidents?|complaints?|completion|rates?|hours?)\b/i;
const candidatePrefix = /(?:^|\b)(?:i|we)\b|^\s*(?:(?:also|then|successfully|personally|independently)\s+)*(?:help(?:ed)?|contribut(?:ed|ing)|achiev(?:ed|ing)|drove|driv(?:e|ing))\b|\b(?:my|our)\s+(?:work|efforts?|changes?|initiative|contribution|actions?)\b/i;
const sharedPrefix = /\b(?:team|crew|department|company|store|programme|program|manager|controller|supervisor)\b/i;
const actionStart = /^(?:(?:i|we)\s+(?:have\s+)?|(?:also|then|personally|independently|successfully)\s+)*(?:tracked|found|tested|documented|implemented|introduced|changed|revised|created|developed|led|managed|reduced|increased|improved|cut|saved|helped|contributed|coordinated)\b/i;
const pieces = value => String(value || '').replace(/^[\s•*-]+/, '').split(/;|\n|(?<=[.!?])\s+/).map(s => s.trim()).filter(Boolean);
const tokens = value => [...new Set(norm(value).split(' ').filter(w => w.length > 2 && !/^\d/.test(w) && !stop.has(w)).map(w => w.replace(/ies$/, 'y').replace(/s$/, '')))];
export function outcomeFacts(value) {
 const out=[];
 for(const clause of pieces(value)) for(const match of clause.matchAll(verbs)) {
  const before=clause.slice(0,match.index).trim(), after=clause.slice(match.index+match[0].length).trim();
  const passive=/\b(?:was|were|been|being|is|are)\s*(?:successfully\s*)?$/i.test(before);
  const candidate=!observedVerb.test(match[0])&&!passive&&(!before||candidatePrefix.test(before)||actionStart.test(before));
  const shared=!candidate&&!passive&&!observedVerb.test(match[0])&&sharedPrefix.test(before);
  const causalParticiple=/ing$/i.test(match[0])&&actionStart.test(before);
  const externalCause=!passive&&!observedVerb.test(match[0])&&(/^(?:this|that|these|those)\b/i.test(before)||/\b(?:the|a|an)\s+(?:(?:revised|new|updated)\s+)?(?:checklist|process|change|initiative|project|system|workflow|intervention)\b/i.test(before));
  const actor=candidate||causalParticiple ? (/\b(?:team|crew)\b.*\band I\b|\bI and\b.*\b(?:team|crew)\b|\b(?:our|we)\b/i.test(before)?'shared':'candidate') : shared?'shared':externalCause?'external':'observed';
  const subject=actor==='observed'?before.replace(/\b(?:was|were|been|being|is|are)\b/gi,''):after.split(/\b(?:from|by|to|over|across|after|while|when)\b/i)[0];
  // Literal trade operations (cutting pipe/material) are not outcome attribution.
  if(!resultNoun.test(subject))continue;
  const anchors=tokens(subject);if(!anchors.length)continue;
  const numbers=[...norm(clause).matchAll(/\b\d+(?:\s+\d+)*\b/g)].flatMap(m=>m[0].split(' '));
  out.push({clause,actor,anchors,numbers,verb:match[0],actorText:norm(before)});
 }
 return out;
}
const overlap=(left,right)=>left.anchors.filter(w=>right.anchors.includes(w)).length;
function relevantFacts(claim,sources) {
 const facts=sources.flatMap(source=>outcomeFacts(source).map(f=>({...f,source})));
 const best=Math.max(0,...facts.map(f=>overlap(claim,f)));
 return best?facts.filter(f=>overlap(claim,f)===best):[];
}
export function outcomeAttributionIssues(proposed,sources=[]) {
 const texts=sources.map(s=>typeof s==='string'?s:s?.excerpt||''),issues=[];
 for(const claim of outcomeFacts(proposed).filter(f=>f.actor!=='observed')){
  const relevant=relevantFacts(claim,texts);
  if(!relevant.length)continue; // Other claim checks handle an entirely unsupported result.
  const supported=relevant.some(f=>(claim.actor==='external'?f.actor==='external'&&f.actorText===claim.actorText:claim.actor==='shared'?f.actor==='shared'||f.actor==='candidate':f.actor==='candidate')
   &&(/\b(?:help|contribut)/i.test(f.clause)?/\b(?:help|contribut)/i.test(claim.clause):true));
  if(!supported)issues.push('Preserve the source outcome attribution: an observed or shared result does not establish that the candidate caused it.');
 }
 return [...new Set(issues)];
}
export function originalOutcomeStatement(proposed,sources=[]) {
 if(!outcomeAttributionIssues(proposed,sources).length)return null;
 const matches=outcomeFacts(proposed).filter(f=>f.actor!=='observed').flatMap(f=>relevantFacts(f,sources));
 const originals=[...new Set(matches.map(f=>f.source))];
 return originals.length===1?originals[0]:null;
}
export function missingSourceOutcomeStatements(proposed,sources=[]) {
 const proposedFacts=outcomeFacts(proposed);
 return sources.filter(source=>outcomeFacts(source).some(f=>f.actor!=='candidate'
  &&!proposedFacts.some(p=>overlap(f,p)>0&&f.numbers.every(n=>p.numbers.includes(n)))));
}
