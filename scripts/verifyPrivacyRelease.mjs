import { readPrivacyConfig } from "../src/privacyConfig.js";

const config = readPrivacyConfig({
  VITE_PRIVACY_OPERATOR_NAME: process.env.VITE_PRIVACY_OPERATOR_NAME,
  VITE_PRIVACY_CONTACT_EMAIL: process.env.VITE_PRIVACY_CONTACT_EMAIL,
  VITE_PRIVACY_JURISDICTION: process.env.VITE_PRIVACY_JURISDICTION,
  VITE_PRIVACY_MINIMUM_AGE: process.env.VITE_PRIVACY_MINIMUM_AGE,
});

if (!config.releaseReady) {
  console.error(`Privacy release is blocked. Missing or invalid: ${config.missing.join(", ")}.`);
  process.exitCode = 1;
} else {
  console.log(`Privacy release configuration verified for ${config.operatorName}.`);
}
