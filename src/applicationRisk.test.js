import assert from "node:assert/strict";
import test from "node:test";

import { buildApplicationRiskView } from "./applicationRisk.js";

function requirement(id, evidenceMatch, gapSeverity) {
  return {
    id,
    requirement: `Core requirement ${id}`,
    priority: "required",
    evidence_match: evidenceMatch,
    gap_severity: gapSeverity,
  };
}

test("adjacent evidence alone cannot soften mandatory gaps into a viable outlook", () => {
  const review = {
    posting_readiness: { fit_allowed: true },
    candidate_fit: { status: "gap", confidence: "high" },
    requirements: [
      ...Array.from({ length: 5 }, (_, index) => requirement(`A${index}`, "adjacent", "supported")),
      ...Array.from({ length: 3 }, (_, index) => requirement(`M${index}`, "missing", "material_gap")),
    ],
    gap_summary: {
      outlook: {
        status: "viable_transition_material_gaps",
        label: "Viable transition with material gaps",
        reason: "Legacy optimistic result.",
      },
    },
  };

  const view = buildApplicationRiskView(review);

  assert.equal(view.coreCounts.verifiedStrengths, 0);
  assert.equal(view.coreCounts.relatedEvidence, 5);
  assert.equal(view.coreCounts.materialGaps, 3);
  assert.equal(view.outlook.status, "high_application_risk");
  assert.equal(view.outlook.label, "High application risk");
  assert.doesNotMatch(view.outlook.reason, /legacy optimistic/i);
});

test("a limited core gap remains viable only when direct evidence outweighs it", () => {
  const review = {
    posting_readiness: { fit_allowed: true },
    candidate_fit: { status: "adjacent", confidence: "high" },
    requirements: [
      ...Array.from({ length: 5 }, (_, index) => requirement(`D${index}`, "direct", "supported")),
      requirement("M1", "missing", "material_gap"),
    ],
  };

  const view = buildApplicationRiskView(review);
  assert.equal(view.outlook.status, "viable_transition_material_gaps");
});
