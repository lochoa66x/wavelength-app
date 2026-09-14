import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { root, loadResults, deliveredDocument, documentText } from './analyze.mjs';
import { comparisonCases } from './cases.js';
import { reviewNotes, confirmationNotes } from './review-notes.js';
const results = loadResults();
if (results.length !== 60) throw new Error('Preserve all 48 original and 12 confirmation requests before reporting.');
const dimensions = ['Relevance','Useful detail','Document purpose','Selection and organization','Natural professional writing'];
const grades = {
  0: ['Missing','Missing','Missing','Missing','Missing'],
  1: ['Weak target focus','Thin detail','Weak document purpose','Substantial duplication or an unfinished entry','Weak prose'],
  2: ['Adequate target focus','Adequate detail','Too much recap or too little useful professional context','Readable but contains repetition, fragmentation or ordering problems','Clear enough but mechanical, repetitive or grammatically inconsistent'],
  3: ['Strong target focus with room to sharpen positioning','Strong contribution detail','Useful professional context or a focused case','Logical organization with minor refinements remaining','Clear, concrete professional prose'],
  4: ['Precisely addresses the stated work priorities','Retains a distinctive method, constraint, scope or result','Focused use of the available evidence without unnecessary recap','Excellent evidence selection and organization','Excellent natural writing'],
};
const patterns = { C01:/duplicate|retest/i, C02:/18 to 5|duplicate bank/i, C03:/under.sink/i, C04:/32 outstanding/i, C05:/cancelled|duplicate journey/i, C06:/mixed window|white.balance masks/i };
const ratings = results.map(r => {
  const notes = r.arm === 'confirmed_pipeline' ? confirmationNotes[r.caseId]?.[r.kind] : reviewNotes[r.caseId]?.[`${r.arm}-${r.kind}`];
  if (!notes) throw new Error(`Missing review ${r.caseId} ${r.arm} ${r.kind}`);
  const [scores, evidenceGate, comment] = notes;
  const doc = deliveredDocument(r);
  if (Boolean(doc) !== Boolean(scores)) throw new Error('Missing output/score mismatch');
  const text = documentText(doc, r.kind);
  const lines = text.split(/\n+/).filter(Boolean);
  const profile = doc?.profile || (typeof doc?.paragraphs?.[0] === 'string' ? doc.paragraphs[0] : doc?.paragraphs?.[0]?.text) || '';
  const detail = lines.find(line => patterns[r.caseId].test(line)) || profile;
  const paragraphs = (doc?.paragraphs || []).map(p => typeof p === 'string' ? p : p.text);
  const purpose = r.kind === 'resume' ? profile : paragraphs.find(p => /This (?:work|experience|project)|Across these roles|I would bring/.test(p)) || paragraphs[0];
  const excerpts = [profile,detail,purpose,detail,profile];
  return { caseId:r.caseId, arm:r.arm, kind:r.kind, reviewer:'coding agent; not blinded or independent',
    evidenceGate, note:comment, total:scores?.reduce((a,b)=>a+b,0) ?? null,
    dimensions:scores?.map((score,i)=>({dimension:dimensions[i],score,excerpt:excerpts[i],reason:`${grades[score][i]}. ${comment}`})) ?? null,
    accepted: Boolean(scores && scores.reduce((a,b)=>a+b,0)>=15 && scores.every(s=>s>=2) && evidenceGate==='pass'),
    applicationExportVerified:false,
  };
});
fs.writeFileSync(path.join(root,'scores.json'),JSON.stringify({rubric:'../QUALITY_RUBRIC.md',humanCalibration:'pending',ratings},null,2));
const median = xs => {const a=xs.filter(Number.isFinite).sort((x,y)=>x-y);return a.length ? (a[Math.floor((a.length-1)/2)]+a[Math.floor(a.length/2)])/2 : null;};
const metrics = JSON.parse(fs.readFileSync(path.join(root,'metrics.json'))).metrics;
const armNames = ['pipeline','simple','reasoning','selection','confirmed_pipeline'];
const summary = armNames.map(arm => {
  const rows = ratings.filter(r=>r.arm===arm), m=metrics.filter(r=>r.arm===arm);
  return { arm, delivered:m.filter(r=>r.available).length, planned:12,
    resumeMedian:median(rows.filter(r=>r.kind==='resume').map(r=>r.total)),letterMedian:median(rows.filter(r=>r.kind==='letter').map(r=>r.total)),
    evidenceFail:rows.filter(r=>r.evidenceGate==='fail').length,evidenceReview:rows.filter(r=>r.evidenceGate==='review').length,
    acceptedPairs:comparisonCases.filter(c=>rows.filter(r=>r.caseId===c.id).length===2&&rows.filter(r=>r.caseId===c.id).every(r=>r.accepted)).length,
    medianSeconds:median(m.map(r=>r.durationMs))/1000,providerCalls:m.reduce((n,r)=>n+r.calls,0),
    inputTokens:m.reduce((n,r)=>n+r.inputTokens,0),outputTokens:m.reduce((n,r)=>n+r.outputTokens,0),reasoningTokens:m.reduce((n,r)=>n+r.reasoningTokens,0),
  };
});
const paired = ['reasoning','selection','confirmed_pipeline'].flatMap(arm=>['resume','letter'].map(kind=>{
  const comparisons=comparisonCases.map(c=>{const base=ratings.find(r=>r.caseId===c.id&&r.arm==='simple'&&r.kind===kind),other=ratings.find(r=>r.caseId===c.id&&r.arm===arm&&r.kind===kind);return {caseId:c.id,delta:base.total===null||other.total===null?null:other.total-base.total,baseGate:base.evidenceGate,otherGate:other.evidenceGate};});
  return {arm,kind,comparisons,wins:comparisons.filter(r=>r.delta>0).length,ties:comparisons.filter(r=>r.delta===0).length,losses:comparisons.filter(r=>r.delta<0).length,unavailable:comparisons.filter(r=>r.delta===null).length,gainsAtLeastTwo:comparisons.filter(r=>r.delta>=2).length};
}));
fs.writeFileSync(path.join(root,'summary.json'),JSON.stringify({summary,paired},null,2));
console.log(JSON.stringify({summary,paired},null,2));

// The label map is a separate file. No arm name or scores enter the review HTML.
const mapPath=path.join(root,'review-label-key.json');
let labelMap;
if(fs.existsSync(mapPath)) labelMap=JSON.parse(fs.readFileSync(mapPath));
else {labelMap={};for(const c of comparisonCases)for(const kind of ['resume','letter']){
  const arms=['confirmed_pipeline','simple','reasoning','selection'];
  for(let i=arms.length-1;i>0;i--){const j=crypto.randomInt(i+1);[arms[i],arms[j]]=[arms[j],arms[i]];}
  labelMap[`${c.id}-${kind}`]=Object.fromEntries(arms.map((arm,i)=>[String.fromCharCode(65+i),arm]));
}fs.writeFileSync(mapPath,JSON.stringify(labelMap,null,2),{flag:'wx'});}
const packets=comparisonCases.flatMap(c=>['resume','letter'].map(kind=>({id:`${c.id}-${kind}`,name:c.name,role:c.job.title,kind,
  source:c.resume,job:JSON.stringify(c.job,null,2),options:Object.entries(labelMap[`${c.id}-${kind}`]).map(([label,arm])=>{
    const r=results.find(r=>r.caseId===c.id&&r.arm===arm&&r.kind===kind);
    return {label,text:documentText(deliveredDocument(r),kind),available:Boolean(deliveredDocument(r))};
  })})));
const data=JSON.stringify(packets).replaceAll('<','\\u003c');
const html=`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Gigscapes comparative document review</title>
<style>body{font:16px/1.6 system-ui;color:#17202a;background:#f2f4f7;margin:0}main{max-width:1400px;margin:auto;padding:28px}h1{font-size:30px}p{max-width:850px}select,button,textarea{font:inherit;padding:8px;border:1px solid #a7b0bd;border-radius:6px;background:white}button{cursor:pointer}label{display:block;margin:10px 0}nav{display:flex;gap:16px;align-items:center;flex-wrap:wrap}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;margin:20px 0}article,details{padding:20px;background:white;border:1px solid #d6dbe3;border-radius:10px}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:15px/1.65 Arial,sans-serif;margin:0}article h2{border-bottom:1px solid #ccd3de;padding-bottom:10px}.scores{display:flex;flex-wrap:wrap;gap:8px}.scores label{font-size:12px}.scores select{display:block;padding:4px;width:80px}textarea{width:90%;min-height:70px}@media(max-width:850px){.grid{grid-template-columns:1fr}}@media print{nav,.scores,textarea,button,#choice{display:none}body{background:white}article{break-inside:avoid}.grid{display:block}}</style>
<main><h1>Which documents would you send?</h1><p>Six fictional candidates, four versions each. Labels hide the generator. This packet uses the separately source-confirmed pipeline run and the original three baseline arms. All documents share this presentation; this is a writing review, not a template or Word/PDF test.</p><p>Check the source before rewarding a stronger claim. Rate relevance, useful detail, document purpose, organization and natural writing from 0 (unusable) to 4 (excellent). An unsupported fact overrides a good writing score. Leave anything you have not reviewed unrated.</p>
<nav><label>Candidate and document <select id="packet"></select></label><button id="save">Download my review</button><span id="status">Your ratings stay in this browser.</span></nav><details><summary>Candidate source and job</summary><h3>Candidate facts</h3><pre id="source"></pre><h3>Job</h3><pre id="job"></pre></details><section id="documents" class="grid"></section><section id="choice"><label>Preferred version <select id="winner"><option value="">Unreviewed</option><option>A</option><option>B</option><option>C</option><option>D</option><option>Tie</option><option>All need substantial work</option></select></label><label>What made the difference? Include any unsupported claim.<textarea id="notes"></textarea></label></section></main>
<script>const packets=${data};const dims=${JSON.stringify(dimensions)};let reviews={};try{reviews=JSON.parse(localStorage.getItem('gigscapes-comparative-human-v1')||'{}')}catch{}const sel=document.getElementById('packet');for(const p of packets){const o=document.createElement('option');o.value=p.id;o.textContent=p.name+' · '+p.role+' · '+p.kind;sel.append(o)}function persist(){try{localStorage.setItem('gigscapes-comparative-human-v1',JSON.stringify(reviews))}catch{document.getElementById('status').textContent='Storage unavailable; download your review before closing.'}}function record(){return reviews[sel.value]||(reviews[sel.value]={scores:{},preferred:'',notes:''})}function render(){const p=packets.find(p=>p.id===sel.value);document.getElementById('source').textContent=p.source;document.getElementById('job').textContent=p.job;const box=document.getElementById('documents');box.replaceChildren();for(const d of p.options){const article=document.createElement('article');const h=document.createElement('h2');h.textContent='Version '+d.label;const pre=document.createElement('pre');pre.textContent=d.text;article.append(h,pre);const scores=document.createElement('div');scores.className='scores';for(let i=0;i<dims.length;i++){const label=document.createElement('label');label.textContent=dims[i];const s=document.createElement('select');for(const val of ['',0,1,2,3,4]){const o=document.createElement('option');o.value=val;o.textContent=val===''?'Unrated':val;s.append(o)}s.value=record().scores[d.label]?.[i]??'';s.disabled=!d.available;s.onchange=()=>{const row=record();row.scores[d.label]??=Array(5).fill(null);row.scores[d.label][i]=s.value===''?null:Number(s.value);persist()};label.append(s);scores.append(label)}article.append(scores);box.append(article)}document.getElementById('winner').value=record().preferred;document.getElementById('notes').value=record().notes}sel.onchange=render;document.getElementById('winner').onchange=e=>{record().preferred=e.target.value;persist()};document.getElementById('notes').oninput=e=>{record().notes=e.target.value;persist()};document.getElementById('save').onclick=()=>{const data={experiment:'comparative-v1',reviewer:'user',exportedAt:new Date().toISOString(),maskedReviews:reviews};const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='gigscapes-human-comparison-review.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000)};render();</script></html>`;
fs.writeFileSync(path.join(root,'REVIEW_PACKET.html'),html);
