import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {freshCases} from '../evaluations/validation-recovery-v1/fresh-cases.js';
import {recoverSelectedProjects} from '../api/_lib/resumeProjectRecovery.js';
import {restoreCitedResumeBullets} from '../api/_lib/resumeSourceRepair.js';
import {createTailorHandler} from '../api/tailor.js';
const capture=id=>JSON.parse(fs.readFileSync(new URL('../evaluations/validation-recovery-v1/retest/'+id+'-resume-attempt-2.json',import.meta.url)));
for(const id of ['R06','R08'])test(id+': source project recovery retains the example without borrowing the following job',()=>{
 const c=freshCases.find(c=>c.id===id),r=capture(id);
 const fixed=recoverSelectedProjects(r.delivered.resume,c.resume);
 assert.equal(fixed.projects.length,1);
 assert.ok(fixed.projects[0].bullets[0].includes(id==='R06'?'worn insert':'pedestrian route'));
 assert.ok(!JSON.stringify(fixed.projects).includes('Example Earlier Workplace'));
 assert.deepEqual(recoverSelectedProjects(fixed,c.resume),fixed);
 const inExperience={...r.delivered.resume,experience:[{...r.delivered.resume.experience[0],bullets:fixed.projects[0].bullets}]};
 assert.equal(recoverSelectedProjects(inExperience,c.resume).projects,undefined,'the complete source statement can already have a deliberate home in experience');
});
test('source repair removes only a duplicate statement and preserves a distinct condition',()=>{
 const original='Prepared ropes and ground equipment from the crew leader’s checklist and maintained the marked exclusion zone.';
 const resume={experience:[{bullets:['Prepare ropes and ground equipment from the crew leader’s checklist and maintain the marked exclusion zone.','Prepared ropes after the supervisor approved replacement equipment.','Invented unsupported project task.']}]};
 const fixed=restoreCitedResumeBullets(resume,{provenance_issues:[{experience_index:0,bullet_index:2,original,restorable_original:true}]});
 assert.equal(fixed.restored,1);assert.equal(fixed.resume.experience[0].bullets.length,2);
 assert.ok(fixed.resume.experience[0].bullets[1].includes('approved'));
});
test('trades generation schema and normal handler preserve an explicit project through validation',async()=>{
 const c=freshCases.find(c=>c.id==='R06'),r=capture('R06');
 const analysis=JSON.parse(r.calls[0].response.output.find(e=>e.type==='function_call').arguments);
 let sawTrades=false;
 const handler=createTailorHandler({authenticate:async()=>({user:{id:'fixture'},supabase:{}}),getApiKey:()=> 'test-fixture',getOpenAIKey:()=>undefined,reviewContent:async({document})=>({document,applied:false,status:'not_tested_here'}),fetchImpl:async(_url,options)=>{
  const body=JSON.parse(options.body),name=body.tool_choice.name;
  if(name!=='return_tailoring_analysis'){assert.equal(name,'return_trades_resume');assert.ok(body.tools[0].input_schema.properties.projects);sawTrades=true;}
  return {ok:true,json:async()=>({content:[{type:'tool_use',name,input:name==='return_tailoring_analysis'?analysis:r.delivered.resume}]})};
 }});
 const res={setHeader(){},status(code){this.code=code;return this;},json(body){this.body=body;}};
 await handler({method:'POST',headers:{authorization:'Bearer fixture'},body:{resume:c.resume,customJob:c.job}},res);
 assert.equal(res.code,200,JSON.stringify(res.body.ats_review));assert.ok(sawTrades);
 assert.equal(res.body.resume.projects.length,1);
 assert.match(res.body.resume.projects[0].bullets[0],/worn insert/);
});
