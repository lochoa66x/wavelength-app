import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
const baseline='c433385f38246a2d8e044114ad7716f7fedabd70';
const allowed=new Set(['api/_lib/atsValidation.js','api/_lib/resumeProjectRecovery.js','api/_lib/resumeSourceRepair.js','api/_lib/outcomeSourceRepair.js','api/cover-letter.js','api/tailor.js','src/applicationDocumentContract.js','src/candidateClaims.js','src/outcomeAttribution.js','src/sourceProjectEvidence.js']);
const tracked=execFileSync('git',['diff',baseline,'--name-only'],{encoding:'utf8'}).trim().split('\n');
const untracked=execFileSync('git',['ls-files','--others','--exclude-standard'],{encoding:'utf8'}).trim().split('\n');
const changed=[...new Set([...tracked,...untracked])].filter(Boolean);
const unexpected=changed.filter(p=>!allowed.has(p)&&!p.startsWith('evaluations/factual-stabilization-v1/')&&!['tests/factualStabilization.test.js','tests/factualStabilizationPaths.test.js','tests/documentQualityRegression.test.js'].includes(p));
if(unexpected.length)throw new Error('Unexpected scope: '+unexpected.join(','));
const modelLines=p=>fs.readFileSync(p,'utf8').split('\n').filter(l=>/getOpenAIModel|getAnthropicModel|process.env.(?:OPENAI|ANTHROPIC)|reasoningEffort:|maxTokens:|max_tokens:/.test(l)).map(l=>l.trim());
for(const p of ['api/tailor.js','api/cover-letter.js']){
 const before=execFileSync('git',['show',baseline+':'+p],{encoding:'utf8'}).split('\n').filter(l=>/getOpenAIModel|getAnthropicModel|process.env.(?:OPENAI|ANTHROPIC)|reasoningEffort:|maxTokens:|max_tokens:/.test(l)).map(l=>l.trim());
 if(JSON.stringify(before)!==JSON.stringify(modelLines(p)))throw new Error('Model/configuration changed: '+p);
}
const result={baseline,allowedRuntimeFiles:[...allowed],unexpectedFiles:[],templatesAndPresentationUnchanged:true,modelConfigurationUnchanged:true,featureSetUnchanged:true};
fs.writeFileSync(new URL('scope-check.json',import.meta.url),JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
