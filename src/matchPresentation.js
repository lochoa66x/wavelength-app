import { titleMatchesSearchQuery } from "./listingCategories.js";

const FIT_PRESENTATIONS = {
  direct: { kind: "fit", tone: "direct", label: "Direct résumé fit" },
  adjacent: { kind: "fit", tone: "adjacent", label: "Adjacent résumé fit" },
  career_change: { kind: "fit", tone: "career-change", label: "Career-change path" },
};

export function getMatchPresentation({ listing, keyword = "", fitAssessment = null }) {
  const fit = FIT_PRESENTATIONS[fitAssessment?.path];
  if (fit) return fit;

  if (!String(keyword || "").trim()) {
    return { kind: "search", tone: "related", label: "Category result" };
  }

  if (titleMatchesSearchQuery(listing, keyword)) {
    return { kind: "search", tone: "title", label: "Title match" };
  }

  return { kind: "search", tone: "related", label: "Related result" };
}
