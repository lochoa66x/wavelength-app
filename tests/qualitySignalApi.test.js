import test from "node:test";
import assert from "node:assert/strict";

import { createQualitySignalHandler } from "../api/quality-signal.js";
import { buildQualitySignal } from "../src/qualitySignalContract.js";

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
    end() { return this; },
    setHeader(name, value) { this.headers[name] = value; },
  };
}

function request(body, headers = {}) {
  return {
    method: "POST",
    headers: {
      origin: "https://gigscapes.com",
      "content-type": "application/json",
      "x-gigscapes-quality-signal": "1",
      ...headers,
    },
    body,
  };
}

const valid = buildQualitySignal("export_completed", { route: "app", exportFormat: "docx", outcome: "completed" });

test("quality signal endpoint accepts a strict signal without echoing it", async () => {
  let recorded;
  const handler = createQualitySignalHandler({ record: async (signal) => { recorded = signal; }, logger: {} });
  const res = responseRecorder();
  await handler(request(valid), res);
  assert.equal(res.statusCode, 204);
  assert.equal(res.body, undefined);
  assert.deepEqual(recorded, valid);
  assert.equal(res.headers["Cache-Control"], "no-store, max-age=0");
});
test("quality signal endpoint blocks invalid origin, type, marker, method, and extra data before storage", async () => {
  let calls = 0;
  const handler = createQualitySignalHandler({ record: async () => { calls += 1; }, logger: {}, env: { VERCEL_ENV: "production" } });
  const cases = [
    request(valid, { origin: "https://evil.example" }),
    request(valid, { "content-type": "text/plain" }),
    request(valid, { "x-gigscapes-quality-signal": "0" }),
    request({ ...valid, rawResume: "private" }),
    { ...request(valid), method: "GET" },
  ];
  const expected = [403, 415, 400, 400, 405];
  for (let index = 0; index < cases.length; index += 1) {
    const res = responseRecorder();
    await handler(cases[index], res);
    assert.equal(res.statusCode, expected[index]);
  }
  assert.equal(calls, 0);
});

test("quality signal endpoint enforces declared and actual size caps", async () => {
  const handler = createQualitySignalHandler({ record: async () => {}, logger: {} });
  const declared = responseRecorder();
  await handler(request(valid, { "content-length": "99999" }), declared);
  assert.equal(declared.statusCode, 413);

  const actual = responseRecorder();
  await handler(request(`${JSON.stringify(valid)}${" ".repeat(5000)}`), actual);
  assert.equal(actual.statusCode, 413);
});

test("quality signal endpoint logs no signal dimensions on storage failure", async () => {
  const logs = [];
  const handler = createQualitySignalHandler({ record: async () => { throw new Error("database details"); }, logger: { error: (value) => logs.push(value) } });
  const res = responseRecorder();
  await handler(request(valid), res);
  assert.equal(res.statusCode, 503);
  assert.deepEqual(Object.keys(logs[0]).sort(), ["durationMs", "errorCategory", "event", "status"]);
  assert.equal(JSON.stringify(logs).includes("docx"), false);
});
