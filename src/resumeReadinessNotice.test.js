import assert from "node:assert/strict";
import test from "node:test";

import { getResumeExportNotice } from "./resumeReadiness.js";

const completeReview = {
  application_ready: true,
  posting_readiness: { status: "reviewed_complete", fit_allowed: true, application_ready_allowed: true },
  readiness: { status: "strong_fit" },
  integrity: { status: "pass" },
  writing: { status: "pass" },
  export_readiness: { status: "ready", application_ready: true },
};

test("export notices distinguish final, incomplete-posting, evidence, and identity states", () => {
  assert.equal(getResumeExportNotice({ name: "Avery Chen" }, completeReview).code, "application_ready");
  assert.equal(getResumeExportNotice({ name: "Avery Chen" }, {
    ...completeReview,
    application_ready: false,
    posting_readiness: { status: "needs_full_posting", fit_allowed: false, application_ready_allowed: false },
  }).code, "posting_incomplete");
  assert.equal(getResumeExportNotice({ name: "Avery Chen" }, {
    ...completeReview,
    application_ready: false,
    export_readiness: { status: "blocked", application_ready: false },
  }).code, "evidence_review_incomplete");
  assert.equal(getResumeExportNotice({ name: "candidate" }, completeReview).code, "missing_identity");
});
