import { buildQualitySignal } from "../src/qualitySignalContract.js";
import { evaluateQualitySignals } from "../src/qualitySignalEvaluation.js";

const synthetic = [
  { signal: buildQualitySignal("tailoring_completed", { route: "app", postingSource: "public_listing", outcome: "completed" }), count: 18 },
  { signal: buildQualitySignal("export_completed", { route: "app", postingSource: "public_listing", exportFormat: "docx", outcome: "completed" }), count: 14 },
  { signal: buildQualitySignal("export_failed", { route: "custom_job", postingSource: "screenshots", exportFormat: "pdf", outcome: "failed", errorCategory: "unknown" }), count: 3 },
];

console.log(JSON.stringify(evaluateQualitySignals(synthetic), null, 2));
