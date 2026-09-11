import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { professionCases } from '../tests/fixtures/professionCorpus.mjs';
import { createTailorHandler } from '../api/tailor.js';
import { createCoverLetterHandler } from '../api/cover-letter.js';
import { sanitizeTailoringAnalysis } from '../api/_lib/tailoringEvidence.js';
import { requirementEvidenceBoundary } from '../src/documentIntegrity.js';
import { createResumeExportContext } from '../src/resumeReadiness.js';
import { createResumeDocxBlob } from '../src/resumeDocx.js';
import { createResumePdfBytes } from '../src/resumePdf.js';
import { resumeRenderPlanToPlainText } from '../src/resumeText.js';
import { createApplicationPresentation } from '../src/applicationPresentation.js';
import { createCoverLetterPlan, updateCoverLetterParagraph, getCoverLetterReadiness, createCoverLetterExportContext, coverLetterToPlainText } from '../src/coverLetterModel.js';
import { createCoverLetterDocxBlob } from '../src/coverLetterDocx.js';
import { createCoverLetterPdfBlob } from '../src/coverLetterPdf.js';
import { reviewCoverLetterWriting } from '../src/coverLetterWriting.js';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import JSZip from 'jszip';

const out=process.env.PROFESSION_QA_OUTPUT || 'tmp/profession-fixes-2026-09-11';
await mkdir(out,{recursive:true});
const save=(name,value)=>writeFile(`${out}/${name}`,typeof value==='string'||value instanceof Uint8Array?value:JSON.stringify(value,null,2));
const responder=()=>({statusCode:200,setHeader(){},status(n){this.statusCode=n;return this;},json(body){this.body=body;return this;}});
const options={authenticate:async()=>({user:{id:'synthetic-profession-qa'},supabase:{}}),getApiKey:()=> 'controlled-provider-fixture',getOpenAIKey:()=>undefined};
const reply=(name,input)=>({ok:true,status:200,json:async()=>({content:[{type:'tool_use',name,input}]})});
const request=(c)=>({method:'POST',headers:{authorization:'Bearer local-test-fixture'},body:{resume:c.baseResume,customJob:c.job,voice:'direct',length:'standard'}});
const fixtureAnalysis=c=>{
 const b=c.candidate.experience.flatMap(x=>x.bullets), cert=c.candidate.certifications.map(x=>x.name), profile=c.candidate.profile;
 // Human-authored baseline evidence maps. Deliberately false mappings are tested separately.
 const maps={
 P01:[[0,'direct'],[0,'direct'],[cert[0],'direct'],[2,'direct'],[4,'direct'],[0,'direct']],
 P02:[['','missing'],['','missing'],['','missing'],[1,'adjacent'],['','missing']],
 P03:[[cert[0],'direct'],[0,'direct'],[profile,'direct'],[0,'direct'],[1,'direct']],
 P04:[[cert[0],'direct'],[0,'direct'],[0,'direct'],[0,'direct'],[2,'direct']],
 P05:[[0,'direct'],[2,'direct'],[1,'direct'],[0,'direct'],[2,'direct'],[c.candidate.contact,'direct']],
 P06:[['','missing'],['','missing'],['','missing'],[0,'adjacent'],['','missing']],
 P07:[['','missing'],[0,'direct'],[0,'direct'],[2,'adjacent'],[1,'direct']],
 P08:[[0,'direct'],['','missing'],[1,'adjacent'],[0,'adjacent'],[2,'adjacent']],
 P09:[[0,'direct'],[0,'direct'],[c.candidate.contact,'direct'],[1,'direct'],[2,'direct']],
 P10:[[profile,'direct'],[0,'direct'],[1,'direct'],[0,'direct'],[1,'direct'],['French: Intermediate','direct']]
 };
 const requirements=[...c.job.required_qualifications.map(requirement=>({requirement,priority:'required'})),...c.job.responsibilities.map(requirement=>({requirement,priority:'responsibility'})),...c.job.preferred_qualifications.map(requirement=>({requirement,priority:'preferred'}))].map((r,i)=>{
  const [value,match]=maps[c.id][i];const evidence=typeof value==='number'?b[value]:value;
  return {...r,id:`R${i+1}`,evidence_match:match,resume_evidence:evidence,safe_language:evidence,keywords:[]};
 });
 return {posting_assessment:{status:'complete',reason:'Complete synthetic posting'},fit_assessment:{path:c.expectedFit==='direct'?'direct':'adjacent',recommended_level:c.candidate.title,note:'Synthetic provider positioning fixture'},content_strategy:'direct',readiness:{status:c.expectedFit==='direct'?'strong_fit':'significant_gap',reason:'Synthetic provider assessment'},requirements,verified_transferable_skills:[],target_keywords:[],missing_evidence:[],prohibited_claims:[],candidate_questions:[]};
};
async function tailor(c, candidate=c.candidate){
 const calls=[];const analysis=fixtureAnalysis(c);
 const handler=createTailorHandler({...options,fetchImpl:async(_url,o)=>{const body=JSON.parse(o.body);const name=body.tool_choice.name;calls.push(name);return reply(name,name==='return_tailoring_analysis'?analysis:{...candidate,fit_assessment:analysis.fit_assessment});}});
 const res=responder();await handler(request(c),res);return {status:res.statusCode,body:res.body,calls,fixtureAnalysis:analysis};
}
async function letter(c,raw=c.letter){
 let calls=0;const handler=createCoverLetterHandler({...options,fetchImpl:async()=>{calls++;return reply('return_evidence_first_cover_letter',raw);}});
 const res=responder();await handler(request(c),res);return {status:res.statusCode,body:res.body,calls};
}
async function pdfInfo(bytes){
 const task=getDocument({data:bytes.slice(),standardFontDataUrl:fileURLToPath(new URL('../node_modules/pdfjs-dist/standard_fonts/',import.meta.url))+'/'});const pdf=await task.promise;const pages=[];
 for(let n=1;n<=pdf.numPages;n++){const p=await pdf.getPage(n);const content=await p.getTextContent();const v=p.getViewport({scale:1});const items=content.items.filter(x=>x.str);pages.push({page:n,text:items.map(x=>x.str).join(' '),bounds:{left:Math.min(...items.map(x=>x.transform[4])),right:Math.max(...items.map(x=>x.transform[4]+x.width)),top:Math.max(...items.map(x=>x.transform[5]+x.height)),bottom:Math.min(...items.map(x=>x.transform[5]))},width:v.width,height:v.height});}
 await task.destroy();return pages;
}
async function artifact(prefix,docxBlob,pdfRaw){
 const db=new Uint8Array(await docxBlob.arrayBuffer());const pb=pdfRaw instanceof Blob?new Uint8Array(await pdfRaw.arrayBuffer()):new Uint8Array(pdfRaw.bytes||pdfRaw);
 await save(prefix+'.docx',db);await save(prefix+'.pdf',pb);
 const zip=await JSZip.loadAsync(db);const xml=await zip.file('word/document.xml').async('string');const text=[...xml.matchAll(/<w:t(?:\s[^>]*)?>(.*?)<\/w:t>/gs)].map(x=>x[1].replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')).join(' ');
 const pages=await pdfInfo(pb);await save(prefix+'-extraction.json',{docxText:text,pages});return {docxText:text,pages};
}
const results=[];
for(const c of professionCases){
 // This flag models the actual intake confirmation for a complete synthetic posting.
 c.job.source_review={mode:'text',user_confirmed_complete:true,appears_complete:true,conflicts:[],conflicts_resolved:true};
 const r={id:c.id,name:c.candidate.name,target:c.job.title,focus:c.focus,method:'Controlled provider responses through actual local API handlers; no live model calls'};
 await save(c.id+'-input.json',c);
 try{
  r.resumeApi=await tailor(c);r.letterApi=await letter(c);
  const resume=r.resumeApi.body?.resume;
  if(resume){
   const review=r.resumeApi.body.ats_review;const ctx=createResumeExportContext(resume,review,{item:c.job});r.resumeReadiness=ctx.readiness;r.renderPlan=ctx.renderPlan;
   r.context={baseResume:c.baseResume,resumeData:resume,item:c.job,atsReview:review};
   if(ctx.readiness.canExport){r.resumeArtifacts=await artifact(c.id+'-resume',await createResumeDocxBlob(ctx),await createResumePdfBytes(ctx));await save(c.id+'-resume.txt',resumeRenderPlanToPlainText(ctx.renderPlan));}
   if(r.letterApi.body?.letter){
    const plan=createCoverLetterPlan(r.letterApi.body.letter,r.context);r.letterPlan=plan;r.letterReadiness=getCoverLetterReadiness(plan,r.context);r.writing=reviewCoverLetterWriting(plan.paragraphs,{length:plan.length,voice:plan.voice});
    if(r.letterReadiness.canExport){const ec=createCoverLetterExportContext(plan,{...r.context,applicationPresentation:createApplicationPresentation(ctx.renderPlan)});r.letterArtifacts=await artifact(c.id+'-letter',await createCoverLetterDocxBlob(ec),await createCoverLetterPdfBlob(ec));await save(c.id+'-letter.txt',coverLetterToPlainText(plan));}
    if(c.borrowedMetric){const p=createCoverLetterPlan({...c.letter,paragraphs:[{...c.letter.paragraphs[1],text:c.borrowedMetric.original,evidence_refs:c.borrowedMetric.refs},c.letter.paragraphs.at(-1)]},r.context);const edit=updateCoverLetterParagraph(p,'evidence',c.borrowedMetric.bad,r.context);r.metricProbe={input:c.borrowedMetric,accepted:edit.ok,message:edit.message,readiness:edit.ok?getCoverLetterReadiness(edit.plan,r.context):null};if(edit.ok){const ec=createCoverLetterExportContext(edit.plan,r.context);await save(c.id+'-metric-attack.pdf',new Uint8Array(await(await createCoverLetterPdfBlob(ec)).arrayBuffer()));}}
    if(c.longEdit){const text=(c.candidate.experience[0].bullets[0]+' ').repeat(42)+'Thank you for considering my application.';const edit=updateCoverLetterParagraph(plan,'evidence',text,r.context);r.longEdit={inputLength:text.length,accepted:edit.ok,savedLength:edit.plan?.paragraphs.find(x=>x.id==='evidence').text.length,message:edit.message,savedTail:edit.plan?.paragraphs.find(x=>x.id==='evidence').text.slice(-80),exact:edit.plan?.paragraphs.find(x=>x.id==='evidence').text===text};}
   }
  }
  if(c.probe){
   const a=sanitizeTailoringAnalysis({requirements:[{id:'R1',requirement:c.probe.requirement,priority:'required',evidence_match:'direct',resume_evidence:c.probe.source,safe_language:c.probe.source}]},c.baseResume,{status:'complete',fit_allowed:true,reason:'Synthetic complete posting'});
   const attack={...c.letter,paragraphs:c.letter.paragraphs.map(p=>p.id==='evidence'?{...p,text:c.probe.badClaim,evidence_refs:c.probe.badRefs,requirement_refs:[c.probe.requirement]}:p)};
   // Use an existing posting requirement so a citation-format error cannot mask a semantic defect.
   attack.paragraphs.find(p=>p.id==='evidence').requirement_refs=[c.job.required_qualifications[0]];
   r.claimProbe={input:c.probe,boundary:requirementEvidenceBoundary(c.probe.requirement,c.probe.source),analysis:a.requirements,api:await letter(c,attack)};
   const altered=structuredClone(c.candidate);altered.experience[0].bullets[0]=c.probe.badClaim.replace(/^I /,'');
   r.resumeClaimProbe=await tailor(c,altered);
   if(c.id==='P06'){
    const numbered=structuredClone(c);numbered.job.required_qualifications[0]='5 years of carpentry experience';
    const numberedAttack=structuredClone(attack);numberedAttack.paragraphs.find(p=>p.id==='evidence').requirement_refs=[numbered.job.required_qualifications[0]];
    r.numericTenureVariant=await letter(numbered,numberedAttack);
   }
  }
  if(c.borrowedMetric){
   const attack=structuredClone(c.letter);attack.paragraphs.find(p=>p.id==='evidence').text=c.borrowedMetric.bad;attack.paragraphs.find(p=>p.id==='evidence').evidence_refs=c.borrowedMetric.refs;
   r.metricGenerationProbe=await letter(c,attack);
   if(c.id==='P02'&&r.context){const p=createCoverLetterPlan(c.letter,r.context);r.metricSourceWordEdit=updateCoverLetterParagraph(p,'evidence','At Maple Home Supplies, I helped the accounts-payable team reduce invoice exceptions by 20%.',r.context);}
  }
 }catch(error){r.error=error.stack;}
 if(r.resumeArtifacts)r.resumeNamePreserved=r.resumeArtifacts.pages[0].text.includes(c.candidate.name);
 if(r.letterArtifacts)r.letterNamePreserved=r.letterArtifacts.pages[0].text.includes(c.candidate.name);
 results.push(r);await save(c.id+'-result.json',r);
 console.log(JSON.stringify({id:r.id,resume:r.resumeApi?.status,letter:r.letterApi?.status,resumeState:r.resumeReadiness?.state,letterState:r.letterReadiness?.state,resumePages:r.resumeArtifacts?.pages.length,letterPages:r.letterArtifacts?.pages.length,probe:r.claimProbe?.api.status,metric:r.metricProbe?.accepted,long:r.longEdit,error:r.error}));
}
await save('results.json',{baselineCommit:'ba4f9f0d2aeae6de8e4ed2a65fe3513ec071b3e9',testedVersion:'working tree with profession integrity fixes',method:'Synthetic profiles/postings with controlled provider fixtures, actual handlers and exporters; no production calls',results});

for (const r of results) {
 assert.equal(r.error, undefined, r.id);
 assert.equal(r.resumeApi.status, 200, r.id + ' resume'); assert.equal(r.letterApi.status, 200, r.id + ' letter');
 assert.ok(r.resumeNamePreserved && r.letterNamePreserved, r.id + ' PDF name');
 for (const artifact of [r.resumeArtifacts, r.letterArtifacts]) { assert.ok(artifact.docxText.includes(r.name), r.id + ' DOCX name'); for (const p of artifact.pages) assert.ok(p.bounds.left >= 0 && p.bounds.right <= p.width + 1 && p.bounds.bottom >= 0 && p.bounds.top <= p.height + 1, r.id + ' page bounds'); }
 if (r.claimProbe) assert.equal(r.claimProbe.api.status, 422, r.id + ' claim attack');
 if (r.metricGenerationProbe) assert.equal(r.metricGenerationProbe.status, 422, r.id + ' metric attack');
 if (r.numericTenureVariant) assert.equal(r.numericTenureVariant.status, 422, r.id + ' tenure attack');
 if (r.metricSourceWordEdit) assert.equal(r.metricSourceWordEdit.ok, false, r.id + ' employer edit attack');
 if (r.longEdit) assert.equal(r.longEdit.accepted, false, r.id + ' over-limit edit');
}
console.log('PASS: ten profession pairs, names, bounds, and consequential-claim probes.');
