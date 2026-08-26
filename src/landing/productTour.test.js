import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, statSync } from "node:fs";

import { PRODUCT_TOUR_EVENT, productTourEventDetail } from "./productTourAnalytics.js";
import { PRODUCT_TOUR_VERSION, productTourCandidate, productTourPosting } from "./productTourFixtures.js";

const source = (relativePath) => readFileSync(new URL(relativePath, import.meta.url), "utf8");
const componentSource = source("./ProductTour.jsx");
const captureSource = source("./ProductTourCapture.jsx");
const mainSource = source("../main.jsx");

const publicAsset = (filename) => new URL(`../../public/product-tour/${filename}`, import.meta.url);

test("the landing tour ships a poster plus H.264 and WebM versions of both cuts", () => {
  for (const filename of [
    "gigscapes-product-tour-poster.png",
    "gigscapes-product-tour-loop.mp4",
    "gigscapes-product-tour-loop.webm",
    "gigscapes-how-it-works.mp4",
    "gigscapes-how-it-works.webm",
  ]) {
    const asset = publicAsset(filename);
    assert.equal(existsSync(asset), true, `${filename} should exist`);
    assert.ok(statSync(asset).size > 1_000, `${filename} should not be an empty placeholder`);
  }
});

test("the product tour is accessible, bandwidth-aware, and never forces audio", () => {
  assert.match(componentSource, /prefers-reduced-motion: reduce/);
  assert.match(componentSource, /connection\?\.saveData/);
  assert.match(componentSource, /autoPlay=\{autoplayAllowed\}/);
  assert.match(componentSource, /\bmuted\b/);
  assert.match(componentSource, /\bplaysInline\b/);
  assert.match(componentSource, /preload="metadata"/);
  assert.match(componentSource, /Pause product tour/);
  assert.match(componentSource, /Read the video transcript/);
  assert.match(componentSource, /<dialog/);
  assert.match(componentSource, /event\.key|onCancel/);
});

test("the complete guide states the trust boundaries and export formats", () => {
  for (const statement of [
    "Employer requirements never become candidate evidence",
    "Unsupported PLC programming remains visible",
    "Visual design changes appearance without changing facts or readiness",
    "downloads an editable DOCX or selectable PDF",
    "never submits an application automatically",
  ]) {
    assert.match(componentSource, new RegExp(statement, "i"));
  }
});

test("the capture uses synthetic, non-SAP evidence and is excluded from production routing", () => {
  assert.equal(PRODUCT_TOUR_VERSION, "2026-08-26");
  assert.equal(productTourCandidate.name, "Jordan Lee");
  assert.match(productTourCandidate.headline, /electrician/i);
  assert.match(productTourPosting.title, /electrician/i);
  assert.doesNotMatch(`${captureSource}\n${JSON.stringify(productTourCandidate)}\n${JSON.stringify(productTourPosting)}`, /Luis Ochoa|Deloitte|SAP FI-CA/i);
  assert.match(mainSource, /const ProductTourCapture = import\.meta\.env\.DEV/);
  assert.match(mainSource, /path="\/__product-tour-capture"/);
});

test("tour analytics expose only allow-listed event and surface names", () => {
  assert.equal(PRODUCT_TOUR_EVENT, "gigscapes:product-tour-event");
  assert.deepEqual(productTourEventDetail("complete", "full_guide"), {
    eventName: "product_tour_complete",
    surface: "full_guide",
  });
  assert.deepEqual(productTourEventDetail("play", "unexpected"), {
    eventName: "product_tour_play",
    surface: "landing_loop",
  });
  assert.equal(productTourEventDetail("candidate_name", "landing_loop"), null);
});
