import test from "node:test";
import assert from "node:assert/strict";

import {
  buildJobicyFeedUrl,
  deterministicJobicyListingId,
  fetchJobicyListings,
  mapJobicyResult,
  runJobicyIngestion,
} from "../api/_lib/jobicy.js";

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}

const sampleJob = {
  id: 4815,
  url: "https://jobicy.com/jobs/4815-remote-support-specialist",
  jobTitle: "Remote IT Support Specialist - Full Time",
  companyName: "Maple Cloud",
  jobIndustry: ["Technology"],
  jobType: ["full-time"],
  jobGeo: "Canada",
  jobExcerpt: "Help Canadian customers.",
  jobDescription: "<p>Help <strong>Canadian</strong> customers &amp; teams.</p>",
  pubDate: "2026-08-19T10:00:00Z",
};

test("Jobicy requests a bounded Canada-only remote feed", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url: new URL(url), init });
    return jsonResponse({ jobs: [
      sampleJob,
      sampleJob,
      { ...sampleJob, id: 999, pubDate: "2026-05-01T10:00:00Z" },
    ] });
  };

  const feed = await fetchJobicyListings({
    fetchImpl,
    now: new Date("2026-08-20T12:00:00Z"),
  });

  assert.equal(feed.items.length, 1);
  assert.equal(feed.stats.requests, 1);
  assert.equal(calls[0].url.origin + calls[0].url.pathname, "https://jobicy.com/api/v2/remote-jobs");
  assert.equal(calls[0].url.searchParams.get("count"), "100");
  assert.equal(calls[0].url.searchParams.get("geo"), "canada");
  assert.equal(calls[0].init.headers.Accept, "application/json");
});

test("Jobicy feed URL is stable and does not require credentials", () => {
  assert.equal(
    buildJobicyFeedUrl().toString(),
    "https://jobicy.com/api/v2/remote-jobs?count=100&geo=canada",
  );
});

test("Jobicy mapping preserves canonical attribution and structured Canada-remote fields", () => {
  const row = mapJobicyResult(sampleJob, {
    now: new Date("2026-08-20T12:00:00Z"),
  });

  assert.equal(row.source, "jobicy");
  assert.equal(row.external_id, "4815");
  assert.equal(row.category, "tech");
  assert.equal(row.job_type, "full-time");
  assert.equal(row.location_type, "remote");
  assert.equal(row.country_code, "CA");
  assert.equal(row.url, sampleJob.url);
  assert.equal(row.description, "Help Canadian customers & teams.");
  assert.equal(row.description_snippet, "Help Canadian customers & teams.");
  assert.match(row.reason, /from Jobicy$/);
  assert.equal(row.tier, "HIGH");
});

test("Jobicy mapping rejects non-Jobicy URLs", () => {
  assert.equal(mapJobicyResult({
    ...sampleJob,
    url: "https://example.com/copied-job",
  }), null);
});

test("Jobicy listing IDs are stable and source-scoped UUIDs", () => {
  const first = deterministicJobicyListingId("4815");
  assert.equal(first, deterministicJobicyListingId("4815"));
  assert.notEqual(first, deterministicJobicyListingId("4816"));
  assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("Jobicy ingestion preserves IDs and prunes only after a valid save", async () => {
  const upserted = [];
  let pruneCalls = 0;
  const supabase = {
    from(table) {
      assert.equal(table, "listings");
      return {
        select() {
          return {
            eq() {
              return {
                in: async () => ({
                  data: [{ id: "existing-uuid", external_id: "4815" }],
                  error: null,
                }),
              };
            },
          };
        },
        upsert: async (rows) => {
          upserted.push(...rows);
          return { error: null };
        },
        delete() {
          return {
            eq() {
              return {
                lt: async () => {
                  pruneCalls += 1;
                  return { count: 2, error: null };
                },
                is() {
                  return {
                    lt: async () => {
                      pruneCalls += 1;
                      return { count: 1, error: null };
                    },
                  };
                },
              };
            },
          };
        },
      };
    },
  };

  const summary = await runJobicyIngestion({
    supabase,
    fetchImpl: async () => jsonResponse({ jobs: [
      sampleJob,
      { ...sampleJob, id: 4816, url: "https://jobicy.com/jobs/4816-remote-assistant" },
    ] }),
    now: new Date("2026-08-20T12:00:00Z"),
  });

  assert.equal(summary.inserted, 1);
  assert.equal(summary.updated, 1);
  assert.equal(summary.pruned, 3);
  assert.equal(pruneCalls, 2);
  assert.equal(upserted.find(({ external_id: id }) => id === "4815").id, "existing-uuid");
  assert.equal(
    upserted.find(({ external_id: id }) => id === "4816").id,
    deterministicJobicyListingId("4816"),
  );
});

test("Jobicy leaves existing rows untouched when the fresh batch is empty", async () => {
  let databaseCalls = 0;
  const supabase = {
    from() {
      databaseCalls += 1;
      throw new Error("Database should not be touched");
    },
  };

  await assert.rejects(() => runJobicyIngestion({
    supabase,
    fetchImpl: async () => jsonResponse({ jobs: [] }),
    now: new Date("2026-08-20T12:00:00Z"),
  }), /existing data was left unchanged/);

  assert.equal(databaseCalls, 0);
});
