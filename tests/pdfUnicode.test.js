import {mkdir,writeFile} from 'node:fs/promises';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createResumePdfBytes} from '../src/resumePdf.js';
import {createCoverLetterPdfBlob} from '../src/coverLetterPdf.js';
import {createCoverLetterPlan,createCoverLetterExportContext} from '../src/coverLetterModel.js';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
const source='Created print layouts using InDesign.';
async function text(bytes){const task=getDocument({data:new Uint8Array(bytes.bytes||bytes)});const pdf=await task.promise;let result='';for(let i=1;i<=pdf.numPages;i++)result+=(await(await pdf.getPage(i)).getTextContent()).items.map(x=>x.str).join(' ');await task.destroy();return result;}
for(const name of ['Łukasz Żółć','Αλέξανδρος Παππάς','Анна Иванова','李明'])test(`PDF résumé and letter preserve ${name}`,async()=>{
 const candidate={name,title:'Graphic Designer',contact:'designer@example.com',profile:'Designer with print production experience.',experience:[{role:'Designer',company:'Example Studio',dates:'2021 - 2026',bullets:[source]}]};
 const r=await createResumePdfBytes(candidate);assert.ok((await text(r)).includes(name));
 const ctx={baseResume:name+'\n'+source,resumeData:candidate,item:{title:'Graphic Designer',company:'Example Employer'}};
 const raw={paragraphs:[{id:'opening',purpose:'opening',text:'I created print layouts using InDesign.',evidence_refs:[source],requirement_refs:['Create print layouts'],evidence_match:'direct'},{id:'closing',purpose:'closing',text:'Thank you for considering my application.',evidence_refs:[],requirement_refs:[],evidence_match:'neutral'}]};
 const plan=createCoverLetterPlan(raw,ctx);const blob=await createCoverLetterPdfBlob(createCoverLetterExportContext(plan,ctx));assert.ok((await text(await blob.arrayBuffer())).includes(name));
 if(process.env.UNICODE_QA_OUTPUT){await mkdir(process.env.UNICODE_QA_OUTPUT,{recursive:true});const prefix=process.env.UNICODE_QA_OUTPUT+'/U'+name.codePointAt(0);await writeFile(prefix+'-resume.pdf',new Uint8Array(r.bytes||r));await writeFile(prefix+'-letter.pdf',new Uint8Array(await blob.arrayBuffer()));}
});
test('unsupported PDF glyphs produce an explicit error without mutating the source',async()=>{const candidate={name:'Alex 🦄 Smith',profile:'Created print layouts.'};const snapshot=JSON.stringify(candidate);await assert.rejects(()=>createResumePdfBytes(candidate),/cannot render.*Download DOCX/);assert.equal(JSON.stringify(candidate),snapshot);});
