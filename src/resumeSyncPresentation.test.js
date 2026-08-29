import test from "node:test";
import assert from "node:assert/strict";

import { resumeSyncWorkspaceStatus } from "./resumeSyncPresentation.js";

test("workspace sync status explains whether the résumé can move between devices", () => {
  assert.deepEqual(resumeSyncWorkspaceStatus("local_only", true), { label: "This device only", emphasis: "action" });
  assert.deepEqual(resumeSyncWorkspaceStatus("local_only", false), { label: "Not activated", emphasis: "action" });
  assert.deepEqual(resumeSyncWorkspaceStatus("remote_available", false), { label: "Restore", emphasis: "action" });
  assert.deepEqual(resumeSyncWorkspaceStatus("synced", true), { label: "On", emphasis: "success" });
  assert.deepEqual(resumeSyncWorkspaceStatus("conflict", true), { label: "Review copies", emphasis: "warning" });
});
