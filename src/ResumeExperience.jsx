import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "./auth.jsx";
import { ResumeActions } from "./ResumeActions.jsx";
import { CoverLetterWorkspace } from "./CoverLetterWorkspace.jsx";
import { ApplicationPackageSummary } from "./ApplicationPackageSummary.jsx";
import { createApplicationPresentation } from "./applicationPresentation.js";
import {
  applicationDocumentStateFromReadiness,
  createApplicationPackageState,
} from "./applicationPackageModel.js";
import { saveApplicationPackageState } from "./applicationPackageStorage.js";
import { getCoverLetterReadiness } from "./coverLetterModel.js";
import { loadCoverLetterDraftForReview } from "./coverLetterStorage.js";
import { ResumeDocumentPreview } from "./ResumeDocumentPreview.jsx";
import { ResumeDesignSelector } from "./ResumeDesignSelector.jsx";
import { QualityFeedback } from "./QualityFeedback.jsx";
import { TailoringChangeReview } from "./TailoringChangeReview.jsx";
import { emitResumeQualitySignal } from "./qualitySignals.js";
import {
  RESUME_DESIGN_REGISTRY,
  RESUME_STRATEGY_REGISTRY,
  availableResumeDesigns,
  buildResumeRenderPlan,
  createResumePackage,
} from "./resumeModel.js";
import { getResumeExportNotice, getResumeExportReadiness } from "./resumeReadiness.js";
import {
  loadResumePresentationSelection,
  resumeTemplateTargetKey,
  saveResumePresentationSelection,
} from "./resumeTemplateStorage.js";

const DESIGN_OPTIONS = availableResumeDesigns();

export function ResumeExperience({ baseResume = "", resumeData, item, hasLink, atsReview, candidateEvidence = [], customJob = null, applicationIntent = "resume_only", initialCoverLetterOpen = false, requestPrivateProcessing, onEditResume, onTailoringChangeDecision, requestAccountAction, qualityRoute = "app", qualityPostingSource = "not_applicable", C, primaryBtnStyle }) {
  const { session } = useAuth();
  const previewRef = useRef(null);
  const coverLetterRef = useRef(null);
  const [showOptions, setShowOptions] = useState(false);
  const userId = session?.user?.id || "";
  const targetKey = useMemo(() => resumeTemplateTargetKey(item), [item]);
  const recommendationPackage = useMemo(() => createResumePackage(resumeData, { item, atsReview }), [resumeData, item, atsReview]);
  const storedSelection = useMemo(() => loadResumePresentationSelection(userId, targetKey), [userId, targetKey]);
  const [selectedStrategyId, setSelectedStrategyId] = useState(() => storedSelection?.strategyId || recommendationPackage.presentation.recommendedStrategyId);
  const [selectedDesignId, setSelectedDesignId] = useState(() => storedSelection?.designId || recommendationPackage.presentation.recommendedDesignId);
  const [selectedPaletteId, setSelectedPaletteId] = useState(() => storedSelection?.paletteId || recommendationPackage.presentation.selectedPaletteId);
  const [selectedDensityId, setSelectedDensityId] = useState(() => storedSelection?.densityId || recommendationPackage.presentation.selectedDensityId);
  const [selectedHeaderAlignment, setSelectedHeaderAlignment] = useState(() => storedSelection?.headerAlignment || recommendationPackage.presentation.selectedHeaderAlignment);
  const [selectedLengthPreference, setSelectedLengthPreference] = useState(() => storedSelection?.lengthPreference || recommendationPackage.presentation.selectedLengthPreference);

  useEffect(() => {
    setSelectedStrategyId(storedSelection?.strategyId || recommendationPackage.presentation.recommendedStrategyId);
    setSelectedDesignId(storedSelection?.designId || recommendationPackage.presentation.recommendedDesignId);
    setSelectedPaletteId(storedSelection?.paletteId || recommendationPackage.presentation.selectedPaletteId);
    setSelectedDensityId(storedSelection?.densityId || recommendationPackage.presentation.selectedDensityId);
    setSelectedHeaderAlignment(storedSelection?.headerAlignment || recommendationPackage.presentation.selectedHeaderAlignment);
    setSelectedLengthPreference(storedSelection?.lengthPreference || recommendationPackage.presentation.selectedLengthPreference);
  }, [
    storedSelection,
    recommendationPackage.presentation.recommendedStrategyId,
    recommendationPackage.presentation.recommendedDesignId,
    recommendationPackage.presentation.selectedPaletteId,
    recommendationPackage.presentation.selectedDensityId,
    recommendationPackage.presentation.selectedHeaderAlignment,
    recommendationPackage.presentation.selectedLengthPreference,
  ]);

  const resumePackage = useMemo(
    () => createResumePackage(resumeData, {
      item,
      atsReview,
      selectedStrategyId,
      selectedDesignId,
      selectedPaletteId,
      selectedDensityId,
      selectedHeaderAlignment,
      selectedLengthPreference,
    }),
    [resumeData, item, atsReview, selectedStrategyId, selectedDesignId, selectedPaletteId, selectedDensityId, selectedHeaderAlignment, selectedLengthPreference],
  );
  const readiness = useMemo(() => getResumeExportReadiness(resumePackage, atsReview), [resumePackage, atsReview]);
  const exportNotice = useMemo(() => getResumeExportNotice(resumePackage, atsReview), [resumePackage, atsReview]);
  const renderPlan = useMemo(
    () => buildResumeRenderPlan(resumePackage, {
      strategyId: selectedStrategyId,
      designId: selectedDesignId,
      paletteId: selectedPaletteId,
      densityId: selectedDensityId,
      headerAlignment: selectedHeaderAlignment,
      lengthPreference: selectedLengthPreference,
    }, { preliminary: readiness.preliminary }),
    [resumePackage, selectedStrategyId, selectedDesignId, selectedPaletteId, selectedDensityId, selectedHeaderAlignment, selectedLengthPreference, readiness.preliminary],
  );
  const recommendedStrategy = RESUME_STRATEGY_REGISTRY[resumePackage.presentation.recommendedStrategyId];
  const recommendedDesign = RESUME_DESIGN_REGISTRY[resumePackage.presentation.recommendedDesignId];
  const selectedDesign = RESUME_DESIGN_REGISTRY[renderPlan.designId];
  const controlId = `design-control-${targetKey || "resume"}`;
  const applicationPresentation = useMemo(() => createApplicationPresentation(renderPlan), [renderPlan]);
  const coverLetterContext = useMemo(
    () => ({ baseResume, resumeData, item, atsReview, candidateEvidence }),
    [baseResume, resumeData, item, atsReview, candidateEvidence],
  );
  const storedCoverLetter = useMemo(
    () => loadCoverLetterDraftForReview(userId, item),
    [userId, item, coverLetterContext],
  );
  const storedCoverLetterReadiness = useMemo(
    () => getCoverLetterReadiness(storedCoverLetter, coverLetterContext),
    [storedCoverLetter, coverLetterContext],
  );
  const [showCoverLetter, setShowCoverLetter] = useState(() => initialCoverLetterOpen || Boolean(storedCoverLetter));
  const [coverLetterStatus, setCoverLetterStatus] = useState(() => applicationDocumentStateFromReadiness(storedCoverLetterReadiness, { exists: Boolean(storedCoverLetter) }));
  const [focusCoverLetter, setFocusCoverLetter] = useState(false);
  const resumeStatus = applicationDocumentStateFromReadiness(readiness);
  const packageIntent = applicationIntent === "package" || showCoverLetter || coverLetterStatus !== "not_created" ? "package" : "resume_only";
  const packageState = useMemo(() => createApplicationPackageState({
    item,
    intent: packageIntent,
    resumeStatus,
    coverLetterStatus,
    sourceFingerprint: storedCoverLetter?.sourceFingerprint || resumePackage.contentHash,
  }), [coverLetterStatus, item, packageIntent, resumePackage.contentHash, resumeStatus, storedCoverLetter?.sourceFingerprint]);

  useEffect(() => {
    setShowCoverLetter(initialCoverLetterOpen || Boolean(storedCoverLetter));
    setCoverLetterStatus(applicationDocumentStateFromReadiness(storedCoverLetterReadiness, { exists: Boolean(storedCoverLetter) }));
  }, [initialCoverLetterOpen, storedCoverLetter, storedCoverLetterReadiness, targetKey]);

  useEffect(() => {
    if (userId) saveApplicationPackageState(userId, packageState);
  }, [packageState, userId]);

  useEffect(() => {
    if (!showCoverLetter || !focusCoverLetter || !coverLetterRef.current) return undefined;
    const frame = globalThis.requestAnimationFrame?.(() => {
      coverLetterRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      coverLetterRef.current?.focus({ preventScroll: true });
      setFocusCoverLetter(false);
    });
    return () => { if (frame !== undefined) globalThis.cancelAnimationFrame?.(frame); };
  }, [focusCoverLetter, showCoverLetter]);

  const openCoverLetter = useCallback(() => {
    setShowCoverLetter(true);
    setFocusCoverLetter(true);
  }, []);
  const handleCoverLetterStatus = useCallback(({ status }) => {
    setCoverLetterStatus((current) => current === status ? current : status);
  }, []);

  const updatePresentation = (changes) => {
    const next = {
      strategyId: selectedStrategyId,
      designId: selectedDesignId,
      paletteId: selectedPaletteId,
      densityId: selectedDensityId,
      headerAlignment: selectedHeaderAlignment,
      lengthPreference: selectedLengthPreference,
      ...changes,
    };
    if (changes.designId) setSelectedDesignId(changes.designId);
    if (changes.paletteId) setSelectedPaletteId(changes.paletteId);
    if (changes.densityId) setSelectedDensityId(changes.densityId);
    if (changes.headerAlignment) setSelectedHeaderAlignment(changes.headerAlignment);
    if (changes.lengthPreference) setSelectedLengthPreference(changes.lengthPreference);
    saveResumePresentationSelection(userId, targetKey, next);
  };

  return (
    <div>
      <ApplicationPackageSummary
        item={item}
        packageStatus={packageState.packageStatus}
        resumeStatus={resumeStatus}
        coverLetterStatus={coverLetterStatus}
        onReviewResume={() => previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
        onOpenCoverLetter={openCoverLetter}
        C={C}
      />

      {showCoverLetter ? (
        <CoverLetterWorkspace
          baseResume={baseResume}
          resumeData={resumeData}
          item={item}
          atsReview={atsReview}
          candidateEvidence={candidateEvidence}
          customJob={customJob}
          requestPrivateProcessing={requestPrivateProcessing}
          requestAccountAction={requestAccountAction}
          applicationPresentation={applicationPresentation}
          workspaceRef={coverLetterRef}
          onStatusChange={handleCoverLetterStatus}
          C={C}
          primaryBtnStyle={primaryBtnStyle}
        />
      ) : null}

      <ResumeDesignSelector
        designs={DESIGN_OPTIONS}
        recommendedStrategy={recommendedStrategy}
        recommendedDesign={recommendedDesign}
        selectedDesign={selectedDesign}
        selectedPresentation={{
          designId: selectedDesignId,
          paletteId: selectedPaletteId,
          densityId: selectedDensityId,
          headerAlignment: selectedHeaderAlignment,
          lengthPreference: selectedLengthPreference,
        }}
        recommendationReason={resumePackage.presentation.recommendationReason}
        showOptions={showOptions}
        onToggle={() => setShowOptions((value) => !value)}
        onChoose={(designId) => updatePresentation({ designId })}
        onUseFallback={() => updatePresentation({ designId: selectedDesign.conservativeFallbackId })}
        onPresentationChange={updatePresentation}
        controlId={controlId}
        C={C}
      />

      <TailoringChangeReview
        changes={atsReview?.tailoring_changes || []}
        resumeData={resumeData}
        onDecision={onTailoringChangeDecision}
        C={C}
      />

      <div
        role={exportNotice.state === "blocked" ? "alert" : "status"}
        data-export-state={exportNotice.state}
        style={{
          margin: "0 0 12px",
          padding: "10px 12px",
          border: `1px solid ${exportNotice.state === "ready" ? (C.greenBorder || C.green) : exportNotice.state === "blocked" ? C.red : (C.amberBorder || C.amber)}`,
          borderRadius: 10,
          background: exportNotice.state === "ready" ? (C.greenTint || "#f2fbf6") : exportNotice.state === "blocked" ? "#fff2f0" : (C.amberTint || "#fff8eb"),
          color: exportNotice.state === "ready" ? C.green : exportNotice.state === "blocked" ? C.red : C.amber,
          fontSize: 12.5,
          lineHeight: 1.5,
        }}
      >
        <strong>{exportNotice.title}</strong> · {exportNotice.message}
        {exportNotice.state === "preliminary" ? " This guidance is not included in the résumé file." : ""}
      </div>
      <ResumeDocumentPreview ref={previewRef} renderPlan={renderPlan} />
      <QualityFeedback
        key={resumePackage.contentHash}
        kind="fit"
        C={C}
        onSubmit={({ feedback, feedbackReason }) => emitResumeQualitySignal("fit_feedback_submitted", {
          resumeData,
          resumePackage,
          item,
          atsReview,
          route: qualityRoute,
          postingSource: qualityPostingSource,
          outcome: "completed",
          feedback,
          feedbackReason,
        })}
      />
      <ResumeActions
        resumeData={resumeData}
        resumePackage={resumePackage}
        renderPlan={renderPlan}
        selection={{
          strategyId: renderPlan.strategyId,
          designId: renderPlan.designId,
          paletteId: renderPlan.paletteId,
          densityId: renderPlan.densityId,
          headerAlignment: renderPlan.headerAlignment,
          lengthPreference: renderPlan.lengthPreference,
        }}
        previewRef={previewRef}
        item={item}
        hasLink={hasLink}
        atsReview={atsReview}
        onEditResume={onEditResume}
        onCreateCoverLetter={openCoverLetter}
        coverLetterStatus={coverLetterStatus}
        requestAccountAction={requestAccountAction}
        qualityRoute={qualityRoute}
        qualityPostingSource={qualityPostingSource}
        C={C}
        primaryBtnStyle={primaryBtnStyle}
      />
    </div>
  );
}
