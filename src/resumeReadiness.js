import { normalizeResumeForExport } from "./resumeExport.js";

const PLACEHOLDER_IDENTITY = /^(?:<\s*)?(?:unknown|unnamed|name unavailable|candidate|n\/?a|null|undefined)(?:\s*>)?$/i;

export function hasUsableResumeIdentity(value) {
  const text = normalizeResumeForExport({ name: value }).name;
  return Boolean(text) && !PLACEHOLDER_IDENTITY.test(text);
}

export function hasVerifiedPosting(atsReview) {
  const readiness = atsReview?.posting_readiness;
  return readiness?.status === "reviewed_complete"
    && readiness.fit_allowed === true
    && readiness.application_ready_allowed === true;
}

export function getResumeExportReadiness(resumeData, atsReview) {
  const missingIdentity = !hasUsableResumeIdentity(resumeData?.name);
  const verifiedPosting = hasVerifiedPosting(atsReview);
  const significantGap = ["significant_gap", "needs_full_posting"].includes(atsReview?.readiness?.status);
  const reviewBlocked = atsReview?.integrity?.status === "blocked"
    || atsReview?.writing?.status === "blocked"
    || atsReview?.export_readiness?.status === "blocked";
  const derivedApplicationReady = verifiedPosting && !missingIdentity && !significantGap && !reviewBlocked;
  const applicationReady = Boolean(
    derivedApplicationReady
      && (typeof atsReview?.application_ready === "boolean" ? atsReview.application_ready : true)
      && (typeof atsReview?.export_readiness?.application_ready === "boolean"
        ? atsReview.export_readiness.application_ready
        : true),
  );
  const preliminary = !applicationReady;

  return {
    canExport: !missingIdentity,
    missingIdentity,
    verifiedPosting,
    applicationReady,
    preliminary,
    buttonLabel: preliminary ? "Download preliminary DOCX" : "Download tailored résumé",
    docxButtonLabel: preliminary ? "Download preliminary DOCX" : "Download tailored DOCX",
    pdfButtonLabel: preliminary ? "Download preliminary PDF" : "Download tailored PDF",
  };
}
