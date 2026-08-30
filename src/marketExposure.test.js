import assert from "node:assert/strict";
import test from "node:test";

import {
  enforceExposedLocationCriteria,
  exposedCountryOptions,
  usMarketExposureEnabled,
} from "./marketExposure.js";

const OPTIONS = [
  { id: "", label: "Any country" },
  { id: "CA", label: "Canada" },
  { id: "US", label: "United States (pilot)" },
  { id: "GB", label: "United Kingdom" },
];

test("US market exposure is fail-closed unless the public flag is explicitly true", () => {
  assert.equal(usMarketExposureEnabled({}), false);
  assert.equal(usMarketExposureEnabled({ VITE_US_MARKET_ENABLED: "false" }), false);
  assert.equal(usMarketExposureEnabled({ VITE_US_MARKET_ENABLED: "1" }), false);
  assert.equal(usMarketExposureEnabled({ VITE_US_MARKET_ENABLED: "TRUE" }), true);
});

test("the dormant selector exposes only Canada and cannot issue an all-country query", () => {
  assert.deepEqual(exposedCountryOptions(OPTIONS, false), [
    { id: "CA", label: "Canada" },
  ]);
});

test("the enabled pilot exposes only the supported Canada, US, and all-country choices", () => {
  assert.deepEqual(exposedCountryOptions(OPTIONS, true), OPTIONS.slice(0, 3));
});

test("dormant exposure collapses saved US, empty, and unsupported criteria to Canada", () => {
  for (const countryCode of ["US", "", "GB"]) {
    assert.deepEqual(enforceExposedLocationCriteria({
      countryCode,
      region: "california",
      city: "San Francisco",
      location: "hybrid",
    }, false), {
      countryCode: "CA",
      region: "",
      city: "",
      location: "hybrid",
    });
  }
});

test("dormant Canadian criteria and enabled US criteria preserve valid geography", () => {
  assert.deepEqual(enforceExposedLocationCriteria({
    countryCode: "CA",
    region: "ontario",
    city: "Toronto",
  }, false), {
    countryCode: "CA",
    region: "ontario",
    city: "Toronto",
  });

  assert.deepEqual(enforceExposedLocationCriteria({
    countryCode: "US",
    region: "new york",
    city: "Buffalo",
  }, true), {
    countryCode: "US",
    region: "new york",
    city: "Buffalo",
  });
});
