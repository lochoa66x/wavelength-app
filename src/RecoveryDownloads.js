import JSZip from 'jszip';
import { recoveryCases } from '../evaluations/validation-recovery-v1/cases.js';
import { createResumeExportContext } from './resumeReadiness.js';
import { createResumeDocxBlob } from './resumeDocx.js';
import { createResumePdfBytes } from './resumePdf.js';
import { createCoverLetterPlan, createCoverLetterExportContext } from './coverLetterModel.js';
import { createCoverLetterDocxBlob } from './coverLetterDocx.js';
import { createCoverLetterPdfBlob } from './coverLetterPdf.js';

export async function recoveryDownload(results) {
 const zip=new JSZip(), report=[];
 for(const fixture of recoveryCases.filter(c=>results.some(r=>r.caseId===c.id))) {
  const r=results.find(r=>r.caseId===fixture.id&&r.kind==='resume');
  const l=results.find(r=>r.caseId===fixture.id&&r.kind==='letter');
  const context={baseResume:fixture.resume,item:fixture.job,resumeData:r?.delivered?.resume,atsReview:r?.delivered?.ats_review};
  for(const kind of ['resume','letter']) {
   try {
    if(!context.resumeData || (kind==='letter'&&!l?.delivered?.letter)) throw new Error('Generated document unavailable');
    let docx,pdf;
    if(kind==='resume') {
     const exportContext=createResumeExportContext(context.resumeData,context.atsReview,{item:fixture.job});
     docx=await createResumeDocxBlob(exportContext); pdf=await createResumePdfBytes(exportContext);
    } else {
     const plan=createCoverLetterPlan(l.delivered.letter,context);
     const exportContext=createCoverLetterExportContext(plan,context);
     docx=await createCoverLetterDocxBlob(exportContext);
     pdf=new Uint8Array(await (await createCoverLetterPdfBlob(exportContext)).arrayBuffer());
    }
    zip.file(fixture.id+'-'+kind+'.docx',await docx.arrayBuffer());zip.file(fixture.id+'-'+kind+'.pdf',pdf);
    report.push({caseId:fixture.id,kind,exported:true});
   } catch(error) {report.push({caseId:fixture.id,kind,exported:false,error:error.message});}
  }
 }
 zip.file('export-report.json',JSON.stringify(report,null,2));
 const url=URL.createObjectURL(await zip.generateAsync({type:'blob'}));
 const anchor=document.createElement('a');anchor.href=url;anchor.download='gigscapes-validation-recovery-retest-documents.zip';anchor.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
 return report;
}
