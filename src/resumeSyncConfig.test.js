import test from "node:test";
import assert from "node:assert/strict";

import { resumeSyncEnabled } from "./resumeSyncConfig.js";

test("cross-device résumé sync is fail-closed until production is explicitly enabled", () => {
  assert.equal(resumeSyncEnabled({}), false);
  assert.equal(resumeSyncEnabled({ VITE_RESUME_SYNC_ENABLED: "false" }), false);
  assert.equal(resumeSyncEnabled({ VITE_RESUME_SYNC_ENABLED: "TRUE" }), false);
  assert.equal(resumeSyncEnabled({ VITE_RESUME_SYNC_ENABLED: "true" }), true);
});
