import { isTradesLikeCategory } from "./listingCategories.js";

export function resumeTemplateKind(category, resumeData) {
  if (isTradesLikeCategory(category)) return "trades";
  if (resumeData?.content_strategy === "career_change" || resumeData?.fit_assessment?.path === "career_change") return "career-change";
  return "professional";
}
