import { originalOutcomeStatement, missingSourceOutcomeStatements } from '../../src/outcomeAttribution.js';
const sentences=value=>String(value||'').split(/(?<=[.!?])\s+/).map(s=>s.trim()).filter(Boolean);
const key=value=>String(value).toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

export function protectAttributedOutcomes(letter) {
 return (letter.paragraphs||[]).flatMap(paragraph=>{
  const sources=paragraph.evidence_refs||paragraph.evidenceRefs||[];
  const originals=[...new Set(sentences(paragraph.text).map(s=>originalOutcomeStatement(s,sources)).filter(Boolean))];
  return originals.length?[{id:paragraph.id,originals}]:[];
 });
}
export function restoreProtectedOutcomes(letter,protectedOutcomes) {
 if(!letter)return letter;
 return {...letter,paragraphs:(letter.paragraphs||[]).map(paragraph=>{
  const protection=protectedOutcomes.find(p=>p.id===paragraph.id);
  if(!protection)return paragraph;
  let text=sentences(paragraph.text).map(s=>originalOutcomeStatement(s,protection.originals)||s).join(' ');
  for(const original of missingSourceOutcomeStatements(text,protection.originals))text+=' '+original;
  const seen=new Set();
  text=sentences(text).filter(s=>{const k=key(s);if(seen.has(k))return false;seen.add(k);return true;}).join(' ');
  return {...paragraph,text};
 })};
}
export function retainsProtectedOutcomes(letter,protectedOutcomes) {
 return protectedOutcomes.every(protection=>{
  const paragraph=letter?.paragraphs?.find(p=>p.id===protection.id);
  return paragraph&&!missingSourceOutcomeStatements(paragraph.text,protection.originals).length;
 });
}
