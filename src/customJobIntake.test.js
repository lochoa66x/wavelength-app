import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  appendScreenshotFiles,
  customJobSourceReviewState,
  MAX_SCREENSHOTS,
  mergeExtractedJobBriefs,
  screenshotBatches,
} from "./customJobIntake.js";

function screenshot(name, size = 1000, lastModified = 1) {
  return { name, size, type: "image/png", lastModified };
}

test("multi-page screenshot intake batches six pages without dropping any", () => {
  const pages = Array.from({ length: 6 }, (_, index) => screenshot(`page-${index + 1}.png`));
  const batches = screenshotBatches(pages);

  assert.deepEqual(batches.map((batch) => batch.length), [4, 2]);
  assert.deepEqual(batches.flat().map((file) => file.name), pages.map((file) => file.name));
});

test("screenshot selection ignores duplicate files and enforces the visible limit", () => {
  const existing = [screenshot("page-1.png")];
  const incoming = [
    screenshot("page-1.png"),
    ...Array.from({ length: 10 }, (_, index) => screenshot(`page-${index + 2}.png`, 1000 + index)),
  ];
  const selected = appendScreenshotFiles(existing, incoming);

  assert.equal(selected.length, MAX_SCREENSHOTS);
  assert.equal(selected.filter((file) => file.name === "page-1.png").length, 1);
  assert.equal(selected.at(-1).name, "page-8.png");
});

test("screenshot extraction merges repeated content and exposes source conflicts", () => {
  const merged = mergeExtractedJobBriefs([
    {
      title: "Senior SAP MM / SD Functional Analyst",
      company: "FED IT",
      description: "Support procurement, replenishment, and supply-chain operations.",
      responsibilities: ["• Gather and document business requirements", "Configure SAP MM"],
      required_qualifications: ["Five years of SAP functional experience"],
      preferred_qualifications: [],
      keywords: ["SAP MM", "SAP SD"],
      source_review: { appears_complete: false, completeness_notes: "More pages follow." },
    },
    {
      title: "Senior SAP MM/SD Functional Analyst",
      company: "FedIT Recruiting",
      description: "Partner with ABAP developers and support testing through go-live.",
      responsibilities: ["Gather and document business requirements", "Support user acceptance testing"],
      required_qualifications: ["5 years of SAP functional experience"],
      preferred_qualifications: ["Retail supply-chain experience"],
      keywords: ["SAP SD", "UAT"],
      source_review: { appears_complete: true, completeness_notes: "The posting footer is visible." },
    },
  ], { pageCount: 6 });

  assert.equal(merged.source_review.page_count, 6);
  assert.equal(merged.source_review.user_confirmed_complete, false);
  assert.equal(merged.source_review.conflicts_resolved, false);
  assert.deepEqual(merged.source_review.conflicts, [{
    field: "company",
    values: ["FED IT", "FedIT Recruiting"],
  }]);
  assert.deepEqual(merged.responsibilities, [
    "Gather and document business requirements",
    "Configure SAP MM",
    "Support user acceptance testing",
  ]);
  assert.deepEqual(merged.keywords, ["SAP MM", "SAP SD", "UAT"]);
});

test("paste or URL conflicts expose a resolvable source review instead of a hidden screenshot gate", async () => {
  const unresolved = customJobSourceReviewState({
    mode: "paste",
    user_confirmed_complete: true,
    conflicts: [{ field: "company", values: ["Architecture In Motion Inc.", "Manufacturing client"] }],
    conflicts_resolved: false,
  });
  assert.equal(unresolved.isScreenshotReview, false);
  assert.equal(unresolved.needsScreenshotConfirmation, false);
  assert.equal(unresolved.needsConflictResolution, true);
  assert.equal(unresolved.showSourceReviewPanel, true);
  assert.equal(unresolved.blocked, true);
  assert.match(unresolved.blockingMessage, /conflicting source details/i);
  assert.doesNotMatch(unresolved.blockingMessage, /screenshot review/i);

  const resolved = customJobSourceReviewState({
    mode: "paste",
    conflicts: unresolved.conflicts,
    conflicts_resolved: true,
  });
  assert.equal(resolved.blocked, false);

  const flowSource = await readFile(new URL("./CustomJobFlow.jsx", import.meta.url), "utf8");
  assert.match(flowSource, /showSourceReviewPanel &&/);
  assert.match(flowSource, /Review conflicting source details/);
  assert.match(flowSource, /sourceReviewBlockingMessage/);
  assert.doesNotMatch(flowSource, /Complete the screenshot review above/);
});
