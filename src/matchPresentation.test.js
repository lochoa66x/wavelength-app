import test from "node:test";
import assert from "node:assert/strict";

import { getMatchPresentation } from "./matchPresentation.js";

const sapCommerceListing = {
  title: "Full Stack Developer - React JS, Node JS, TypeScript & SAP Commerce Cloud",
};

test("a technology title match does not imply candidate fit before tailoring", () => {
  assert.deepEqual(
    getMatchPresentation({ listing: sapCommerceListing, keyword: "SAP" }),
    { kind: "search", tone: "title", label: "Title match" },
  );
});

test("evidence-based fit replaces search relevance after tailoring", () => {
  assert.equal(getMatchPresentation({
    listing: sapCommerceListing,
    keyword: "SAP",
    fitAssessment: { path: "career_change" },
  }).label, "Career-change path");

  assert.equal(getMatchPresentation({
    listing: { title: "SAP Functional Consultant" },
    keyword: "SAP",
    fitAssessment: { path: "direct" },
  }).label, "Direct résumé fit");

  assert.equal(getMatchPresentation({
    listing: { title: "SAP Project Manager" },
    keyword: "SAP",
    fitAssessment: { path: "adjacent" },
  }).label, "Adjacent résumé fit");
});

test("category browsing and non-title keyword matches use neutral labels", () => {
  assert.equal(getMatchPresentation({ listing: { title: "Plumber" } }).label, "Category result");
  assert.equal(getMatchPresentation({
    listing: { title: "Enterprise Applications Manager" },
    keyword: "SAP",
  }).label, "Related result");
});
