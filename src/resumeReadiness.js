const PLACEHOLDER_IDENTITY = /^(?:<\s*)?(?:unknown|unnamed|name unavailable|candidate|n\/?a|null|undefined)(?:\s*>)?$/i;

export function hasUsableResumeIdentity(value) {
  const text = String(value || "").trim();
  return Boolean(text) && !PLACEHOLDER_IDENTITY.test(text);
}

export function getResumeExportReadiness(resumeData, atsReview) {
  const missingIdentity = !hasUsableResumeIdentity(resumeData?.name);
  const postingIncomplete = atsReview?.posting_readiness
    ? atsReview.posting_readiness.fit_allowed !== true
    : atsReview?.posting?.status && atsReview.posting.status !== "complete";
  const significantGap = ["significant_gap", "needs_full_posting"].includes(atsReview?.readiness?.status);
  const derivedApplicationReady = !missingIdentity && !postingIncomplete && !significantGap && atsReview?.integrity?.status !== "blocked";
  const applicationReady = typeof atsReview?.application_ready === "boolean"
    ? atsReview.application_ready && !missingIdentity
    : derivedApplicationReady;
  const preliminary = !applicationReady;

  return {
    canExport: !missingIdentity,
    missingIdentity,
    applicationReady,
    preliminary,
    buttonLabel: preliminary ? "Download preliminary DOCX" : "Download tailored résumé",
  };
}
