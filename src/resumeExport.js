import {
  assertResumePackageIdentity,
  cleanScalar,
  createResumePackage,
  normalizeResumeForLegacyView,
  safeResumeFilenameFromPackage,
  serializeApprovedValue,
} from "./resumeModel.js";

/**
 * Compatibility wrapper for the previously public safe serializer. New code
 * should normalize through ResumePackage and render through ResumeRenderPlan.
 */
export function serializeExportText(value, options = {}) {
  return serializeApprovedValue(value, options);
}

/**
 * Legacy view retained for existing callers and migrations. It is derived from
 * the versioned canonical package rather than maintained as a second model.
 */
export function normalizeResumeForExport(resumeData = {}, context = {}) {
  return normalizeResumeForLegacyView(resumeData, context);
}

export function assertResumeExportIdentity(resumeData) {
  return assertResumePackageIdentity(createResumePackage(resumeData));
}

export function safeResumeFilename(resumeData, extension, options = {}) {
  return safeResumeFilenameFromPackage(createResumePackage(resumeData), cleanScalar(extension), options);
}
