import fs from 'node:fs';
import {recoveryCases} from './cases.js';
import {buildAtsReview} from '../../api/_lib/atsValidation.js';
import {validateApplicationDocument} from '../../src/applicationDocumentContract.js';
import {createResumeExportContext} from '../../src/resumeReadiness.js';
import {manifestVisibleText} from '../../src/resumeModel.js';
import {createCoverLetterPlan} from '../../src/coverLetterModel.js';
const root=new URL('./',import.meta.url),out=[];
function result(id,kind){for(const [folder,n] of [['content-retest',3],['retest',2],['raw',1]]){const p=new URL(folder+'/'+id+'-'+kind+'-attempt-'+n+'.json',root);if(fs.existsSync(p))return JSON.parse(fs.readFileSync(p));}}
for(const c of recoveryCases){
 const r=result(c.id,'resume'),l=result(c.id,'letter'),doc=r.delivered.resume;
 if(!doc){out.push({caseId:c.id,error:'Resume unavailable'});continue;}
 const review=buildAtsReview(doc,c.resume,{keywords:r.delivered.tailoring_analysis?.target_keywords||[]},{analysis:r.delivered.tailoring_analysis,historyEvidence:c.resume,targetTitle:c.job.title,category:c.job.category,postingAssessment:r.delivered.tailoring_analysis?.posting_assessment,focusReview:r.delivered.ats_review?.focus_review});
 const contract=validateApplicationDocument({kind:'resume',document:doc,candidateCorpus:c.resume});
 try{
  const context=createResumeExportContext(doc,review,{item:c.job});
  out.push({caseId:c.id,kind:'resume',attempt:r.attempt,contract:contract.valid,integrity:review.integrity.status,issues:review.contract_issues,expected:manifestVisibleText(context.renderPlan.manifest)});
 }catch(error){out.push({caseId:c.id,kind:'resume',error:error.message,issues:review.contract_issues,provenance:review.provenance_issues});}
 const plan=createCoverLetterPlan(l.delivered.letter,{baseResume:c.resume,resumeData:doc,item:c.job,atsReview:review});
 const checked=validateApplicationDocument({kind:'cover-letter',document:plan,candidateCorpus:c.resume});
 out.push({caseId:c.id,kind:'letter',attempt:l.attempt,contract:checked.valid,issues:checked.issues,expected:[plan.candidate.fullName,plan.target.company,plan.target.jobTitle,plan.salutation,...plan.paragraphs.map(p=>p.text),plan.signoff]});
}
fs.writeFileSync(new URL('../../tmp/validation-recovery-v1/expected.json',root),JSON.stringify(out,null,2));
console.log(JSON.stringify(out.map(r=>({case:r.caseId,kind:r.kind,attempt:r.attempt,valid:r.contract,integrity:r.integrity,error:r.error,issues:r.issues})),null,2));
