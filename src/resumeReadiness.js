const PLACEHOLDER_IDENTITY = /^(?:<\s*)?(?:unknown|unnamed|name unavailable|candidate|n\/?a|null|undefined)(?:\s*>)?$/i;

export function hasUsableResumeIdentity(value) {
  const text = String(value || "").trim();
  return Boolean(text) && !PLACEHOLDER_IDENTITY.test(text);
}

export function getResumeExportReadiness(resumeData, atsReview) {
  const missingIdentity = !hasUsableResumeIdentity(resumeData?.name);
  const postingIncomplete = atsReview?.posting?.status && atsReview.posting.status !== "complete";
  const significantGap = ["significant_gap", "needs_full_posting"].includes(atsReview?.readiness?.status);
  const preliminary = Boolean(postingIncomplete || significantGap);

  return {
    canExport: !missingIdentity,
    missingIdentity,
    preliminary,
    buttonLabel: preliminary ? "Download preliminary DOCX" : "Download DOCX",
  };
}
