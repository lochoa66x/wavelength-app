export const PRIVACY_POLICY_VERSION = "2026-08-27.2";
export const PRIVACY_EFFECTIVE_DATE = "August 27, 2026";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function readPrivacyConfig(env = import.meta.env ?? {}) {
  const operatorName = clean(env.VITE_PRIVACY_OPERATOR_NAME);
  const contactEmail = clean(env.VITE_PRIVACY_CONTACT_EMAIL);
  const jurisdiction = clean(env.VITE_PRIVACY_JURISDICTION);
  const minimumAge = Number.parseInt(clean(env.VITE_PRIVACY_MINIMUM_AGE), 10);
  const missing = [];

  if (operatorName.length < 2) missing.push("operator name");
  if (!EMAIL_PATTERN.test(contactEmail)) missing.push("privacy contact email");
  if (jurisdiction.length < 2) missing.push("operating jurisdiction");
  if (!Number.isInteger(minimumAge) || minimumAge < 13 || minimumAge > 21) missing.push("minimum-age policy");

  return {
    operatorName,
    contactEmail,
    jurisdiction,
    minimumAge: Number.isInteger(minimumAge) ? minimumAge : null,
    missing,
    releaseReady: missing.length === 0,
  };
}
