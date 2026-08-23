import assert from "node:assert/strict";
import test from "node:test";

import { normalizeCustomJobBrief } from "../api/_lib/jobBrief.js";

test("partial screenshot batches remain mergeable when a later page has no repeated title", () => {
  const brief = normalizeCustomJobBrief({
    title: "",
    company: "FED IT",
    description: "Required qualifications include SAP MM configuration and SAP SD integration.",
    responsibilities: ["- Support integration testing", "• Support integration testing"],
    required_qualifications: ["SAP MM experience"],
    preferred_qualifications: [],
    keywords: ["SAP MM"],
    source_review: {
      mode: "screenshots",
      page_count: 2,
      appears_complete: true,
      completeness_notes: "The final qualifications page is visible.",
      conflicts: [],
    },
  });

  assert.ok(brief);
  assert.equal(brief.title, "");
  assert.deepEqual(brief.responsibilities, ["Support integration testing"]);
  assert.equal(brief.source_review.user_confirmed_complete, false);
});

test("non-screenshot intake still requires both a title and description", () => {
  assert.equal(normalizeCustomJobBrief({
    title: "",
    description: "A pasted posting without a job title.",
    source_review: { mode: "paste" },
  }), null);
});
