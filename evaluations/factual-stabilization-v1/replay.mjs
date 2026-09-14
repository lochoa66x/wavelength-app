import fs from 'node:fs';
import crypto from 'node:crypto';
import {recoveryCases} from '../validation-recovery-v1/cases.js';
import {buildAtsReview} from '../../api/_lib/atsValidation.js';
import {recoverSelectedProjects} from '../../api/_lib/resumeProjectRecovery.js';
import {restoreCitedResumeBullets} from '../../api/_lib/resumeSourceRepair.js';
import {createResumeExportContext} from '../../src/resumeReadiness.js';
import {createCoverLetterPlan,createCoverLetterExportContext} from '../../src/coverLetterModel.js';
import {validateApplicationDocument} from '../../src/applicationDocumentContract.js';
import {documentText} from '../comparative-v1/analyze.mjs';
const root=new URL('./',import.meta.url);
function read(id,kind) {
 for(const [dir,attempt] of [['content-retest',3],['retest',2],['raw',1]]){
  const path=new URL('../validation-recovery-v1/'+dir+'/'+id+'-'+kind+'-attempt-'+attempt+'.json',root);
  if(fs.existsSync(path)){const bytes=fs.readFileSync(path);return {capture:JSON.parse(bytes),path:path.pathname,sha256:crypto.createHash('sha256').update(bytes).digest('hex')};}
 }
}
fs.mkdirSync(new URL('readable/',root),{recursive:true});
const rows=[];
for(const c of recoveryCases){
 const input=read(c.id,'resume'),r=input.capture,original=r.delivered.resume;
 const options={analysis:r.delivered.tailoring_analysis,historyEvidence:c.resume,targetTitle:c.job.title,category:c.job.category,postingAssessment:r.delivered.tailoring_analysis?.posting_assessment,focusReview:r.delivered.ats_review?.focus_review};
 const review=doc=>buildAtsReview(doc,c.resume,{keywords:r.delivered.tailoring_analysis?.target_keywords||[]},options);
 const before=review(original);
 const recovered=recoverSelectedProjects(original,c.resume);
 const fixed=restoreCitedResumeBullets(recovered,review(recovered),c.resume).resume;
 const after=review(fixed);
 let exportable=false,error=null;
 try{createResumeExportContext(fixed,after,{item:c.job});exportable=true;}catch(e){error=e.message;}
 rows.push({caseId:c.id,kind:'resume',inputCapture:input.path,inputSha256:input.sha256,changed:JSON.stringify(fixed)!==JSON.stringify(original),before:{integrity:before.integrity.status,issues:before.contract_issues},after:{integrity:after.integrity.status,issues:after.contract_issues,provenance:after.provenance_issues,exportable,error},document:fixed,assessment:after});
 fs.writeFileSync(new URL('readable/'+c.id+'-resume.txt',root),documentText(fixed,'resume'));
 const letterInput=read(c.id,'letter'),letter=letterInput.capture.delivered.letter,ctx={baseResume:c.resume,resumeData:fixed,item:c.job,atsReview:after};
 const plan=createCoverLetterPlan(letter,ctx),contract=validateApplicationDocument({kind:'cover-letter',document:plan,candidateCorpus:c.resume});
 let letterExportable=false,letterError=null;try{createCoverLetterExportContext(plan,ctx);letterExportable=true;}catch(e){letterError=e.message;}
 rows.push({caseId:c.id,kind:'letter',inputCapture:letterInput.path,inputSha256:letterInput.sha256,changed:false,valid:contract.valid,issues:contract.issues,exportable:letterExportable,error:letterError});
}
fs.writeFileSync(new URL('replay.json',root),JSON.stringify(rows,null,2));
const summary={kind:'deterministic replay, no new provider requests',documents:rows.length,changedResumes:rows.filter(r=>r.changed).map(r=>r.caseId),blockedBefore:rows.filter(r=>r.before?.integrity==='blocked').map(r=>r.caseId),blockedAfter:rows.filter(r=>r.kind==='resume'?r.after.integrity==='blocked'||!r.after.exportable:!r.valid||!r.exportable).map(r=>({caseId:r.caseId,kind:r.kind,issues:r.after||r.issues,error:r.error}))};
fs.writeFileSync(new URL('replay-summary.json',root),JSON.stringify(summary,null,2));
console.log(JSON.stringify(summary,null,2));
