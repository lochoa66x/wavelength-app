import assert from "node:assert/strict";
import test from "node:test";

import {
  filterEligibleAtsBoards,
  JOB_SOURCE_POLICY_VERSION,
  parseDisabledJobSources,
  skippedSourceImport,
  sourceImportDecision,
} from "../api/_lib/sourcePolicy.js";

test("source policy parses a bounded case-insensitive emergency-disable list", () => {
  const disabled = parseDisabledJobSources(" Jobicy,ADZUNA,jobicy ");

  assert.deepEqual([...disabled].sort(), ["adzuna", "jobicy"]);
  assert.match(JOB_SOURCE_POLICY_VERSION, /^\d{4}-\d{2}-\d{2}$/);
  assert.throws(
    () => parseDisabledJobSources("jobicy,unreviewed-provider"),
    /unsupported source/,
  );
});

test("source decisions separate configuration from an explicit policy stop", () => {
  assert.deepEqual(sourceImportDecision({ source: "jobicy" }), { enabled: true });
  assert.deepEqual(sourceImportDecision({ source: "jooble", configured: false }), {
    enabled: false,
    skipCategory: "configuration",
  });
  assert.deepEqual(sourceImportDecision({
    source: "adzuna",
    disabledSources: new Set(["adzuna"]),
  }), {
    enabled: false,
    skipCategory: "disabled_by_policy",
  });
  assert.throws(() => sourceImportDecision({ source: "unknown" }), /Unsupported job source/);
});

test("policy skips expose only a safe category and zeroed metrics", () => {
  const skipped = skippedSourceImport(
    { enabled: false, skipCategory: "disabled_by_policy" },
    { boards: 2 },
  );

  assert.deepEqual(skipped, {
    skipped: true,
    skipCategory: "disabled_by_policy",
    requests: 0,
    received: 0,
    saved: 0,
    boards: 2,
  });
  assert.equal(JSON.stringify(skipped).includes("JOB_SOURCE_DISABLED"), false);
});

test("disabled ATS providers are filtered without mutating configured boards", () => {
  const boards = [
    { provider: "greenhouse", board: "one" },
    { provider: "lever", board: "two" },
    { provider: "ashby", board: "three" },
  ];

  assert.deepEqual(
    filterEligibleAtsBoards(boards, new Set(["lever"])).map(({ provider }) => provider),
    ["greenhouse", "ashby"],
  );
  assert.equal(boards.length, 3);
});
