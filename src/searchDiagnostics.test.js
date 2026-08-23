import assert from "node:assert/strict";
import test from "node:test";

import { inferKeywordIntent } from "./listingCategories.js";
import { diagnoseSearchResults } from "./searchDiagnostics.js";

test("distinguishes an unknown query from recognized technology with thin inventory", () => {
  const unknown = diagnoseSearchResults({
    keyword: "make it awesome",
    intent: inferKeywordIntent("make it awesome"),
    availableCount: 7,
  });
  assert.equal(unknown.kind, "unrecognized");

  const sap = diagnoseSearchResults({
    keyword: "IT SAP",
    intent: inferKeywordIntent("IT SAP"),
    availableCount: 7,
    keywordMatchCount: 0,
    hasLocationFilter: true,
  });
  assert.equal(sap.kind, "keyword_inventory");
  assert.match(sap.message, /recognize SAP/i);
  assert.match(sap.message, /7 loaded listings/i);
  assert.equal(sap.canBroadenLocation, true);
});

test("reports work-type and location mismatches separately", () => {
  const intent = inferKeywordIntent("Java");
  const workType = diagnoseSearchResults({
    keyword: "Java",
    intent,
    availableCount: 12,
    keywordMatchCount: 3,
    workTypeMatchCount: 0,
    filterByWorkType: true,
  });
  assert.equal(workType.kind, "work_type");

  const location = diagnoseSearchResults({
    keyword: "Java",
    intent,
    availableCount: 12,
    keywordMatchCount: 3,
    workTypeMatchCount: 2,
    filteredCount: 0,
    hasLocationFilter: true,
    locationLabel: "on-site in Quebec, Canada",
  });
  assert.equal(location.kind, "location");
  assert.match(location.message, /Quebec, Canada/);
});

test("returns no diagnostic when credible matches are visible", () => {
  assert.equal(diagnoseSearchResults({
    keyword: "Python",
    intent: inferKeywordIntent("Python"),
    availableCount: 20,
    keywordMatchCount: 4,
    workTypeMatchCount: 4,
    filteredCount: 2,
    hasLocationFilter: true,
  }), null);
});
