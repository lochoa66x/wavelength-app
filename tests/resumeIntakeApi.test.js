import assert from "node:assert/strict";
import test from "node:test";

import { createResumeIntakeHandler } from "../api/resume-intake.js";

function responseRecorder() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
  };
}

function imageDataUrl() {
  return `data:image/jpeg;base64,${Buffer.from("synthetic-resume-page").toString("base64")}`;
}

test("résumé image intake authenticates before processing private content", async () => {
  let fetched = false;
  const handler = createResumeIntakeHandler({
    authenticate: async () => null,
    fetchImpl: async () => { fetched = true; },
    getApiKey: () => "configured",
  });
  const res = responseRecorder();
  await handler({ method: "POST", headers: {}, body: { images: [imageDataUrl()] } }, res);
  assert.equal(res.statusCode, 401);
  assert.equal(fetched, false);
  assert.equal(res.headers["Cache-Control"], "no-store, max-age=0");
});

test("résumé image intake returns faithful review text without echoing source images", async () => {
  const handler = createResumeIntakeHandler({
    authenticate: async () => ({ user: { id: "user-1" } }),
    getApiKey: () => "configured",
    fetchImpl: async (_url, options) => {
      const request = JSON.parse(options.body);
      assert.equal(request.tools[0].name, "return_resume_text");
      return {
        ok: true,
        json: async () => ({ content: [{ type: "tool_use", name: "return_resume_text", input: { text: "Jordan Lee\nLicensed Electrician\nVerified experience and certifications", warnings: [] } }] }),
      };
    },
  });
  const res = responseRecorder();
  await handler({ method: "POST", headers: { authorization: "Bearer valid" }, body: { images: [imageDataUrl()] } }, res);
  assert.equal(res.statusCode, 200);
  assert.match(res.body.text, /Licensed Electrician/);
  assert.deepEqual(Object.keys(res.body).sort(), ["text", "warnings"]);
});

test("résumé image intake rejects unsupported or oversized batches before provider work", async () => {
  let fetched = false;
  const handler = createResumeIntakeHandler({
    authenticate: async () => ({ user: { id: "user-1" } }),
    getApiKey: () => "configured",
    fetchImpl: async () => { fetched = true; },
  });
  const res = responseRecorder();
  await handler({ method: "POST", headers: { authorization: "Bearer valid" }, body: { images: ["data:image/svg+xml;base64,PHN2Zz4="] } }, res);
  assert.equal(res.statusCode, 400);
  assert.equal(fetched, false);
});
