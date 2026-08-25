import { useEffect, useMemo, useRef, useState } from "react";

import { useAuth } from "./auth.jsx";
import { ResumeActions } from "./ResumeActions.jsx";
import { ResumeDocumentPreview } from "./ResumeDocumentPreview.jsx";
import { ResumeTemplateSelector } from "./ResumeTemplateSelector.jsx";
import {
  RESUME_TEMPLATE_REGISTRY,
  availableResumeTemplates,
  buildResumeRenderPlan,
  createResumePackage,
} from "./resumeModel.js";
import { getResumeExportReadiness } from "./resumeReadiness.js";
import {
  loadResumeTemplateSelection,
  resumeTemplateTargetKey,
  saveResumeTemplateSelection,
} from "./resumeTemplateStorage.js";

const TEMPLATE_OPTIONS = availableResumeTemplates();

export function ResumeExperience({ resumeData, item, hasLink, atsReview, onEditResume, C, primaryBtnStyle }) {
  const { session } = useAuth();
  const previewRef = useRef(null);
  const [showOptions, setShowOptions] = useState(false);
  const userId = session?.user?.id || "";
  const targetKey = useMemo(() => resumeTemplateTargetKey(item), [item]);
  const recommendationPackage = useMemo(() => createResumePackage(resumeData, { item, atsReview }), [resumeData, item, atsReview]);
  const storedSelection = useMemo(() => loadResumeTemplateSelection(userId, targetKey), [userId, targetKey]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(() => storedSelection || recommendationPackage.presentation.recommendedTemplateId);

  useEffect(() => {
    setSelectedTemplateId(storedSelection || recommendationPackage.presentation.recommendedTemplateId);
  }, [storedSelection, recommendationPackage.presentation.recommendedTemplateId]);

  useEffect(() => {
    void import("./resumeDocx.js")
      .then(({ prepareResumeDocxExport }) => prepareResumeDocxExport())
      .catch(() => {});
  }, []);

  const resumePackage = useMemo(() => createResumePackage(resumeData, { item, atsReview, selectedTemplateId }), [resumeData, item, atsReview, selectedTemplateId]);
  const readiness = useMemo(() => getResumeExportReadiness(resumePackage, atsReview), [resumePackage, atsReview]);
  const renderPlan = useMemo(
    () => buildResumeRenderPlan(resumePackage, selectedTemplateId, { preliminary: readiness.preliminary }),
    [resumePackage, selectedTemplateId, readiness.preliminary],
  );
  const recommended = RESUME_TEMPLATE_REGISTRY[resumePackage.presentation.recommendedTemplateId];
  const selected = RESUME_TEMPLATE_REGISTRY[renderPlan.templateId];
  const controlId = `template-control-${targetKey || "resume"}`;

  const chooseTemplate = (templateId) => {
    setSelectedTemplateId(templateId);
    saveResumeTemplateSelection(userId, targetKey, templateId);
  };

  return (
    <div>
      <ResumeTemplateSelector
        templates={TEMPLATE_OPTIONS}
        recommended={recommended}
        selected={selected}
        recommendationReason={resumePackage.presentation.recommendationReason}
        showOptions={showOptions}
        onToggle={() => setShowOptions((value) => !value)}
        onChoose={chooseTemplate}
        controlId={controlId}
        C={C}
      />

      {readiness.preliminary ? (
        <p role="status" style={{ margin: "0 0 12px", padding: "10px 12px", border: `1px solid ${C.amberBorder || C.amber}`, borderRadius: 10, background: C.amberBg || "#fff8eb", color: C.amber, fontSize: 12.5, lineHeight: 1.5 }}>
          Preliminary résumé — downloading is available, but resolve the posting or evidence gaps above before treating it as application-ready. This guidance is not included in the résumé file.
        </p>
      ) : null}
      <ResumeDocumentPreview ref={previewRef} renderPlan={renderPlan} />
      <ResumeActions
        resumeData={resumeData}
        resumePackage={resumePackage}
        renderPlan={renderPlan}
        template={renderPlan.templateId}
        previewRef={previewRef}
        item={item}
        hasLink={hasLink}
        atsReview={atsReview}
        onEditResume={onEditResume}
        C={C}
        primaryBtnStyle={primaryBtnStyle}
      />
    </div>
  );
}
