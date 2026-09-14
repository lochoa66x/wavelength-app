import { resumeSectionKind } from './resumeOrganization.js';
export const sourceTextKey=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
const jobTitle=/\b(?:manager|director|officer|assistant|clerk|consultant|architect|engineer|developer|analyst|coordinator|specialist|lead|supervisor|technician|operator|associate|intern|designer|administrator|president|founder|owner)\b/i;
const projectTitle=/(?:\b(?:project|trial|improvement|reconciliation|rollout|migration|dashboard|study|capstone|prototype|campaign|audit|series)|\bcleanup plan)$/i;
const date=/^(?:(?:[A-Za-z]+\.?)\s+)?(?:19|20)\d{2}(?:\s*[-–—]\s*(?:(?:[A-Za-z]+\.?\s+)?(?:19|20)\d{2}|present|current))?$/i;
export function structuredSourceRow(line, knownOrganizations = new Set()) {
 const parts=String(line).split(String(line).includes('|') ? /\s*\|\s*/ : /\s+[–—-]\s+/).map(s=>s.trim()).filter(Boolean);
 if(!String(line).includes('|') && parts.length>=4 && date.test(parts.at(-2)) && /^(?:(?:19|20)\d{2}|present|current)$/i.test(parts.at(-1))) parts.splice(-2,2,parts.at(-2)+' - '+parts.at(-1));
 if(parts.length<3||!date.test(parts.at(-1)))return null;
 let [name,organization]=parts;
 if(!jobTitle.test(name)&&jobTitle.test(organization)) [name,organization]=[organization,name];
 else if(knownOrganizations.has(sourceTextKey(name))&&!jobTitle.test(name)&&!projectTitle.test(name)&&projectTitle.test(organization)&&!jobTitle.test(organization)) [name,organization]=[organization,name];
 return {name,organization,dates:parts.at(-1)};
}
export function isClearProjectRow(line, knownOrganizations) {
 const row=structuredSourceRow(line, knownOrganizations);
 return Boolean(row&&!jobTitle.test(row.name)&&projectTitle.test(row.name));
}
export function sourceDocumentBlocks(corpus) {
 const lines=String(corpus||'').split(/\r?\n/).map(s=>s.replace(/^[\s•*-]+/,'').replace(/\s+/g,' ').trim()).filter(Boolean);
 const knownOrganizations=new Set(lines.map(line=>structuredSourceRow(line)).filter(row=>row&&jobTitle.test(row.name)).map(row=>sourceTextKey(row.organization)));
 const blocks=[];let section='',current=null;
 for(const [index,line]of lines.entries()){
  const kind=resumeSectionKind(line)||resumeSectionKind(line.split(':')[0]);
  if(kind){section=kind;current=null;continue;}
  const row=structuredSourceRow(line,knownOrganizations);
  if(row){
   const clearProject=isClearProjectRow(line,knownOrganizations);
   if(section==='projects'&&!clearProject&&(jobTitle.test(row.name)||/[-–—]/.test(row.dates)))section='experience';
   const rowKind=clearProject||section==='projects'?'projects':section||'experience';
   current={...row,kind:rowKind,headerIndex:index,sourceLine:line,statements:[]};blocks.push(current);continue;
  }
  if(current&&line.length>=15&&!/https?:|www\.|@/.test(line))current.statements.push(line);
 }
 return blocks;
}
export const sourceProjectEntries=corpus=>sourceDocumentBlocks(corpus).filter(b=>b.kind==='projects');
export function sourceBlockForEntry(entry,corpus,kind='experience'){
 const name=entry?.role||entry?.name||entry?.title;
 const candidates=sourceDocumentBlocks(corpus).filter(b=>b.kind===kind&&sourceTextKey(b.name)===sourceTextKey(name));
 if(kind==='projects'&&candidates.length===1)return candidates[0];
 return candidates.find(b=>(!entry.company||sourceTextKey(b.organization)===sourceTextKey(entry.company))
  &&(!entry.dates||sourceTextKey(b.dates)===sourceTextKey(entry.dates)))||null;
}
