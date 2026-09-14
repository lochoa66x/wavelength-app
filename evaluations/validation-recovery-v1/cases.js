import { comparisonCases } from '../comparative-v1/cases.js';
import { freshCases } from './fresh-cases.js';
export const recoveryCases = [...comparisonCases.map(c=>({...c,job:{...c.job,source_review:{mode:'paste',appears_complete:true,user_confirmed_complete:true,conflicts:[],conflicts_resolved:true}}})),...freshCases];
export const recoveryQueue = recoveryCases.flatMap(c=>['resume','letter'].map(kind=>({caseId:c.id,arm:'pipeline',kind})));
