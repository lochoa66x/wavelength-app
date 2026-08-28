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

export function deriveResumeReadinessState({
  missingIdentity,
  verifiedPosting,
  requirementsAnalyzed,
  significantGap,
  evidenceReviewBlocked,
} = {}) {
  if (missingIdentity) return "blocked_identity";
  if (!verifiedPosting) return "needs_posting_review";
  if (!requirementsAnalyzed) return "needs_requirement_analysis";
  if (significantGap) return "preliminary";
  if (evidenceReviewBlocked) return "needs_evidence_review";
  return "application_ready";
}

export function getResumeExportReadiness(resumeData, atsReview) {
  const resumePackage = createResumePackage(resumeData, { atsReview });
  const missingIdentity = !hasUsableCandidateIdentity(resumePackage);
  const verifiedPosting = hasVerifiedPosting(atsReview);
  const requirementCount = Array.isArray(atsReview?.requirements) ? atsReview.requirements.length : 0;
  const coverageTotal = ["direct", "adjacent", "transferable", "missing"]
    .reduce((total, key) => total + Number(atsReview?.coverage?.[key] || 0), 0);
  const requirementsAnalyzed = requirementCount > 0
    && coverageTotal > 0
    && requirementCount === coverageTotal;
  const significantGap = ["significant_gap", "needs_full_posting"].includes(atsReview?.readiness?.status);
  const evidenceReviewBlocked = atsReview?.integrity?.status === "blocked"
    || atsReview?.writing?.status === "blocked"
    || atsReview?.export_readiness?.status === "blocked"
    || Boolean(atsReview?.export_readiness?.blockers?.length);
  const state = deriveResumeReadinessState({
    missingIdentity,
    verifiedPosting,
    requirementsAnalyzed,
    significantGap,
    evidenceReviewBlocked,
  });
  const applicationReady = state === "application_ready";
  const preliminary = !applicationReady;

  return {
    state,
    canExport: !missingIdentity,
    missingIdentity,
    verifiedPosting,
    requirementsAnalyzed,
    applicationReady,
    preliminary,
    buttonLabel: preliminary ? "Download preliminary DOCX" : "Download tailored résumé",
    docxButtonLabel: preliminary ? "Download preliminary DOCX" : "Download tailored DOCX",
    pdfButtonLabel: preliminary ? "Download preliminary PDF" : "Download tailored PDF",
  };
}

export function getResumeExportNotice(resumeData, atsReview) {
  const readiness = getResumeExportReadiness(resumeData, atsReview);
  if (readiness.state === "blocked_identity") {
    return {
      state: "blocked",
      code: "missing_identity",
      title: "Export blocked — candidate identity missing",
      message: "Add the candidate's real name before creating a résumé file.",
    };
  }
  if (readiness.state === "application_ready") {
    return {
      state: "ready",
      code: "application_ready",
      title: "Application-ready export",
      message: "The current posting and evidence checks authorize a final DOCX or PDF export.",
    };
  }
  if (readiness.state === "needs_posting_review") {
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
  if (readiness.state === "needs_requirement_analysis") {
    return {
      state: "preliminary",
      code: "requirement_analysis_incomplete",
      title: "Preliminary — requirement analysis incomplete",
      message: "The posting was reviewed, but its responsibilities and qualifications did not produce a complete atomic requirement analysis. Review the posting fields and run tailoring again.",
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
    requirements: Array.isArray(atsReview?.requirements) ? structuredClone(atsReview.requirements) : [],
    coverage: {
      direct: Number(atsReview?.coverage?.direct || 0),
      adjacent: Number(atsReview?.coverage?.adjacent || 0),
      transferable: Number(atsReview?.coverage?.transferable || 0),
      missing: Number(atsReview?.coverage?.missing || 0),
    },
    gap_summary: atsReview?.gap_summary ? structuredClone(atsReview.gap_summary) : null,
  };
}

function renderBindingHash(renderPlan) {
  return stableHash({
    strategyId: renderPlan?.strategyId,
    designId: renderPlan?.designId,
    paletteId: renderPlan?.paletteId,
    densityId: renderPlan?.densityId,
    headerAlignment: renderPlan?.headerAlignment,
    lengthPreference: renderPlan?.lengthPreference,
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
    assessmentHash: stableHash(assessment, "assessment"),
    renderPlanHash: renderBindingHash(renderPlan),
  };
}

export function createResumeExportContext(resumeData, atsReview, {
  item = {},
  templateId,
  strategyId,
  designId,
  paletteId,
  densityId,
  headerAlignment,
  lengthPreference,
} = {}) {
  const resumePackage = createResumePackage(resumeData, {
    item,
    atsReview,
    selectedTemplateId: templateId,
    selectedStrategyId: strategyId,
    selectedDesignId: designId,
    selectedPaletteId: paletteId,
    selectedDensityId: densityId,
    selectedHeaderAlignment: headerAlignment,
    selectedLengthPreference: lengthPreference,
  });
  const readiness = getResumeExportReadiness(resumePackage, atsReview);
  const assessment = assessmentSnapshot(atsReview);
  const renderPlan = buildResumeRenderPlan(
    resumePackage,
    {
      strategyId: resumePackage.presentation.selectedStrategyId,
      designId: resumePackage.presentation.selectedDesignId,
      paletteId: resumePackage.presentation.selectedPaletteId,
      densityId: resumePackage.presentation.selectedDensityId,
      headerAlignment: resumePackage.presentation.selectedHeaderAlignment,
      lengthPreference: resumePackage.presentation.selectedLengthPreference,
    },
    { preliminary: readiness.preliminary },
  );
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
  const expectedRenderPlan = buildResumeRenderPlan(
    resumePackage,
    {
      strategyId: renderPlan.strategyId,
      designId: renderPlan.designId,
      paletteId: renderPlan.paletteId,
      densityId: renderPlan.densityId,
      headerAlignment: renderPlan.headerAlignment,
      lengthPreference: renderPlan.lengthPreference,
    },
    { preliminary: readiness.preliminary },
  );
  if (renderBindingHash(renderPlan) !== expectedRenderPlan.renderPlanHash) {
    throw new Error("The résumé render plan is stale or does not match the authorized document.");
  }
  return context;
}
