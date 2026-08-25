import {
  RESUME_SCHEMA_VERSION,
  buildResumeRenderPlan,
  createResumeContentManifest,
  createResumePackage,
  hasUsableCandidateIdentity,
  stableHash,
} from "./resumeModel.js";

const EXPORT_AUTHORIZATION_TTL_MS = 5 * 60 * 1000;

export function hasUsableResumeIdentity(value) {
  return hasUsableCandidateIdentity(createResumePackage({ name: value }));
}

export function hasVerifiedPosting(atsReview) {
  const readiness = atsReview?.posting_readiness;
  return readiness?.status === "reviewed_complete"
    && readiness.fit_allowed === true
    && readiness.application_ready_allowed === true;
}

export function getResumeExportReadiness(resumeData, atsReview) {
  const resumePackage = createResumePackage(resumeData, { atsReview });
  const missingIdentity = !hasUsableCandidateIdentity(resumePackage);
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

export function getResumeExportNotice(resumeData, atsReview) {
  const readiness = getResumeExportReadiness(resumeData, atsReview);
  if (readiness.missingIdentity) {
    return {
      state: "blocked",
      code: "missing_identity",
      title: "Export blocked — candidate identity missing",
      message: "Add the candidate's real name before creating a résumé file.",
    };
  }
  if (readiness.applicationReady) {
    return {
      state: "ready",
      code: "application_ready",
      title: "Application-ready export",
      message: "The current posting and evidence checks authorize a final DOCX or PDF export.",
    };
  }
  if (!readiness.verifiedPosting) {
    const observedReason = [
      atsReview?.posting_readiness?.reason,
      atsReview?.posting_readiness?.message,
      atsReview?.posting_readiness?.completeness_reason,
    ].find((value) => typeof value === "string" && value.trim());
    return {
      state: "preliminary",
      code: "posting_incomplete",
      title: "Preliminary — posting incomplete",
      message: observedReason?.trim()
        || "The posting is not complete enough to authorize an application-ready export. Downloading a clearly named preliminary file is still available.",
    };
  }
  return {
    state: "preliminary",
    code: "evidence_review_incomplete",
    title: "Preliminary — evidence review incomplete",
    message: "Resolve the evidence or writing checks above before treating this résumé as application-ready.",
  };
}

function assessmentSnapshot(atsReview = {}) {
  return {
    posting_readiness: atsReview?.posting_readiness || null,
    readiness: atsReview?.readiness || null,
    integrity: atsReview?.integrity || null,
    writing: atsReview?.writing || null,
    export_readiness: atsReview?.export_readiness || null,
    application_ready: atsReview?.application_ready,
  };
}

function renderBindingHash(renderPlan) {
  return stableHash({
    templateId: renderPlan?.templateId,
    preliminary: renderPlan?.preliminary,
    manifest: createResumeContentManifest(renderPlan),
  }, "render");
}

function authorizationBindings(resumePackage, assessment, renderPlan) {
  const actualContentHash = stableHash(resumePackage?.document, "resume");
  if (resumePackage?.schemaVersion !== RESUME_SCHEMA_VERSION || resumePackage?.contentHash !== actualContentHash) {
    throw new Error("The canonical résumé content hash is invalid or stale.");
  }
  return {
    schemaVersion: RESUME_SCHEMA_VERSION,
    contentHash: resumePackage.contentHash,
    identityHash: stableHash(resumePackage.document.candidate, "identity"),
    postingHash: stableHash({ target: resumePackage.document.target, postingReadiness: assessment.posting_readiness }, "posting"),
    renderPlanHash: renderBindingHash(renderPlan),
  };
}

export function createResumeExportContext(resumeData, atsReview, { item = {}, templateId } = {}) {
  const resumePackage = createResumePackage(resumeData, { item, atsReview, selectedTemplateId: templateId });
  const readiness = getResumeExportReadiness(resumePackage, atsReview);
  const assessment = assessmentSnapshot(atsReview);
  const renderPlan = buildResumeRenderPlan(resumePackage, templateId, { preliminary: readiness.preliminary });
  const createdAt = Date.now();
  const authorization = {
    ...authorizationBindings(resumePackage, assessment, renderPlan),
    mode: readiness.preliminary ? "preliminary" : "final",
    createdAt,
    expiresAt: createdAt + EXPORT_AUTHORIZATION_TTL_MS,
  };
  return {
    kind: "resume-export-context",
    resumePackage,
    assessment,
    readiness,
    authorization,
    renderPlan,
  };
}

export function validateResumeExportContext(context, now = Date.now()) {
  if (context?.kind !== "resume-export-context") throw new Error("A trusted résumé export context is required.");
  const { resumePackage, assessment, authorization, renderPlan } = context;
  const expectedBindings = authorizationBindings(resumePackage, assessment, renderPlan);
  for (const [key, expected] of Object.entries(expectedBindings)) {
    if (authorization?.[key] !== expected) throw new Error("The résumé export authorization is stale or does not match this document.");
  }
  if (!Number.isFinite(authorization?.expiresAt) || now > authorization.expiresAt) {
    throw new Error("The résumé export authorization expired. Review the export status again.");
  }
  const readiness = getResumeExportReadiness(resumePackage, assessment);
  const expectedMode = readiness.preliminary ? "preliminary" : "final";
  if (authorization?.mode !== expectedMode || renderPlan?.preliminary !== readiness.preliminary) {
    throw new Error("The résumé export authorization no longer matches the canonical readiness decision.");
  }
  if (!readiness.canExport) throw new Error("Candidate name is required before export.");
  if (renderPlan?.contentHash !== resumePackage.contentHash) throw new Error("The résumé render plan does not match the authorized content.");
  const expectedRenderPlan = buildResumeRenderPlan(resumePackage, renderPlan.templateId, { preliminary: readiness.preliminary });
  if (renderBindingHash(renderPlan) !== expectedRenderPlan.renderPlanHash) {
    throw new Error("The résumé render plan is stale or does not match the authorized document.");
  }
  return context;
}
