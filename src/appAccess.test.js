import test from "node:test";
import assert from "node:assert/strict";

import {
  ACCOUNT_CAPABILITIES,
  appRouteAccess,
  PUBLIC_APP_CAPABILITIES,
  shouldLoadPrivateProfile,
  stepAfterSignOut,
} from "./appAccess.js";

test("guest can render the public /app route", () => {
  assert.equal(appRouteAccess("/app"), "public");
  assert.equal(appRouteAccess("/app/listing/1"), "public");
});

test("public capabilities include search, filters, pagination, and provider links", () => {
  for (const capability of ["search_listings", "filter_country", "filter_region", "filter_city", "filter_workplace", "load_more_listings", "open_public_listing"]) {
    assert.ok(PUBLIC_APP_CAPABILITIES.includes(capability));
  }
});

test("guest sessions never trigger private profile synchronization", () => {
  assert.equal(shouldLoadPrivateProfile(null), false);
  assert.equal(shouldLoadPrivateProfile({}), false);
  assert.equal(shouldLoadPrivateProfile({ user: { id: "user-1" } }), true);
});

test("private capabilities remain account-scoped", () => {
  for (const capability of ["save_jobs", "edit_resume", "import_posting", "tailor_resume", "generate_evidence", "download_exports", "view_workspace"]) {
    assert.ok(ACCOUNT_CAPABILITIES.includes(capability));
  }
});

test("sign-out returns to public discovery", () => {
  assert.equal(stepAfterSignOut(), "digest");
});
