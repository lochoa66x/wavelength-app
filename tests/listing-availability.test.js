import assert from "node:assert/strict";
import test from "node:test";

import { createListingAvailabilityHandler } from "../api/listing-availability.js";

const LISTING_ID = "16e3fc20-7481-4cea-a4bc-ce5fc2f3ba7a";
const NOW = new Date("2026-08-30T12:00:00.000Z");

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    headers: {},
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function request(listingId = LISTING_ID) {
  return { method: "POST", headers: { authorization: "Bearer token" }, body: { listingId } };
}

function createDatabase(initial) {
  let row = { ...initial };
  return {
    get row() { return row; },
    from(table) {
      assert.equal(table, "listings");
      return {
        select: () => ({ eq: () => ({ single: async () => ({ data: row, error: null }) }) }),
        update: (patch) => ({
          eq: () => ({
            select: () => ({
              single: async () => {
                row = { ...row, ...patch };
                return { data: row, error: null };
              },
            }),
          }),
        }),
      };
    },
  };
}

const authenticate = async () => ({ user: { id: "user-1" } });
const listing = {
  id: LISTING_ID,
  title: "SAP Analyst",
  company: "Example Canada",
  url: "https://jobs.example.com/sap",
  source: "greenhouse",
  availability_status: "active",
  availability_reason: "seen_in_source",
  last_checked_at: "2026-08-29T00:00:00.000Z",
  consecutive_misses: 0,
};

test("a matching JobPosting refreshes availability and valid-through safely", async () => {
  const database = createDatabase(listing);
  const html = `<script type="application/ld+json">${JSON.stringify({
    "@type": "JobPosting",
    title: "SAP Analyst",
    hiringOrganization: { name: "Example Canada" },
    validThrough: "2026-09-30T00:00:00Z",
    description: "Support SAP analysis, requirements, testing, documentation, and stakeholder delivery across the Canadian organization.",
  })}</script>`;
  const handler = createListingAvailabilityHandler({
    authenticate,
    createAdmin: () => database,
    fetchPage: async () => ({ html, text: "SAP Analyst Example Canada support SAP analysis requirements testing documentation stakeholder delivery" }),
    now: () => NOW,
  });
  const res = responseRecorder();

  await handler(request(), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["Cache-Control"], "private, no-store");
  assert.equal(res.body.availability.status, "active");
  assert.equal(database.row.valid_through, "2026-09-30T00:00:00Z");
  assert.equal("title" in res.body, false);
  assert.equal("url" in res.body, false);
});

test("a stale stored expiry cannot override a currently matching publisher page", async () => {
  const database = createDatabase({
    ...listing,
    valid_through: "2026-08-01T00:00:00.000Z",
  });
  const handler = createListingAvailabilityHandler({
    authenticate,
    createAdmin: () => database,
    fetchPage: async () => ({
      html: "<main><h1>SAP Analyst</h1><p>Example Canada is hiring for this role.</p></main>",
      text: "SAP Analyst Example Canada is hiring for this role with SAP analysis and stakeholder delivery responsibilities.",
    }),
    now: () => NOW,
  });
  const res = responseRecorder();

  await handler(request(), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.availability.status, "active");
  assert.equal(database.row.closed_at, null);
});

test("404 closes a listing while publisher blocking stays uncertain", async () => {
  for (const scenario of [
    { httpStatus: 404, expected: "closed" },
    { httpStatus: 403, code: "blocked", expected: "uncertain" },
  ]) {
    const database = createDatabase(listing);
    const handler = createListingAvailabilityHandler({
      authenticate,
      createAdmin: () => database,
      fetchPage: async () => {
        const error = new Error("publisher response");
        error.httpStatus = scenario.httpStatus;
        error.code = scenario.code;
        throw error;
      },
      now: () => NOW,
    });
    const res = responseRecorder();
    await handler(request(), res);
    assert.equal(res.body.availability.status, scenario.expected);
  }
});

test("the endpoint authenticates and validates ids before privileged reads", async () => {
  let created = false;
  const handler = createListingAvailabilityHandler({
    authenticate: async () => null,
    createAdmin: () => { created = true; return {}; },
  });
  const res = responseRecorder();
  await handler(request(), res);
  assert.equal(res.statusCode, 401);
  assert.equal(created, false);

  const invalid = responseRecorder();
  await createListingAvailabilityHandler({ authenticate })(request("not-an-id"), invalid);
  assert.equal(invalid.statusCode, 400);
});
