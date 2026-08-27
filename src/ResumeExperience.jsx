import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "./auth.jsx";
import { ResumeActions } from "./ResumeActions.jsx";
import { CoverLetterWorkspace } from "./CoverLetterWorkspace.jsx";
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

export function ResumeExperience({ baseResume = "", resumeData, item, hasLink, atsReview, candidateEvidence = [], customJob = null, requestPrivateProcessing, onEditResume, onTailoringChangeDecision, requestAccountAction, qualityRoute = "app", qualityPostingSource = "not_applicable", C, primaryBtnStyle }) {
  const { session } = useAuth();
  const previewRef = useRef(null);
  const [showOptions, setShowOptions] = useState(false);
  const userId = session?.user?.id || "";
  const targetKey = useMemo(() => resumeTemplateTargetKey(item), [item]);
  const recommendationPackage = useMemo(() => createResumePackage(resumeData, { item, atsReview }), [resumeData, item, atsReview]);
  const storedSelection = useMemo(() => loadResumePresentationSelection(userId, targetKey), [userId, targetKey]);
  const [selectedStrategyId, setSelectedStrategyId] = useState(() => storedSelection?.strategyId || recommendationPackage.presentation.recommendedStrategyId);
  const [selectedDesignId, setSelectedDesignId] = useState(() => storedSelection?.designId || recommendationPackage.presentation.recommendedDesignId);

  useEffect(() => {
    setSelectedStrategyId(storedSelection?.strategyId || recommendationPackage.presentation.recommendedStrategyId);
    setSelectedDesignId(storedSelection?.designId || recommendationPackage.presentation.recommendedDesignId);
  }, [storedSelection, recommendationPackage.presentation.recommendedStrategyId, recommendationPackage.presentation.recommendedDesignId]);

  useEffect(() => {
    void import("./resumeDocx.js")
      .then(({ prepareResumeDocxExport }) => prepareResumeDocxExport())
      .catch(() => {});
  }, []);

  const resumePackage = useMemo(
    () => createResumePackage(resumeData, { item, atsReview, selectedStrategyId, selectedDesignId }),
    [resumeData, item, atsReview, selectedStrategyId, selectedDesignId],
  );
  const readiness = useMemo(() => getResumeExportReadiness(resumePackage, atsReview), [resumePackage, atsReview]);
  const exportNotice = useMemo(() => getResumeExportNotice(resumePackage, atsReview), [resumePackage, atsReview]);
  const renderPlan = useMemo(
    () => buildResumeRenderPlan(resumePackage, { strategyId: selectedStrategyId, designId: selectedDesignId }, { preliminary: readiness.preliminary }),
    [resumePackage, selectedStrategyId, selectedDesignId, readiness.preliminary],
  );
  const recommendedStrategy = RESUME_STRATEGY_REGISTRY[resumePackage.presentation.recommendedStrategyId];
  const recommendedDesign = RESUME_DESIGN_REGISTRY[resumePackage.presentation.recommendedDesignId];
  const selectedDesign = RESUME_DESIGN_REGISTRY[renderPlan.designId];
  const controlId = `design-control-${targetKey || "resume"}`;

  const chooseDesign = (designId) => {
    setSelectedDesignId(designId);
    saveResumePresentationSelection(userId, targetKey, { strategyId: selectedStrategyId, designId });
  };

  return (
    <div>
      <ResumeDesignSelector
        designs={DESIGN_OPTIONS}
        recommendedStrategy={recommendedStrategy}
        recommendedDesign={recommendedDesign}
        selectedDesign={selectedDesign}
        recommendationReason={resumePackage.presentation.recommendationReason}
        showOptions={showOptions}
        onToggle={() => setShowOptions((value) => !value)}
        onChoose={chooseDesign}
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
        selection={{ strategyId: renderPlan.strategyId, designId: renderPlan.designId }}
        previewRef={previewRef}
        item={item}
        hasLink={hasLink}
        atsReview={atsReview}
        onEditResume={onEditResume}
        requestAccountAction={requestAccountAction}
        qualityRoute={qualityRoute}
        qualityPostingSource={qualityPostingSource}
        C={C}
        primaryBtnStyle={primaryBtnStyle}
      />
      <CoverLetterWorkspace
        baseResume={baseResume}
        resumeData={resumeData}
        item={item}
        atsReview={atsReview}
        candidateEvidence={candidateEvidence}
        customJob={customJob}
        requestPrivateProcessing={requestPrivateProcessing}
        requestAccountAction={requestAccountAction}
        C={C}
        primaryBtnStyle={primaryBtnStyle}
      />
    </div>
  );
}
