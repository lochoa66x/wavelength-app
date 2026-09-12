// Discovery audit: saves failures rather than changing fixtures to hide them.
// Runs real handlers and exporters with fictional, controlled provider responses.
import {mkdir,writeFile} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {careerGigCases} from '../tests/fixtures/careerGigCorpus.mjs';
import {createTailorHandler} from '../api/tailor.js';
import {createCoverLetterHandler} from '../api/cover-letter.js';
import {createResumeExportContext} from '../src/resumeReadiness.js';
import {createResumeDocxBlob} from '../src/resumeDocx.js';
import {createResumePdfBytes} from '../src/resumePdf.js';
import {resumeRenderPlanToPlainText} from '../src/resumeText.js';
import {createApplicationPresentation} from '../src/applicationPresentation.js';
import {createCoverLetterPlan,updateCoverLetterParagraph,getCoverLetterReadiness,createCoverLetterExportContext,coverLetterToPlainText} from '../src/coverLetterModel.js';
import {createCoverLetterDocxBlob} from '../src/coverLetterDocx.js';
import {createCoverLetterPdfBlob} from '../src/coverLetterPdf.js';
import {reviewCoverLetterWriting} from '../src/coverLetterWriting.js';
import {candidateClaimIssues,credentialEvidenceIssues} from '../src/candidateClaims.js';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import JSZip from 'jszip';

const out=process.env.CAREER_GIG_QA_OUTPUT||'tmp/career-gig-final-2026-09-11';
await mkdir(out,{recursive:true});
const save=(name,value)=>writeFile(`${out}/${name}`,typeof value==='string'||value instanceof Uint8Array?value:JSON.stringify(value,null,2));
const responder=()=>({statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;}});
const options={authenticate:async()=>({user:{id:'fictional-career-gig-qa'},supabase:{}}),getApiKey:()=> 'controlled-fixture',getOpenAIKey:()=>undefined};
const reply=(name,input)=>({ok:true,status:200,json:async()=>({content:[{type:'tool_use',name,input}]})});
const request=c=>({method:'POST',headers:{authorization:'Bearer local-fixture'},body:{resume:c.baseResume,customJob:c.job,voice:'direct',length:'standard'}});
async function tailor(c,candidate=c.candidate){const calls=[];const handler=createTailorHandler({...options,fetchImpl:async(_url,o)=>{const body=JSON.parse(o.body);const name=body.tool_choice.name;calls.push(name);return reply(name,name==='return_tailoring_analysis'?c.analysis:{...candidate,fit_assessment:c.analysis.fit_assessment});}});const res=responder();await handler(request(c),res);return{status:res.statusCode,body:res.body,calls};}
async function letter(c,raw=c.letter){let calls=0;const handler=createCoverLetterHandler({...options,fetchImpl:async()=>{calls++;return reply('return_evidence_first_cover_letter',raw);}});const res=responder();await handler(request(c),res);return{status:res.statusCode,body:res.body,calls};}
async function pdfInfo(bytes){const task=getDocument({data:bytes.slice(),standardFontDataUrl:fileURLToPath(new URL('../node_modules/pdfjs-dist/standard_fonts/',import.meta.url))+'/'});const pdf=await task.promise;const pages=[];for(let n=1;n<=pdf.numPages;n++){const p=await pdf.getPage(n),content=await p.getTextContent(),v=p.getViewport({scale:1}),items=content.items.filter(x=>x.str);pages.push({page:n,text:items.map(x=>x.str).join(' '),bounds:{left:Math.min(...items.map(x=>x.transform[4])),right:Math.max(...items.map(x=>x.transform[4]+x.width)),top:Math.max(...items.map(x=>x.transform[5]+x.height)),bottom:Math.min(...items.map(x=>x.transform[5]))},width:v.width,height:v.height});}await task.destroy();return pages;}
async function artifact(prefix,docxBlob,pdfRaw){const db=new Uint8Array(await docxBlob.arrayBuffer()),pb=pdfRaw instanceof Blob?new Uint8Array(await pdfRaw.arrayBuffer()):new Uint8Array(pdfRaw.bytes||pdfRaw);await save(prefix+'.docx',db);await save(prefix+'.pdf',pb);const zip=await JSZip.loadAsync(db),xml=await zip.file('word/document.xml').async('string');const text=[...xml.matchAll(/<w:t(?:\s[^>]*)?>(.*?)<\/w:t>/gs)].map(x=>x[1].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')).join(' ');const pages=await pdfInfo(pb);const result={docxText:text,pages};await save(prefix+'-extraction.json',result);return result;}
async function exportProbe(plan,context,prefix){try{const ec=createCoverLetterExportContext(plan,context);const pdf=new Uint8Array(await(await createCoverLetterPdfBlob(ec)).arrayBuffer());await save(prefix+'.pdf',pdf);return{exported:true,readiness:getCoverLetterReadiness(plan,context)};}catch(e){return{exported:false,error:e.message,readiness:getCoverLetterReadiness(plan,context)};}}

const results=[];
for(const c of careerGigCases){const r={id:c.id,name:c.candidate.name,target:c.job.title,focus:c.focus,attacks:[]};await save(c.id+'-input.json',c);try{
 r.resumeApi=await tailor(c);r.letterApi=await letter(c);
 const resume=r.resumeApi.body?.resume;
 if(resume){const review=r.resumeApi.body.ats_review,ctx=createResumeExportContext(resume,review,{item:c.job});r.resumeReadiness=ctx.readiness;r.renderPlan=ctx.renderPlan;r.context={baseResume:c.baseResume,resumeData:resume,item:c.job,atsReview:review};
  if(ctx.readiness.canExport){r.resumeArtifacts=await artifact(c.id+'-resume',await createResumeDocxBlob(ctx),await createResumePdfBytes(ctx));await save(c.id+'-resume.txt',resumeRenderPlanToPlainText(ctx.renderPlan));}
 }
 // Carry the actual failed review forward; never replace an integrity block with a pass.
 const context=r.context||{baseResume:c.baseResume,resumeData:c.candidate,item:c.job,atsReview:r.resumeApi.body?.ats_review||{}};
 r.context=context;
 if(r.letterApi.body?.letter){r.letterPlan=createCoverLetterPlan(r.letterApi.body.letter,context);r.letterReadiness=getCoverLetterReadiness(r.letterPlan,context);r.writing=reviewCoverLetterWriting(r.letterPlan.paragraphs,r.letterPlan.length);if(r.letterReadiness.canExport){const ec=createCoverLetterExportContext(r.letterPlan,{...context,applicationPresentation:r.renderPlan?createApplicationPresentation(r.renderPlan):undefined});r.letterArtifacts=await artifact(c.id+'-letter',await createCoverLetterDocxBlob(ec),await createCoverLetterPdfBlob(ec));await save(c.id+'-letter.txt',coverLetterToPlainText(r.letterPlan));}}
 for(const a of c.attacks){const ar={...a,claimIssues:candidateClaimIssues(a.text,a.refs,{candidateCorpus:c.baseResume})};const raw=structuredClone(c.letter);Object.assign(raw.paragraphs[1],{text:a.text,evidence_refs:a.refs,requirement_refs:[c.job.required_qualifications[0]]});ar.generation=await letter(c,raw);
  if(ar.generation.body?.letter)ar.generatedExport=await exportProbe(createCoverLetterPlan(ar.generation.body.letter,context),context,`${c.id}-DIAGNOSTIC-${a.id}-generation`);
  const baseline=r.letterPlan||createCoverLetterPlan(c.letter,context);const edit=updateCoverLetterParagraph(baseline,'evidence',a.text,context);ar.edit={ok:edit.ok,message:edit.message};if(edit.ok)ar.editedExport=await exportProbe(edit.plan,context,`${c.id}-DIAGNOSTIC-${a.id}-edit`);
  ar.restoredExport=await exportProbe(createCoverLetterPlan(raw,context),context,`${c.id}-DIAGNOSTIC-${a.id}-restore`);
  const altered=structuredClone(c.candidate);altered.experience[0].bullets[0]=a.text;ar.resume=await tailor(c,altered);
  if(ar.resume.body?.resume){const ac=createResumeExportContext(ar.resume.body.resume,ar.resume.body.ats_review,{item:c.job});const text=resumeRenderPlanToPlainText(ac.renderPlan);ar.resumeOutput={readiness:ac.readiness,attackTextPresent:text.includes(a.text),plainText:text};if(ar.resumeOutput.attackTextPresent&&ac.readiness.canExport){ar.resumeOutput.artifacts=await artifact(`${c.id}-DIAGNOSTIC-${a.id}-resume`,await createResumeDocxBlob(ac),await createResumePdfBytes(ac));}}
  r.attacks.push(ar);
 }
 // Editorial probes are intentionally bad fixture sentences, not sampled model output.
 r.fragmentAdvice=reviewCoverLetterWriting([{id:'opening',purpose:'opening',text:c.candidate.title+' with experience in '+c.candidate.skills.slice(0,3).join(', ')+'.'}]);
 r.credentialControls=c.candidate.certifications.map(e=>({source:e.name,exactIssues:credentialEvidenceIssues(e.name,e.name)}));
}catch(e){r.error=e.stack;}
 if(r.resumeArtifacts)r.resumeNamePreserved=r.resumeArtifacts.pages[0].text.includes(c.candidate.name);
 if(r.letterArtifacts)r.letterNamePreserved=r.letterArtifacts.pages[0].text.includes(c.candidate.name);
 results.push(r);await save(c.id+'-result.json',r);console.log(JSON.stringify({id:r.id,resume:r.resumeApi?.status,letter:r.letterApi?.status,resumeState:r.resumeReadiness?.state,letterState:r.letterReadiness?.state,pages:[r.resumeArtifacts?.pages.length,r.letterArtifacts?.pages.length],attacks:r.attacks.map(a=>({id:a.id,api:a.generation.status,exported:a.generatedExport?.exported||false,edit:a.edit.ok,restored:a.restoredExport.exported,resumeUnsafe:a.resumeOutput?.attackTextPresent&&a.resumeOutput.readiness.canExport})),error:r.error}));}
const summary={testedCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),date:new Date().toISOString(),method:'Ten fictional career/gig profiles; controlled provider fixtures through actual local handlers, validators and exporters; no production or live-model calls.',cases:results.length,baselineResume200:results.filter(r=>r.resumeApi?.status===200).length,baselineLetter200:results.filter(r=>r.letterApi?.status===200).length,baselinePdfFiles:results.reduce((n,r)=>n+Number(!!r.resumeArtifacts)+Number(!!r.letterArtifacts),0),baselineDocxFiles:results.reduce((n,r)=>n+Number(!!r.resumeArtifacts)+Number(!!r.letterArtifacts),0),baselinePages:results.reduce((n,r)=>n+(r.resumeArtifacts?.pages.length||0)+(r.letterArtifacts?.pages.length||0),0),baselineNamesPreserved:results.every(r=>r.resumeNamePreserved&&r.letterNamePreserved),baselineWithinBounds:results.every(r=>[r.resumeArtifacts,r.letterArtifacts].filter(Boolean).every(a=>a.pages.every(p=>p.bounds.left>=0&&p.bounds.right<=p.width+1&&p.bounds.bottom>=0&&p.bounds.top<=p.height+1))),attackVariants:results.flatMap(r=>r.attacks).length,unsafeGenerationExports:results.flatMap(r=>r.attacks).filter(a=>a.generatedExport?.exported).length,unsafeEditExports:results.flatMap(r=>r.attacks).filter(a=>a.editedExport?.exported).length,unsafeRestoreExports:results.flatMap(r=>r.attacks).filter(a=>a.restoredExport?.exported).length,unsafeResumeAuthorized:results.flatMap(r=>r.attacks).filter(a=>a.resumeOutput?.attackTextPresent&&a.resumeOutput.readiness.canExport).length,errors:results.filter(r=>r.error).map(r=>({id:r.id,error:r.error}))};
const supplemental=[{id:'G09',text:'I did administer medication.',kind:'negative-to-positive-edit'},{id:'G07',text:'I delivered 30 tutoring sessions per month for 30 secondary-school students.',kind:'sessions-to-students-edit'}];
for(const p of supplemental){const r=results.find(x=>x.id===p.id),edit=updateCoverLetterParagraph(r.letterPlan,'evidence',p.text,r.context);p.accepted=edit.ok;p.message=edit.message;if(edit.ok){p.export=await exportProbe(edit.plan,r.context,`${p.id}-DIAGNOSTIC-${p.kind}`);}}
const nurse=careerGigCases[0],withoutSupervised=structuredClone(nurse.letter);withoutSupervised.paragraphs=withoutSupervised.paragraphs.filter(p=>p.id!=='second');const control=await letter(nurse,withoutSupervised);supplemental.push({id:'G01',kind:'remove-truthful-supervised-paragraph-control',status:control.status,paragraphs:withoutSupervised.paragraphs.map(p=>p.id)});
summary.supplementalUnsafeEditExports=supplemental.filter(p=>p.export?.exported).length;
summary.baselineCompletePairs=results.filter(r=>r.resumeArtifacts&&r.letterArtifacts).length;
summary.falseOpenerWarnings=results.reduce((n,r)=>n+(r.resumeApi?.body?.ats_review?.writing_review?.issues||[]).filter(i=>i.type==='unrecognized_opener').length,0);
summary.fragmentWarnings=results.filter(r=>r.fragmentAdvice?.issues.some(i=>i.code==='sentence_fragment')).length;
summary.weekendConfirmation=results.find(r=>r.id==='G04')?.letterReadiness?.pendingConfirmations?.length===1;
summary.availableBaselineNamesPreserved=results.every(r=>[r.resumeArtifacts,r.letterArtifacts].filter(Boolean).every(a=>a.docxText.includes(r.name)&&a.pages[0].text.includes(r.name)));
await save('supplemental-probes.json',supplemental);
await save('results.json',{summary,results,supplemental});await save('summary.json',summary);await save('README.txt','All candidates, jobs and credentials are fictional. These are controlled provider fixtures, NOT live AI generations. Baseline files exercise actual app exporters. DIAGNOSTIC files deliberately contain unsupported claims and must never be used as real applications. See results.json for each request, response, readiness check and export result. The 20 primary variants and two supplemental edit variants are deliberately false; the nursing paragraph removal is a separate positive control. A failed baseline review is carried into letter export checks. This discovery audit exits 1 when it finds unresolved defects; it does not change expected results to force a pass.');console.log(JSON.stringify(summary,null,2));if(summary.errors.length||summary.baselineResume200!==10||summary.baselineLetter200!==10||summary.baselineCompletePairs!==10||!summary.baselineWithinBounds||!summary.availableBaselineNamesPreserved||summary.falseOpenerWarnings||summary.fragmentWarnings!==10||!summary.weekendConfirmation||summary.unsafeGenerationExports||summary.unsafeEditExports||summary.unsafeRestoreExports||summary.unsafeResumeAuthorized||summary.supplementalUnsafeEditExports)process.exitCode=1;
