import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { createCustomJobRequestCoordinator } from "./customJobSession.js";

test("a pasted-text source invalidates an in-flight screenshot extraction", () => {
  const coordinator = createCustomJobRequestCoordinator("screenshots");
  const screenshotRequest = coordinator.beginRequest("extract");
  const pasteSource = coordinator.beginSource("paste");

  assert.equal(screenshotRequest.signal.aborted, true);
  assert.equal(coordinator.isCurrent(screenshotRequest), false);
  assert.equal(pasteSource.mode, "paste");
  assert.ok(pasteSource.sourceId > screenshotRequest.sourceId);
});

test("a URL source after screenshots cannot inherit the screenshot review request", () => {
  const coordinator = createCustomJobRequestCoordinator("screenshots");
  const screenshotTailor = coordinator.beginRequest("tailor");
  const urlSource = coordinator.beginSource("url");
  const urlExtraction = coordinator.beginRequest("extract");

  assert.equal(screenshotTailor.signal.aborted, true);
  assert.equal(coordinator.isCurrent(screenshotTailor), false);
  assert.equal(urlSource.mode, "url");
  assert.equal(coordinator.isCurrent(urlExtraction), true);
  assert.equal(coordinator.finish(urlExtraction), true);
});

test("a newer request for the same source invalidates an older response", () => {
  const coordinator = createCustomJobRequestCoordinator("paste");
  const first = coordinator.beginRequest("tailor");
  const retry = coordinator.beginRequest("tailor");

  assert.equal(first.signal.aborted, true);
  assert.equal(coordinator.isCurrent(first), false);
  assert.equal(coordinator.isCurrent(retry), true);
});

test("disposing a flow invalidates work that resolves after navigation", () => {
  const coordinator = createCustomJobRequestCoordinator("url");
  const extraction = coordinator.beginRequest("extract");
  coordinator.dispose();

  assert.equal(extraction.signal.aborted, true);
  assert.equal(coordinator.isCurrent(extraction), false);
});

test("the custom flow binds extraction and tailoring to the active source session", async () => {
  const source = await readFile(new URL("./CustomJobFlow.jsx", import.meta.url), "utf8");

  assert.match(source, /createCustomJobRequestCoordinator/);
  assert.match(source, /beginRequest\("extract"\)/);
  assert.match(source, /beginRequest\("tailor"\)/);
  assert.match(source, /signal: request\.signal/);
  assert.match(source, /isCurrent\(request\)/);
  assert.match(source, /resetSourceState\(id\)/);
  assert.match(source, /Alternative posting inputs/);
  assert.match(source, /resetSourceState\("paste"\)/);
  assert.match(source, /resetSourceState\("screenshots"\)/);
  assert.match(source, /Tailor another posting/);
});
