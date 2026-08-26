import test from "node:test";
import assert from "node:assert/strict";

import { createListingEnrichmentHandler } from "../api/listing-enrichment.js";

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function createDatabase(initialListing) {
  let row = { ...initialListing };
  return {
    get row() { return row; },
    from(table) {
      assert.equal(table, "listings");
      return {
        select() {
          return { eq: () => ({ single: async () => ({ data: row, error: null }) }) };
        },
        update(patch) {
          return {
            eq() {
              return {
                select() {
                  return {
                    single: async () => {
                      row = { ...row, ...patch };
                      return { data: row, error: null };
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
}

function request(listingId = "listing-1") {
  return {
    method: "POST",
    headers: { authorization: "Bearer token" },
    body: { listingId },
  };
}

const authenticate = async () => ({ user: { id: "user-1" } });
const now = () => new Date("2026-08-23T12:00:00.000Z");

test("enriches a trusted listing from matching JobPosting JSON-LD", async () => {
  const database = createDatabase({
    id: "listing-1",
    title: "SAP Functional Lead",
    company: "Example Canada",
    url: "https://jobs.example.com/sap-lead",
    description: "Short provider summary.",
    description_source: "provider_snippet",
    description_status: "insufficient",
  });
  const description = Array.from({ length: 45 }, (_, index) => `Responsibility ${index + 1} supports SAP finance delivery and stakeholder collaboration.`).join(" ");
  const fetchPage = async () => ({
    url: "https://jobs.example.com/sap-lead",
    text: "fallback text",
    html: `<script type="application/ld+json">${JSON.stringify({
      "@type": "JobPosting",
      title: "SAP Functional Lead",
      hiringOrganization: { name: "Example Canada" },
      description,
      qualifications: "SAP S/4HANA Finance and functional leadership experience.",
    })}</script>`,
  });
  const handler = createListingEnrichmentHandler({ authenticate, createAdmin: () => database, fetchPage, now });
  const res = responseRecorder();

  await handler(request(), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.fallbackRequired, false);
  assert.equal(res.body.listing.source, "employer_jsonld");
  assert.equal(database.row.description_status, "complete");
  assert.match(database.row.description, /SAP S\/4HANA Finance/);
  assert.match(database.row.description_content_hash, /^[0-9a-f]{64}$/);
});

test("returns a usable fallback and records blocked employer pages", async () => {
  const database = createDatabase({
    id: "listing-1",
    title: "SAP Functional Lead",
    company: "Example Canada",
    url: "https://jobs.example.com/sap-lead",
    description: "Short provider summary.",
    description_source: "provider_snippet",
    description_status: "insufficient",
  });
  const fetchPage = async () => {
    const error = new Error("Employer page blocked the request");
    error.httpStatus = 403;
    throw error;
  };
  const handler = createListingEnrichmentHandler({ authenticate, createAdmin: () => database, fetchPage, now });
  const res = responseRecorder();

  await handler(request(), res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.ok, false);
  assert.equal(res.body.fallbackRequired, true);
  assert.equal(res.body.errorCode, "blocked");
  assert.match(res.body.message, /source shared only a summary/i);
  assert.doesNotMatch(res.body.message, /could not safely read/i);
  assert.equal(database.row.description, "Short provider summary.");
  assert.equal(database.row.description_enrichment_error_code, "blocked");
});

test("reuses a fresh complete description without refetching", async () => {
  const database = createDatabase({
    id: "listing-1",
    description: "Complete employer description",
    description_source: "employer_jsonld",
    description_status: "complete",
    description_fetched_at: "2026-08-22T12:00:00.000Z",
  });
  let fetched = false;
  const handler = createListingEnrichmentHandler({
    authenticate,
    createAdmin: () => database,
    fetchPage: async () => { fetched = true; throw new Error("should not fetch"); },
    now,
  });
  const res = responseRecorder();

  await handler(request(), res);

  assert.equal(res.body.ok, true);
  assert.equal(res.body.cached, true);
  assert.equal(fetched, false);
});
