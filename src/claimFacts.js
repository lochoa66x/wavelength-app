// Small, deterministic fact comparisons, not a general language entailment model.
// Unknown count nouns are retained rather than silently treated as unitless numbers.
const ones = ['zero','one','two','three','four','five','six','seven','eight','nine','ten','eleven','twelve','thirteen','fourteen','fifteen','sixteen','seventeen','eighteen','nineteen'];
const tens = ['twenty','thirty','forty','fifty','sixty','seventy','eighty','ninety'];
export function normalizeClaimNumbers(value) {
  return String(value || '').replace(new RegExp(`\\b(${tens.join('|')})(?:[ -](${ones.slice(1,10).join('|')})(?!-[a-z]))?\\b`, 'gi'), (_, ten, one) => String((tens.indexOf(ten.toLowerCase())+2)*10+(one?ones.indexOf(one.toLowerCase()):0)))
    .replace(new RegExp(`\\b(${ones.join('|')})\\b`, 'gi'), word => String(ones.indexOf(word.toLowerCase())));
}
export const factWords = value => String(value || '').toLowerCase().replace(/[’‘]/g,"'").match(/[a-z]+/g) || [];
const singular = word => ({people:'person',children:'child',men:'man',women:'woman',feet:'foot',mice:'mouse'}[word] || word.replace(/ies$/, 'y').replace(/(?<!s)s$/, ''));
const timeUnit = /^(?:minute|hour|day|week|month|year|shift|season)$/;
const boundaries = /\b(?:per|each|every|a|an|for|from|to|with|within|in|on|at|during|by|using|as|and|or|of|through|across|under|before|after|between|while|that|which|who)\b/;
function countUnit(tail) {
  if (/^\s*%/.test(tail)) return {unit:'percent',business:false};
  // Do not interpret dates, version suffixes or amounts as count nouns.
  if (!/^\s+(?:[a-z]|\d+-[a-z])/i.test(tail)) return {unit:'',business:false};
  const phrase=tail.trim().split(/[,.;:()]/)[0].split(boundaries)[0];
  const tokens=factWords(phrase).slice(0,6);
  const unit=singular(tokens.at(-1)||'');
  return {unit,business:timeUnit.test(unit)&&tokens.includes('business')};
}
export function quantityFacts(value) {
  const text=normalizeClaimNumbers(value).toLowerCase();
  return [...text.matchAll(/\b\d+(?:[,.]\d+)*(?:\s*%|\+)?/g)].map(m=>{
    const tail=text.slice(m.index+m[0].length);
    const {unit,business}=m[0].trim().endsWith('%')?{unit:'percent',business:false}:countUnit(tail);
    // Restrict the denominator to this measured clause, not a later metric.
    const clause=tail.split(/[.;]|\b(?:and|but)\b|\bfor\s+\d/)[0];
    const denominator=clause.match(/\b(?:per|each|every)\s+([^.;,]+)/)?.[1];
    const denominatorUnit=denominator?countUnit(` ${denominator}`):null;
    const shift=clause.match(/\bduring\s+(?:[a-z-]+\s+){0,4}?(shift|season)\b/);
    const rate=denominatorUnit?.unit ? `${denominatorUnit.business?'business ':''}${denominatorUnit.unit}` : shift?.[1]||'';
    return {number:m[0].replace(/[\s,]/g,''),unit,business,rate};
  });
}
export function sameQuantity(claim, source) {
  return claim.number===source.number && (!claim.unit || claim.unit===source.unit)
    && (!timeUnit.test(claim.unit) || claim.business===source.business)
    && (!claim.rate || claim.rate===source.rate);
}
const stem = word => singular(word).replace(/(?:ing|ed)$/, '').replace(/e$/, '');
const ignored = new Set(['i','a','an','the','to','did','do','does','not','never','have','has','had','was','were','is','are','am','will','can','my','their','with','and','but']);
const actionWords = text => factWords(text).filter(w=>!ignored.has(w)).map(stem);
function negativeActions(text) {
  const expanded=String(text).replace(/[’‘]/g,"'").replace(/\b(did|do|does|was|were|is|are|have|has)n['’]t\b/gi,'$1 not');
  return [...expanded.matchAll(/\b(?:did not|do not|does not|cannot|can not|never|not)\s+([^;.!?]+?)(?=\s+(?:and|but)\b|[;.!?]|$)/gi)].map(m=>actionWords(m[1]));
}
function containsAction(text, action) {
  const tokens=actionWords(text);
  return action.length>=2 && action.slice(0,2).every(w=>tokens.includes(w));
}
export function polarityIssues(proposed, sources) {
  const claimNegative=negativeActions(proposed);
  for(const source of sources){
    for(const action of negativeActions(source))if(containsAction(proposed,action)&&!claimNegative.some(a=>action.slice(0,2).every(w=>a.includes(w))))return ['The proposed action contradicts an explicit negative statement in its cited evidence.'];
    for(const action of claimNegative)if(containsAction(source,action)&&!negativeActions(source).some(a=>action.slice(0,2).every(w=>a.includes(w))))return ['Preserve whether the cited action was or was not performed.'];
  }
  return [];
}

const assuranceKinds = [
  ['insurance', /\b(?:insurance|insured|bonded)\b/i],
  ['background check', /\b(?:background|criminal record|police)\s+(?:check|screening|clearance)\b/i],
  ['availability', /\b(?:I (?:am|will be|can be) available|available (?:every|on|for|immediately)|can start|start immediately|start date)\b/i],
  ['work eligibility', /\b(?:authorized|eligible) to work\b/i],
  ['relocation', /\brelocat(?:e|ing|ion)\b/i],
  ['guarantee', /\b(?:guarantee(?:d|s)?|promise(?:d|s)?)\b/i],
  ['referral', /\b(?:referred|referral|recommended)\s+by\b/i, true],
  ['motivation', /\b(?:dream|passion(?:ate)?|thrilled|excited)\b/i, true],
  ['relationship', /\b(?:worked|partnered|collaborated)\s+with\s+(?:your|the)\s+(?:company|team|organization)\b/i, true],
  ['compensation', /\b(?:salary|compensation)\b/i, true],
  ['rights', /\b(?:copyrights?|commercial rights|unlimited rights)\b/i],
];
export function assuranceIssues(proposed, sources) {
  const problems=[];
  const clauses=text=>String(text).split(/[;.!?]|\s+(?:and|but)\s+/i).filter(Boolean);
  for(const claim of clauses(proposed))for(const [kind,pattern,strict] of assuranceKinds){
    const marker=pattern.exec(claim);
    if(!marker)continue;
    // Retain explicit disclaimers instead of turning their topic into a positive assurance.
    if(/\b(?:not|never|without|no)\b/i.test(claim.slice(0,marker.index)))continue;
    const qualifiers=factWords(claim).filter(w=>/^(?:full|liability|professional|current|passed|unlimited|commercial|all|weekends?|weekdays?|immediately|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$/.test(w));
    const supported=sources.flatMap(clauses).some(text=>pattern.test(text)&&! /\b(?:not|never|without|no|expired|pending)\b/i.test(text)
      && qualifiers.every(w=>factWords(text).includes(w))
      && (!strict || factWords(claim).filter(w=>!ignored.has(w)).every(w=>factWords(text).includes(w))));
    if(!supported)problems.push(`The cited evidence does not establish this ${kind} claim.`);
  }
  return problems;
}
