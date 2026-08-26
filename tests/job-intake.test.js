import test from "node:test";
import assert from "node:assert/strict";

import {
  createJobIntakeHandler,
  fetchPublicJobPage,
  safeJobIntakeReadError,
  validatePublicHttpsUrl,
} from "../api/job-intake.js";
import { createPinnedLookup } from "../api/_lib/publicJobPage.js";

function responseRecorder() {
  return {
    statusCode: 200,
    body: null,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
}

function headers(values = {}) {
  const normalized = Object.fromEntries(Object.entries(values).map(([key, value]) => [key.toLowerCase(), value]));
  return { get: (name) => normalized[String(name).toLowerCase()] || null };
}

test("job URL validation rejects loopback and private DNS results", async () => {
  await assert.rejects(() => validatePublicHttpsUrl("https://127.0.0.1/job"), /private or reserved/);
  await assert.rejects(() => validatePublicHttpsUrl("https://[::ffff:7f00:1]/job"), /private or reserved/);
  await assert.rejects(
    () => validatePublicHttpsUrl("https://jobs.example.com/role", async () => [{ address: "10.0.0.4" }]),
    /private or reserved/,
  );
});

test("job URL validation fails closed with a clear error for malformed DNS records", async () => {
  await assert.rejects(
    () => validatePublicHttpsUrl("https://jobs.example.com/role", async () => [{ family: 4 }]),
    /could not be resolved to a public network address/i,
  );
});

test("pinned DNS lookup supports modern all-address and legacy callback shapes", async () => {
  const lookup = createPinnedLookup("93.184.216.34", 4);
  const modern = await new Promise((resolve, reject) => {
    lookup("jobs.example.com", { all: true }, (error, records) => error ? reject(error) : resolve(records));
  });
  const legacy = await new Promise((resolve, reject) => {
    lookup("jobs.example.com", {}, (error, address, family) => error ? reject(error) : resolve({ address, family }));
  });

  assert.deepEqual(modern, [{ address: "93.184.216.34", family: 4 }]);
  assert.deepEqual(legacy, { address: "93.184.216.34", family: 4 });
});

test("job page redirects are revalidated before another request", async () => {
  let calls = 0;
  await assert.rejects(() => fetchPublicJobPage("https://jobs.example.com/role", {
    resolveHost: async () => [{ address: "93.184.216.34" }],
    fetchImpl: async () => {
      calls += 1;
      return {
        status: 302,
        ok: false,
        headers: headers({ location: "https://127.0.0.1/internal" }),
      };
    },
  }), /private or reserved/);
  assert.equal(calls, 1);
});

test("career-site blocking returns an actionable fallback instead of a raw HTTP error", async () => {
  await assert.rejects(() => fetchPublicJobPage("https://jobs.example.com/role", {
    resolveHost: async () => [{ address: "93.184.216.34" }],
    fetchImpl: async () => ({ status: 403, ok: false, headers: headers() }),
  }), (error) => {
    assert.equal(error.code, "blocked");
    assert.equal(error.httpStatus, 403);
    assert.match(error.message, /blocked automated reading/i);
    assert.doesNotMatch(error.message, /HTTP 403/i);
    return true;
  });
});

test("job URL failures never expose raw DNS or invalid-IP internals", () => {
  for (const internalMessage of [
    "Invalid IP address: undefined",
    "getaddrinfo ENOTFOUND jobs.example.com",
    "could not be resolved to a public network address",
  ]) {
    const safe = safeJobIntakeReadError(new Error(internalMessage));
    assert.equal(safe.code, "unresolved_host");
    assert.match(safe.message, /could not resolve/i);
    assert.doesNotMatch(safe.message, /undefined|ENOTFOUND|invalid IP/i);
  }
});

test("blocked publishers and timeouts produce distinct recovery categories", () => {
  assert.deepEqual(safeJobIntakeReadError(Object.assign(new Error("request aborted"), { name: "AbortError" })), {
    status: 504,
    code: "timeout",
    message: "The job page took too long to respond. Your URL is still available; try again, paste the posting, or upload screenshots.",
  });
  assert.equal(safeJobIntakeReadError(new Error("blocked automated reading")).code, "publisher_blocked");
});

test("job intake authenticates before reading or extracting a posting", async () => {
  let fetched = false;
  const handler = createJobIntakeHandler({
    authenticate: async () => null,
    fetchImpl: async () => { fetched = true; throw new Error("should not fetch"); },
    getApiKey: () => "test-key",
  });
  const res = responseRecorder();

  await handler({ method: "POST", headers: {}, body: { mode: "paste", text: "A".repeat(100) } }, res);

  assert.equal(res.statusCode, 401);
  assert.equal(fetched, false);
});

test("pasted posting is extracted into a normalized editable brief", async () => {
  let requestBody;
  const handler = createJobIntakeHandler({
    authenticate: async () => ({ user: { id: "user-1" } }),
    fetchImpl: async (_url, options) => {
      requestBody = JSON.parse(options.body);
      return {
        ok: true,
        json: async () => ({
          content: [{
            type: "tool_use",
            name: "return_job_brief",
            input: {
              title: "Administrative Assistant",
              company: "Example Co",
              location: "Toronto, Ontario",
              type: "Full-time",
              category: "admin",
              description: "Coordinate office operations and support a cross-functional team.",
              responsibilities: ["Coordinate calendars"],
              required_qualifications: ["Two years of administrative experience"],
              preferred_qualifications: [],
              keywords: ["cross-functional team", "calendar management"],
            },
          }],
        }),
      };
    },
    getApiKey: () => "test-key",
  });
  const res = responseRecorder();
  const posting = "Administrative Assistant at Example Co in Toronto. Coordinate office operations, calendars, records, and support a cross-functional team.";

  await handler({ method: "POST", headers: { authorization: "Bearer valid" }, body: { mode: "paste", text: posting } }, res);

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.brief.category, "admin");
  assert.equal(res.body.brief.source_url, "");
  assert.match(requestBody.messages[0].content, /<UNTRUSTED_JOB_POSTING>/);
});
