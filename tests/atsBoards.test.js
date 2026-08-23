import test from "node:test";
import assert from "node:assert/strict";

import {
  buildAtsBoardUrl,
  mapAtsResult,
  parseAtsBoardConfig,
  runAtsBoardIngestion,
} from "../api/_lib/atsBoards.js";

test("ATS board configuration is server-only, validated, and deduplicated", () => {
  const config = parseAtsBoardConfig(JSON.stringify([
    { provider: "greenhouse", board: "Acme", company: "Acme Inc." },
    { provider: "GREENHOUSE", board: "acme", company: "Duplicate" },
    { provider: "lever", board: "maple-software" },
    { provider: "unsupported", board: "ignored" },
    { provider: "ashby", board: "not valid!" },
  ]));

  assert.deepEqual(config, [
    { provider: "greenhouse", board: "Acme", company: "Acme Inc." },
    { provider: "lever", board: "maple-software", company: "maple-software" },
  ]);
  assert.throws(() => parseAtsBoardConfig("not-json"), /JSON array/);
});

test("ATS providers use their documented public job-board endpoints", () => {
  assert.equal(
    buildAtsBoardUrl({ provider: "greenhouse", board: "acme" }).toString(),
    "https://boards-api.greenhouse.io/v1/boards/acme/jobs?content=true",
  );
  assert.equal(
    buildAtsBoardUrl({ provider: "lever", board: "acme" }).toString(),
    "https://api.lever.co/v0/postings/acme?mode=json",
  );
  assert.equal(
    buildAtsBoardUrl({ provider: "ashby", board: "acme" }).toString(),
    "https://api.ashbyhq.com/posting-api/job-board/acme?includeCompensation=true",
  );
});

test("employer-direct mapping preserves each ATS provider's canonical URL", () => {
  const now = new Date("2026-08-20T12:00:00Z");
  const greenhouse = mapAtsResult(
    { provider: "greenhouse", board: "acme", company: "Acme" },
    {
      id: 1,
      title: "SAP Analyst",
      location: { name: "Toronto, Ontario" },
      absolute_url: "https://job-boards.greenhouse.io/acme/jobs/1",
      updated_at: "2026-08-19T10:00:00Z",
      content: "Support SAP delivery.",
    },
    { now },
  );
  const lever = mapAtsResult(
    { provider: "lever", board: "maple", company: "Maple" },
    {
      id: "l-1",
      text: "Remote Java Developer",
      categories: { location: "Remote - Canada", commitment: "Full-time", team: "Engineering" },
      hostedUrl: "https://jobs.lever.co/maple/l-1",
      createdAt: 1787143200000,
      descriptionPlain: "Build Java services.",
    },
    { now },
  );
  const ashby = mapAtsResult(
    { provider: "ashby", board: "northstar", company: "Northstar" },
    {
      id: "a-1",
      title: "Python Developer",
      location: "Montréal, Quebec",
      jobUrl: "https://jobs.ashbyhq.com/northstar/a-1",
      publishedAt: "2026-08-19T10:00:00Z",
      descriptionPlain: "Build Python services.",
    },
    { now },
  );

  assert.equal(greenhouse.source, "greenhouse");
  assert.equal(greenhouse.country_code, "CA");
  assert.equal(greenhouse.category, "tech");
  assert.equal(lever.source, "lever");
  assert.equal(lever.location_type, "remote");
  assert.equal(lever.country_code, "CA");
  assert.equal(ashby.source, "ashby");
  assert.equal(ashby.city, "Montréal");
  assert.equal(ashby.country_code, "CA");
});

test("employer-direct mapping excludes obvious US-only roles", () => {
  assert.equal(mapAtsResult(
    { provider: "lever", board: "acme", company: "Acme" },
    {
      id: "l-1",
      text: "Python Developer",
      categories: { location: "Remote - United States only" },
      hostedUrl: "https://jobs.lever.co/acme/l-1",
    },
  ), null);
});

test("ATS ingestion skips cleanly until employer boards are configured", async () => {
  assert.deepEqual(await runAtsBoardIngestion({ supabase: {}, boards: [] }), {
    skipped: true,
    boards: 0,
    received: 0,
    saved: 0,
  });
});
