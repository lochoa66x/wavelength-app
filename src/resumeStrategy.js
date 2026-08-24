import { isTradesLikeCategory } from "./listingCategories.js";
import { createResumePackage } from "./resumeModel.js";

export function resumeTemplateKind(category, resumeData) {
  if (isTradesLikeCategory(category)) return "trades";
  if (resumeData?.content_strategy === "career_change" || resumeData?.fit_assessment?.path === "career_change") return "career-change";
  return "professional";
}

export function recommendResumeTemplate(resumeData, { item = {}, atsReview = {} } = {}) {
  const resumePackage = createResumePackage(resumeData, { item, atsReview });
  return {
    templateId: resumePackage.presentation.recommendedTemplateId,
    reason: resumePackage.presentation.recommendationReason,
    trace: resumePackage.classification.recommendationTrace,
    occupationFamily: resumePackage.classification.occupationFamily,
    careerStrategy: resumePackage.classification.careerStrategy,
  };
}
