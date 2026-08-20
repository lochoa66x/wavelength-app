import test from "node:test";
import assert from "node:assert/strict";

import {
  ADZUNA_REQUEST_BUDGET,
  buildAdzunaSearchPlan,
  deterministicListingId,
  fetchAdzunaListings,
  mapAdzunaResult,
  runAdzunaIngestion,
  selectRelevantAdzunaCategories,
} from "../api/_lib/adzuna.js";
import { createAdzunaCronHandler, getAdzunaCronConfig } from "../api/cron/adzuna.js";

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => payload,
  };
}

const config = {
  adzunaAppId: "app-id",
  adzunaAppKey: "app-key",
  cronSecret: "cron-secret",
  supabaseUrl: "https://example.supabase.co",
  supabaseSecretKey: "sb_secret_test",
};

test("category discovery covers the Canadian jobs-and-gigs catalogue within quota", () => {
  const categories = selectRelevantAdzunaCategories({
    results: [
      { tag: "it-jobs", label: "IT Jobs" },
      { tag: "trade-construction-jobs", label: "Trade & Construction Jobs" },
      { tag: "maintenance-jobs", label: "Maintenance Jobs" },
      { tag: "admin-jobs", label: "Admin Jobs" },
      { tag: "customer-services-jobs", label: "Customer Services Jobs" },
      { tag: "logistics-warehouse-jobs", label: "Logistics & Warehouse Jobs" },
      { tag: "accounting-finance-jobs", label: "Accounting & Finance Jobs" },
      { tag: "sales-jobs", label: "Sales Jobs" },
      { tag: "pr-advertising-marketing-jobs", label: "PR, Advertising & Marketing Jobs" },
      { tag: "hospitality-catering-jobs", label: "Hospitality & Catering Jobs" },
      { tag: "retail-jobs", label: "Retail Jobs" },
      { tag: "healthcare-nursing-jobs", label: "Healthcare & Nursing Jobs" },
      { tag: "teaching-jobs", label: "Teaching Jobs" },
    ],
  });
  const plan = buildAdzunaSearchPlan(categories);

  assert.ok(plan.some(({ category }) => category === "trades"));
  assert.ok(plan.some(({ category }) => category === "home_services"));
  assert.ok(plan.some(({ category }) => category === "admin"));
  assert.ok(plan.some(({ category }) => category === "tech"));
  assert.ok(plan.length + 1 < ADZUNA_REQUEST_BUDGET);
});

test("Adzuna fetches one fresh, date-sorted Canadian page per category and deduplicates results", async () => {
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(new URL(url));
    if (url.pathname.endsWith("/categories")) {
      return jsonResponse({ results: [{ tag: "trade-construction-jobs", label: "Trade & Construction Jobs" }] });
    }
    return jsonResponse({
      results: [
        { id: "job-1", created: "2026-08-19T12:00:00Z" },
        { id: "job-1", created: "2026-08-19T12:00:00Z" },
        { id: "old", created: "2026-06-01T12:00:00Z" },
      ],
    });
  };

  const feed = await fetchAdzunaListings({
    credentials: { appId: "id", appKey: "key" },
    fetchImpl,
    now: new Date("2026-08-20T12:00:00Z"),
  });

  assert.equal(feed.items.length, 1);
  assert.equal(feed.stats.requests, 2);
  assert.equal(urls[1].pathname, "/v1/api/jobs/ca/search/1");
  assert.equal(urls[1].searchParams.get("results_per_page"), "50");
  assert.equal(urls[1].searchParams.get("max_days_old"), "30");
  assert.equal(urls[1].searchParams.get("sort_by"), "date");
  assert.equal(urls[1].searchParams.get("category"), "trade-construction-jobs");
});

test("Adzuna mapping produces a structured Canadian trades listing", () => {
  const row = mapAdzunaResult({
    id: "12345",
    title: "Licensed Plumber - Full Time",
    company: { display_name: "Maple Mechanical" },
    location: { display_name: "Toronto, Ontario" },
    contract_time: "full_time",
    contract_type: "permanent",
    created: "2026-08-19T10:00:00Z",
    redirect_url: "https://www.adzuna.ca/details/12345",
    description: "Install and repair plumbing systems.",
  }, "trades", { now: new Date("2026-08-20T12:00:00Z") });

  assert.equal(row.category, "trades");
  assert.equal(row.job_type, "full-time");
  assert.equal(row.location_type, "onsite");
  assert.equal(row.city, "Toronto");
  assert.equal(row.region, "ontario");
  assert.equal(row.country_code, "CA");
  assert.equal(row.url, "https://www.adzuna.ca/details/12345");
  assert.equal(row.tier, "HIGH");
});

test("deterministic listing IDs are stable and source-scoped", () => {
  const first = deterministicListingId("adzuna", "123");
  assert.equal(first, deterministicListingId("adzuna", "123"));
  assert.notEqual(first, deterministicListingId("wwr", "123"));
  assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
});

test("ingestion preserves existing IDs, creates stable new IDs, and prunes only after saving", async () => {
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
                  data: [{ id: "existing-uuid", external_id: "existing" }],
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
  const fetchImpl = async (url) => {
    if (url.pathname.endsWith("/categories")) {
      return jsonResponse({ results: [{ tag: "admin-jobs", label: "Admin Jobs" }] });
    }
    return jsonResponse({ results: [
      {
        id: "existing",
        title: "Administrative Assistant",
        company: { display_name: "First Co" },
        location: { display_name: "Ottawa, Ontario" },
        created: "2026-08-19T10:00:00Z",
        redirect_url: "https://www.adzuna.ca/details/existing",
      },
      {
        id: "new",
        title: "Virtual Administrative Assistant - Remote",
        company: { display_name: "Second Co" },
        location: { display_name: "Canada" },
        created: "2026-08-19T11:00:00Z",
        redirect_url: "https://www.adzuna.ca/details/new",
      },
    ] });
  };

  const summary = await runAdzunaIngestion({
    supabase,
    credentials: { appId: "id", appKey: "key" },
    fetchImpl,
    now: new Date("2026-08-20T12:00:00Z"),
  });

  assert.equal(summary.inserted, 1);
  assert.equal(summary.updated, 1);
  assert.equal(summary.pruned, 3);
  assert.equal(pruneCalls, 2);
  assert.equal(upserted.find(({ external_id: id }) => id === "existing").id, "existing-uuid");
  assert.equal(
    upserted.find(({ external_id: id }) => id === "new").id,
    deterministicListingId("adzuna", "new"),
  );
});

test("cron rejects an invalid secret before creating clients or importing", async () => {
  let createdClient = false;
  let imported = false;
  const handler = createAdzunaCronHandler({
    getConfig: () => config,
    createClientImpl: () => {
      createdClient = true;
      return {};
    },
    ingest: async () => {
      imported = true;
      return {};
    },
  });
  const res = responseRecorder();

  await handler({ method: "GET", headers: { authorization: "Bearer wrong" } }, res);

  assert.equal(res.statusCode, 401);
  assert.equal(createdClient, false);
  assert.equal(imported, false);
});

test("cron returns a bounded operational summary after a successful import", async () => {
  const handler = createAdzunaCronHandler({
    getConfig: () => config,
    createClientImpl: () => ({ from: () => ({}) }),
    ingest: async ({ credentials }) => {
      assert.deepEqual(credentials, { appId: "app-id", appKey: "app-key" });
      return { requests: 16, saved: 500, inserted: 450, updated: 50, pruned: 70 };
    },
  });
  const res = responseRecorder();

  await handler({ method: "GET", headers: { authorization: "Bearer cron-secret" } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.country, "CA");
  assert.equal(res.body.saved, 500);
});

test("server configuration never accepts browser-exposed ingestion secrets", () => {
  assert.throws(() => getAdzunaCronConfig({
    VITE_SUPABASE_URL: "https://example.supabase.co",
    VITE_SUPABASE_SECRET_KEY: "should-not-be-used",
    VITE_ADZUNA_APP_ID: "should-not-be-used",
    VITE_ADZUNA_APP_KEY: "should-not-be-used",
    CRON_SECRET: "secret",
  }), /Missing server configuration/);
});
