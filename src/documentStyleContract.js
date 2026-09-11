// Shared visual rules. DOCX uses eighth-points, PDF points, and CSS pt units.
export const DOCUMENT_BULLET = "•";
export function documentSectionText(value, tokens) {
  return tokens.sectionTextTransform === "none" ? String(value) : String(value).toLocaleUpperCase("en-CA");
}
export function documentHeaderRules(tokens, { letter = false } = {}) {
  const kind = tokens.headerTreatment;
  const keyline = ["keyline", "editorial-v2"].includes(kind);
  const top = keyline ? { color: tokens.accent, widthPt: kind === "keyline" ? 2.5 : 1 } : null;
  const bottom = !letter && ["accent-band", "accent-edge"].includes(kind) ? null : {
    color: ["editorial", "civic-rule"].includes(kind) ? tokens.accent : keyline ? tokens.rule : tokens.ink,
    widthPt: kind === "compact-rule" ? 1.2 : ["editorial", "editorial-v2", "keyline"].includes(kind) ? 0.6 : 1,
    double: kind === "civic-rule",
  };
  return { top, bottom };
}
export function documentSectionRule(tokens) {
  const kind = tokens.sectionTreatment || "underline";
  if (["soft-band", "accent-edge"].includes(kind)) return null;
  return {
    color: ["underline", "editorial-v2"].includes(kind) ? tokens.rule : tokens.accent,
    widthPt: ["compact-rule", "label-rule"].includes(kind) ? 1.15 : kind === "civic-label" ? 1 : 0.6,
    double: kind === "civic-label",
  };
}
export const documentCssRule = (rule) => rule ? `${rule.double ? rule.widthPt * 3 : rule.widthPt}pt ${rule.double ? "double" : "solid"} ${rule.color}` : 0;
export const documentDocxRule = (rule, space = 4) => rule ? { color: String(rule.color || "#17191c").replace("#", ""), size: Math.round(rule.widthPt * 8), style: rule.double ? "double" : "single", space } : undefined;
