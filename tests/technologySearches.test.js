import assert from "node:assert/strict";
import test from "node:test";

import { ADZUNA_REQUEST_BUDGET, buildAdzunaSearchPlan } from "../api/_lib/adzuna.js";
import { JOOBLE_REQUEST_BUDGET, buildJoobleSearchPlan } from "../api/_lib/jooble.js";
import { selectDailyTechnologySearches } from "../api/_lib/technologySearches.js";

test("keeps SAP and major languages in every daily technology plan", () => {
  for (const date of [new Date("2026-08-20T12:00:00Z"), new Date("2026-08-21T12:00:00Z")]) {
    const searches = selectDailyTechnologySearches(date);
    assert.equal(searches.length, 4);
    assert.ok(searches.some(({ keywords }) => keywords.includes("SAP S/4HANA")));
    assert.ok(searches.some(({ keywords }) => keywords.includes("Java Python C++")));
  }
});

test("rotates supplementary technology families deterministically by UTC day", () => {
  const firstDate = new Date("2026-08-20T12:00:00Z");
  const nextDate = new Date("2026-08-21T12:00:00Z");
  assert.deepEqual(selectDailyTechnologySearches(firstDate), selectDailyTechnologySearches(firstDate));
  assert.notDeepEqual(selectDailyTechnologySearches(firstDate), selectDailyTechnologySearches(nextDate));
});

test("keeps provider plans within their existing request budgets", () => {
  const date = new Date("2026-08-20T12:00:00Z");
  const adzuna = buildAdzunaSearchPlan([], date);
  const jooble = buildJoobleSearchPlan(date);

  assert.ok(adzuna.length + 1 < ADZUNA_REQUEST_BUDGET);
  assert.ok(jooble.length < JOOBLE_REQUEST_BUDGET);
  assert.ok(adzuna.some(({ params }) => params.what_or?.includes("SAP S/4HANA")));
  assert.ok(jooble.some(({ keywords }) => keywords.includes("Java Python C++")));
});
