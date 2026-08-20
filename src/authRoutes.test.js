import test from "node:test";
import assert from "node:assert/strict";

import {
  APP_PATH,
  buildAuthRedirectUrl,
  safeNextPath,
} from "./authRoutes.js";

test("safeNextPath preserves internal app destinations", () => {
  assert.equal(safeNextPath("/app?saved=true#listing-2"), "/app?saved=true#listing-2");
});

test("safeNextPath rejects external and auth-loop destinations", () => {
  for (const value of [
    "https://example.com/steal",
    "//example.com/steal",
    "/\\example.com/steal",
    "javascript:alert(1)",
    "/sign-in",
    "/auth/callback?next=/auth/callback",
  ]) {
    assert.equal(safeNextPath(value), APP_PATH);
  }
});

test("buildAuthRedirectUrl uses the dedicated callback route", () => {
  assert.equal(
    buildAuthRedirectUrl("https://gigscapes.example", "/app?saved=true"),
    "https://gigscapes.example/auth/callback?next=%2Fapp%3Fsaved%3Dtrue",
  );
});
