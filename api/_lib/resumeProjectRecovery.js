import { resumeSectionKind } from '../../src/resumeOrganization.js';
import { sourceHistoryEntries } from './atsValidation.js';
const key=value=>String(value||'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();

// Recover only explicitly selected, structured source projects. Employment and
// qualification headings end the block, including implicit employment resumption.
export function recoverSelectedProjects(resume, source) {
 const lines=String(source||'').split(/\r?\n/).map(line=>line.replace(/^[\s•*-]+/,'').replace(/\s+/g,' ').trim()).filter(Boolean);
 const employment=new Set(sourceHistoryEntries(source).map(e=>e.headerIndex));
 const selected=[];let section='',current=null;
 for(let index=0;index<lines.length;index++){
  const line=lines[index],kind=resumeSectionKind(line);
  if(kind||employment.has(index)){section=employment.has(index)?'experience':kind;current=null;continue;}
  if(section!=='projects')continue;
  const parts=line.split('|').map(p=>p.trim());
  if(parts.length>=3 && /^(?:19|20)\d{2}(?:\s*[-–—]\s*(?:(?:19|20)\d{2}|Present))?$/i.test(parts.at(-1))){
   current={name:parts[0],description:parts.slice(1).join(' | '),bullets:[]};selected.push(current);
  } else if(current && line.length>=20 && !/https?:|www\.|@/.test(line))current.bullets.push(line);
 }
 const projects=[...(resume.projects||[])];
 const work=(resume.experience||[]).flatMap(e=>e.bullets||[]).map(key);
 for(const project of selected.filter(p=>p.bullets.length)){
  if(projects.some(p=>key(p.name)===key(project.name)))continue;
  if(project.bullets.every(b=>work.some(w=>w.includes(key(b)))))continue;
  projects.push(project);
 }
 return projects.length===(resume.projects||[]).length?resume:{...resume,projects};
}
