import assert from "node:assert/strict";
import test from "node:test";

import { presentationPrototypesEnabled } from "./presentationPrototypeConfig.js";

test("presentation prototypes are fail-closed unless explicitly enabled", () => {
  assert.equal(presentationPrototypesEnabled({}), false);
  assert.equal(presentationPrototypesEnabled({ VITE_PRESENTATION_PROTOTYPES_ENABLED: "false" }), false);
  assert.equal(presentationPrototypesEnabled({ VITE_PRESENTATION_PROTOTYPES_ENABLED: "1" }), false);
  assert.equal(presentationPrototypesEnabled({ VITE_PRESENTATION_PROTOTYPES_ENABLED: "TRUE" }), true);
});
