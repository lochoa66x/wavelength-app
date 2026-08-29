import assert from "node:assert/strict";
import test from "node:test";

import {
  extractDocxResume,
  extractPdfResume,
  normalizeExtractedResumeText,
  resumeImportKind,
  resumeImportStatusCopy,
  validateResumeImportFile,
} from "./resumeIntake.js";
import { resumeIntakeEvent } from "./resumeIntakeTelemetry.js";

function mockFile(name, type, contents = "fixture") {
  const bytes = new TextEncoder().encode(contents);
  return { name, type, size: bytes.byteLength, arrayBuffer: async () => bytes.buffer };
}

test("résumé intake accepts only bounded DOCX, PDF, and image inputs", () => {
  assert.equal(resumeImportKind(mockFile("resume.docx", "")), "docx");
  assert.equal(resumeImportKind(mockFile("resume.PDF", "")), "pdf");
  assert.equal(resumeImportKind(mockFile("page.jpg", "image/jpeg")), "photo");
  assert.equal(validateResumeImportFile(mockFile("resume.rtf", "text/rtf")).ok, false);
  assert.equal(validateResumeImportFile({ name: "large.pdf", type: "application/pdf", size: 12_000_001 }).ok, false);
});

test("DOCX extraction returns normalized review text without saving a binary", async () => {
  const result = await extractDocxResume(mockFile("resume.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"), {
    mammothLoader: async () => ({ extractRawText: async () => ({ value: "Jordan Lee\r\n\r\nLicensed Electrician\u0000\n\n\n\nVerified professional experience", messages: [] }) }),
  });
  assert.equal(result.source, "docx");
  assert.equal(result.text, "Jordan Lee\n\nLicensed Electrician\n\n\nVerified professional experience");
});

test("text PDFs stay local and scanned PDFs are explicitly routed to OCR", async () => {
  const makeLoader = (pageText) => async () => ({
    getDocument: () => ({ promise: Promise.resolve({
      numPages: 2,
      getPage: async () => ({ getTextContent: async () => ({ items: [{ str: pageText }] }) }),
    }) }),
  });
  const readable = await extractPdfResume(mockFile("resume.pdf", "application/pdf"), { pdfLoader: makeLoader("Verified professional experience and qualifications for a Canadian candidate.") });
  assert.equal(readable.needsOcr, false);
  assert.equal(readable.pageCount, 2);
  const scanned = await extractPdfResume(mockFile("scan.pdf", "application/pdf"), { pdfLoader: makeLoader("") });
  assert.equal(scanned.needsOcr, true);
  assert.deepEqual(scanned.ocrImages, []);
});

test("import review copy makes replacement and explicit save boundaries clear", () => {
  assert.match(resumeImportStatusCopy({ source: "pdf", savedValue: "old", draftValue: "new" }), /saved résumé is unchanged/i);
  assert.match(resumeImportStatusCopy({ source: "", savedValue: "", draftValue: "" }), /Nothing is saved until/i);
  assert.equal(normalizeExtractedResumeText(" A\r\nB\u0000 "), "A\nB");
});

test("résumé intake analytics allow only coarse source and outcome dimensions", () => {
  const events = [];
  assert.equal(resumeIntakeEvent("docx", "review_ready", (...args) => events.push(args)), true);
  assert.deepEqual(events, [["resume_intake", { source: "docx", outcome: "review_ready" }]]);
  assert.equal(resumeIntakeEvent("Jordan Lee", "saved", () => {}), false);
  assert.equal(resumeIntakeEvent("pdf", "contains@example.com", () => {}), false);
});
