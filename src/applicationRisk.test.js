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

test("a majority of related evidence produces constructive match guidance instead of self-rejection", () => {
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
  assert.equal(view.outlook.status, "viable_transition_material_gaps");
  assert.equal(view.outlook.label, "Good match — review gaps");
  assert.doesNotMatch(view.outlook.reason, /legacy optimistic/i);
});

test("work authorization is an application question and does not reduce résumé fit", () => {
  const review = {
    posting_readiness: { fit_allowed: true },
    candidate_fit: { status: "strong", confidence: "high" },
    requirements: [
      requirement("D1", "direct", "supported"),
      { ...requirement("E1", "missing", "verified_blocker"), requirement: "Legally authorized to work in Canada" },
    ],
  };

  const view = buildApplicationRiskView(review);
  assert.equal(view.coreCounts.total, 1);
  assert.equal(view.counts.candidateChecks, 1);
  assert.equal(view.counts.blockers, 0);
  assert.equal(view.outlook.status, "strong_verified_alignment");
  assert.equal(view.requirements.find((entry) => entry.id === "E1").severityLabel, "Answer when applying");
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

test("mostly unsupported required capabilities still receive substantial-tailoring guidance", () => {
  const review = {
    posting_readiness: { fit_allowed: true },
    candidate_fit: { status: "gap", confidence: "high" },
    requirements: [
      requirement("D1", "direct", "supported"),
      ...Array.from({ length: 5 }, (_, index) => requirement(`M${index}`, "missing", "material_gap")),
    ],
  };
  assert.equal(buildApplicationRiskView(review).outlook.status, "high_application_risk");
});
