import { evaluateQualityCorpus } from "../src/qualityEvaluation.js";
import {
  qualityEvaluationCorpus,
  qualityEvaluationForbiddenTerms,
} from "../tests/fixtures/qualityEvaluationCorpus.js";

const report = evaluateQualityCorpus(qualityEvaluationCorpus, {
  forbiddenTerms: qualityEvaluationForbiddenTerms,
});

process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
if (!report.releaseGate.passed) process.exitCode = 1;
