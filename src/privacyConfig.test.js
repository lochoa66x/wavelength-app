import test from "node:test";
import assert from "node:assert/strict";

import { PRIVACY_POLICY_VERSION, readPrivacyConfig } from "./privacyConfig.js";

test("privacy release configuration requires verified public facts", () => {
  const empty = readPrivacyConfig({});
  assert.equal(empty.releaseReady, false);
  assert.deepEqual(empty.missing, ["operator name", "privacy contact email", "operating jurisdiction", "minimum-age policy"]);

  const ready = readPrivacyConfig({
    VITE_PRIVACY_OPERATOR_NAME: "Example Operator Inc.",
    VITE_PRIVACY_CONTACT_EMAIL: "privacy@example.test",
    VITE_PRIVACY_JURISDICTION: "Ontario, Canada",
    VITE_PRIVACY_MINIMUM_AGE: "16",
  });
  assert.equal(ready.releaseReady, true);
  assert.equal(ready.minimumAge, 16);
  assert.match(PRIVACY_POLICY_VERSION, /^\d{4}-\d{2}-\d{2}(?:\.\d+)?$/);
});
