import {readFile,writeFile,readdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import mammoth from 'mammoth';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {liveCareerCases} from '../tests/fixtures/liveCareerCorpus.mjs';

// Reads files saved by the real browser. It never substitutes generated fixtures.
const directory=path.resolve(process.argv[2] || 'tmp/live-career-review-2026-09-12');
const names=await readdir(directory);
const compact=s=>String(s).normalize('NFKC').replace(/[^\p{L}\p{N}]/gu,'').toLowerCase();
const standardFontDataUrl=fileURLToPath(new URL('../node_modules/pdfjs-dist/standard_fonts/',import.meta.url))+'/';
const rows=[];
for(const filename of names.filter(n=>n.endsWith('.docx'))){
  const stem=filename.slice(0,-5);
  const docx=await mammoth.extractRawText({buffer:await readFile(path.join(directory,filename))});
  const kind=/Dear Hiring Team/.test(docx.value)?'letter':'resume';
  const career=liveCareerCases.find(c=>compact(docx.value).includes(compact(c.name)));
  const checks=[];
  const pdfName=stem+'.pdf';
  let pdfText='',pages=0,clippedItems=[];
  if(names.includes(pdfName)){
    const pdf=await getDocument({data:new Uint8Array(await readFile(path.join(directory,pdfName))),standardFontDataUrl}).promise;
    pages=pdf.numPages;
    for(let p=1;p<=pages;p++){
      const page=await pdf.getPage(p);
      const content=await page.getTextContent();
      const view=page.getViewport({scale:1});
      for(const item of content.items.filter(x=>x.str?.trim())){
        pdfText+=item.str+' ';
        const [x,y]=[item.transform[4],item.transform[5]];
        if(x<0 || y<0 || x+item.width>view.width+1 || y>view.height+1)clippedItems.push({page:p,text:item.str});
      }
      pdfText+='\n';
    }
    await pdf.cleanup();
  }else checks.push('PDF download missing');
  if(!career)checks.push('Candidate identity not recognized');
  const paragraphs=docx.value.split(/\n+/).map(x=>x.trim()).filter(Boolean);
  const missingParagraphs=paragraphs.filter(p=>!compact(pdfText).includes(compact(p)));
  if(missingParagraphs.length)checks.push('DOCX paragraphs missing or changed in PDF');
  if(clippedItems.length)checks.push('PDF text extends beyond page');
  if(kind==='letter' && pages!==1)checks.push('Letter is not one page');
  if(/Why this paragraph exists|candidate-selected capabilities|Sources and relevance|Download tailored|Application-ready export/.test(docx.value+' '+pdfText))checks.push('Editor or diagnostic text leaked into download');
  let clipboardMatches=null;
  if(career){
    const copy=await readFile(path.join(directory,`${career.id}-${kind}-copy.txt`),'utf8').catch(()=> '');
    if(!copy.trim())checks.push('Clipboard capture missing');
    else {
      clipboardMatches=paragraphs.every(p=>compact(copy).includes(compact(p)));
      if(!clipboardMatches)checks.push('Clipboard capture differs from downloaded text');
    }
  }
  await writeFile(path.join(directory,stem+'-docx-text.txt'),docx.value);
  await writeFile(path.join(directory,stem+'-pdf-text.txt'),pdfText);
  rows.push({case:career?.id,kind,docx:filename,pdf:pdfName,pages,docxBytes:(await readFile(path.join(directory,filename))).length,pdfBytes:names.includes(pdfName)?(await readFile(path.join(directory,pdfName))).length:0,selectableCharacters:pdfText.length,clipboardMatches,checks,missingParagraphs,clippedItems,docxWarnings:docx.messages});
}
const report={checkedAt:new Date().toISOString(),source:'Actual browser downloads from live production generations',wordRenderer:'Not verified by this script; DOCX XML/text checks are separate from native Word layout',documents:rows,counts:{pairs:rows.length,careers:new Set(rows.map(r=>r.case)).size,files:rows.length*2,pdfPages:rows.reduce((n,r)=>n+r.pages,0),checksToReview:rows.filter(r=>r.checks.length).length}};
await writeFile(path.join(directory,'download-inspection.json'),JSON.stringify(report,null,2));
console.log(JSON.stringify(report.counts));
for(const row of rows.filter(r=>r.checks.length))console.log(row.case,row.kind,JSON.stringify(row.checks));
