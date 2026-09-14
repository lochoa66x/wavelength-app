import { sourceProjectEntries, sourceTextKey as key } from '../../src/sourceProjectEvidence.js';
import { originalOutcomeStatement, missingSourceOutcomeStatements } from '../../src/outcomeAttribution.js';

// Keep confidently identified source projects out of employment. Recovery uses
// complete source statements, retaining the diagnostic action, result and approval.
export function recoverSelectedProjects(resume,source) {
 const selected=sourceProjectEntries(source).filter(p=>p.statements.length);
 const migrated=new Set();
 const experience=(resume.experience||[]).filter(entry=>{
  const project=selected.find(p=>key(p.name)===key(entry.role)&&key(p.organization)===key(entry.company)&&key(p.dates)===key(entry.dates));
  if(project)migrated.add(key(project.name));
  return !project;
 });
 const projects=[...(resume.projects||[])];
 const work=experience.flatMap(e=>e.bullets||[]).map(key);
 for(const project of selected){
  const index=projects.findIndex(p=>key(p.name)===key(project.name));
  const sourceProject={name:project.name,description:[project.organization,project.dates].join(' | '),bullets:project.statements};
  if(index<0){
   if(!migrated.has(key(project.name))&&project.statements.every(b=>work.some(w=>w.includes(key(b)))))continue;
   projects.push(sourceProject);continue;
  }
  const current=projects[index];
  let bullets=(current.bullets||[]).map(b=>originalOutcomeStatement(b,project.statements)||b);
  if(!bullets.length)bullets=[...project.statements];
  for(const original of missingSourceOutcomeStatements(bullets.join(' '),project.statements))if(!bullets.some(b=>key(b)===key(original)))bullets.push(original);
  // A restored complete source statement can subsume a previous shorter bullet.
  // Remove only exact contained wording, and only when this repair added it.
  const addedSource=bullets.filter(b=>project.statements.includes(b)&&!(current.bullets||[]).includes(b));
  if(addedSource.length)bullets=bullets.filter(b=>!addedSource.some(original=>key(original)!==key(b)&&(' '+key(original)+' ').includes(' '+key(b)+' ')));
  const seen=new Set();bullets=bullets.filter(b=>{const k=key(b);if(seen.has(k))return false;seen.add(k);return true;});
  projects[index]={...current,bullets};
 }
 const next={...resume,...(resume.experience?{experience}:{}),...(projects.length?{projects}:{})};
 return JSON.stringify(next)===JSON.stringify(resume)?resume:next;
}
