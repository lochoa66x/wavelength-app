import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
const controlsSource = readFileSync(new URL("../src/ResumeSyncControls.jsx", import.meta.url), "utf8");

test("multi-device résumé controls are visible before the long résumé intake form", () => {
  const resumeScreen = appSource.slice(appSource.indexOf('if (step === "resume"'));
  assert.ok(resumeScreen.indexOf("<ResumeSyncControls") < resumeScreen.indexOf("<ResumeIntakePanel"));
});

test("workspace and second-device copy expose activation and restore paths", () => {
  assert.match(appSource, /Multi-device résumé/);
  assert.match(controlsSource, /Make résumé available on my devices/);
  assert.match(controlsSource, /Restore résumé to this device/);
  assert.match(controlsSource, /On the device that already has your résumé/);
  assert.match(appSource, /Save and use on my devices/);
});
