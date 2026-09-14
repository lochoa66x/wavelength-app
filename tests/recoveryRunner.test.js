import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {recoveryCases,recoveryQueue} from '../evaluations/validation-recovery-v1/cases.js';
import {createRecoveryHandler,EXPERIMENT_CLOSES} from '../evaluations/validation-recovery-v1/runner.js';
import {sourceHistoryEntries} from '../api/_lib/atsValidation.js';
const hash=s=>createHash('sha256').update(s).digest('hex');
test('recovery runner keeps 32 unique cells and ten preregistered sources unchanged',()=>{
 assert.equal(recoveryQueue.length,32);assert.equal(new Set(recoveryQueue.map(c=>JSON.stringify(c))).size,32);
 const manifest=JSON.parse(fs.readFileSync(new URL('../evaluations/validation-recovery-v1/fresh-manifest.json',import.meta.url)));
 assert.equal(manifest.cases.length,10);
 for(const row of manifest.cases){const c=recoveryCases.find(c=>c.id===row.id);assert.equal(hash(JSON.stringify(c)),row.sha256);assert.equal(sourceHistoryEntries(c.resume).length,2,c.id);}
});
test('recovery endpoint rejects unauthenticated, expired, altered and unknown inputs before provider work',async()=>{
 let calls=0;
 for(const input of [{auth:false},{key:'wrong'},{expired:true},{extra:true},{caseId:'UNKNOWN'}]){
  const handler=createRecoveryHandler({authenticate:async()=>input.auth===false?null:{user:{id:'test'}},capabilityHash:hash('test-key'),now:()=>EXPERIMENT_CLOSES-(input.expired?0:1000),fetchImpl:async()=>{calls++;throw new Error('unexpected');}});
  const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(body){this.body=body;}};
  await handler({method:'POST',headers:{authorization:'Bearer test'},body:{caseId:input.caseId||'C01',arm:'pipeline',kind:'resume',capability:input.key||'test-key',...(input.extra?{resume:'arbitrary'}:{})}},res);
  assert.ok([400,401,403].includes(res.code));assert.match(res.headers['Cache-Control'],/no-store/);
 }
 assert.equal(calls,0);
});
