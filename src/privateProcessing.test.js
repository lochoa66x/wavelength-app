import test from "node:test";
import assert from "node:assert/strict";

import {
  PRIVATE_PROCESSING_ACK_KEY,
  readPrivateProcessingAcknowledgement,
  writePrivateProcessingAcknowledgement,
} from "./privateProcessing.js";

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
  };
}

test("private processing acknowledgement is scoped and policy-versioned", () => {
  const storage = memoryStorage();
  assert.equal(readPrivateProcessingAcknowledgement("tailor", storage), false);
  assert.equal(writePrivateProcessingAcknowledgement("tailor", storage), true);
  assert.equal(readPrivateProcessingAcknowledgement("tailor", storage), true);
  assert.equal(readPrivateProcessingAcknowledgement("intake", storage), false);
  assert.equal(writePrivateProcessingAcknowledgement("intake", storage), true);
  assert.equal(readPrivateProcessingAcknowledgement("intake", storage), true);
  assert.equal(readPrivateProcessingAcknowledgement("resume_intake", storage), false);
  assert.equal(writePrivateProcessingAcknowledgement("resume_intake", storage), true);
  assert.equal(readPrivateProcessingAcknowledgement("resume_intake", storage), true);
  assert.equal(readPrivateProcessingAcknowledgement("cover_letter", storage), false);
  assert.equal(writePrivateProcessingAcknowledgement("cover_letter", storage), true);
  assert.equal(readPrivateProcessingAcknowledgement("cover_letter", storage), true);

  const saved = JSON.parse(storage.getItem(PRIVATE_PROCESSING_ACK_KEY));
  assert.deepEqual(new Set(saved.scopes), new Set(["tailor", "intake", "resume_intake", "cover_letter"]));
  assert.doesNotMatch(JSON.stringify(saved), /posting text|@|phone|employer/i);
});
