import assert from "node:assert/strict";
import test from "node:test";

import { normalizeCustomJobBrief } from "./jobBrief.js";

test("job brief normalization combines compatible employment details and clears the false gate", () => {
  const brief = normalizeCustomJobBrief({
    title: "SAP ISU FICA Consultant",
    company: "Technitask",
    type: "Contract (6 months)",
    category: "tech",
    description: "Configure and implement SAP ISU solutions for utilities-sector clients.",
    source_review: {
      mode: "paste",
      appears_complete: true,
      user_confirmed_complete: true,
      conflicts: [{
        field: "employment_type",
        values: [
          "Full-time (stated in header)",
          "Contract – 6 months (stated in Additional Information)",
        ],
      }],
      conflicts_resolved: false,
    },
  });

  assert.equal(brief.type, "Full-time contract (6 months)");
  assert.deepEqual(brief.source_review.conflicts, []);
  assert.equal(brief.source_review.conflicts_resolved, true);
});

test("job brief normalization preserves a genuine full-time versus part-time conflict", () => {
  const brief = normalizeCustomJobBrief({
    title: "Operations Coordinator",
    type: "Full-time",
    category: "admin",
    description: "Coordinate daily operational activities and reporting.",
    source_review: {
      mode: "paste",
      conflicts: [{ field: "employment_type", values: ["Full-time", "Part-time"] }],
      conflicts_resolved: false,
    },
  });

  assert.equal(brief.type, "Full-time");
  assert.equal(brief.source_review.conflicts.length, 1);
  assert.equal(brief.source_review.conflicts_resolved, false);
});

