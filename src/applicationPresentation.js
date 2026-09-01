import {
  DESIGN_IDS,
  RESUME_DESIGN_REGISTRY,
  composeResumeVisualTokens,
  stableHash,
} from "./resumeModel.js";

export const APPLICATION_PRESENTATION_SCHEMA_VERSION = 1;

const stringToken = (value, fallback, max = 180) => typeof value === "string" && value.trim()
  ? value.trim().slice(0, max)
  : fallback;
const numberToken = (value, fallback, min, max) => Number.isFinite(Number(value))
  ? Math.min(max, Math.max(min, Number(value)))
  : fallback;

function presentationBody(renderPlan) {
  const fallbackDesign = RESUME_DESIGN_REGISTRY[DESIGN_IDS.ESSENTIAL_ATS];
  const fallbackTokens = composeResumeVisualTokens(fallbackDesign);
  const source = renderPlan?.visualTokens || fallbackTokens;
  const design = RESUME_DESIGN_REGISTRY[renderPlan?.designId] || fallbackDesign;
  const bodyFontFamily = source.bodyFontFamily || source.fontFamily || fallbackTokens.fontFamily;
  const displayFontFamily = source.displayFontFamily || source.fontFamily || bodyFontFamily;
  const docxBodyFontFamily = source.docxBodyFontFamily || source.docxFontFamily || fallbackTokens.docxFontFamily;
  const docxDisplayFontFamily = source.docxDisplayFontFamily || source.docxFontFamily || docxBodyFontFamily;
  const pdfBodyFontFamily = source.pdfBodyFontFamily || source.pdfFontFamily || fallbackTokens.pdfFontFamily;
  const pdfDisplayFontFamily = source.pdfDisplayFontFamily || source.pdfFontFamily || pdfBodyFontFamily;
  return {
    kind: "application-presentation",
    schemaVersion: APPLICATION_PRESENTATION_SCHEMA_VERSION,
    designId: design.id,
    displayName: design.displayName,
    atsSafetyLevel: design.atsSafetyLevel,
    conservativeFallbackId: design.conservativeFallbackId || DESIGN_IDS.ESSENTIAL_ATS,
    paletteId: stringToken(renderPlan?.paletteId || source.paletteId, "gigscapes-orange-v1"),
    densityId: stringToken(renderPlan?.densityId || source.densityId, "comfortable-v1"),
    headerAlignment: source.headerAlignment === "left" ? "left" : "center",
    tokens: {
      pageWidthIn: numberToken(source.pageWidthIn, 8.5, 7, 9),
      pageHeightIn: numberToken(source.pageHeightIn, 11, 9, 14),
      marginTopIn: numberToken(source.marginTopIn, 0.65, 0.4, 1.25),
      marginRightIn: numberToken(source.marginRightIn, 0.68, 0.4, 1.25),
      marginBottomIn: numberToken(source.marginBottomIn, 0.65, 0.4, 1.25),
      marginLeftIn: numberToken(source.marginLeftIn, 0.68, 0.4, 1.25),
      bodyFontFamily: stringToken(bodyFontFamily, "Arial, Helvetica, sans-serif"),
      displayFontFamily: stringToken(displayFontFamily, bodyFontFamily),
      docxBodyFontFamily: stringToken(docxBodyFontFamily, "Arial", 80),
      docxDisplayFontFamily: stringToken(docxDisplayFontFamily, docxBodyFontFamily, 80),
      pdfBodyFontFamily: stringToken(pdfBodyFontFamily, "helvetica", 40),
      pdfDisplayFontFamily: stringToken(pdfDisplayFontFamily, pdfBodyFontFamily, 40),
      bodyFontSizePt: numberToken(source.bodyFontSizePt, 10, 9, 13),
      nameFontSizePt: numberToken(source.nameFontSizePt, 18, 15, 24),
      headlineFontSizePt: numberToken(source.headlineFontSizePt, 11, 9, 14),
      sectionFontSizePt: numberToken(source.sectionFontSizePt, 10.5, 9, 14),
      bodyLineHeight: numberToken(source.bodyLineHeight, 1.35, 1.2, 1.7),
      coverLetterBodyFontSizePt: numberToken(source.coverLetterBodyFontSizePt, 10.5, 10, 12),
      coverLetterLineHeight: numberToken(source.coverLetterLineHeight, 1.42, 1.3, 1.7),
      coverLetterParagraphAfterPt: numberToken(source.coverLetterParagraphAfterPt, 10, 7, 16),
      ink: stringToken(source.ink, "#17191c", 20),
      muted: stringToken(source.muted, "#515861", 20),
      rule: stringToken(source.rule, "#c9cdd1", 20),
      paper: stringToken(source.paper, "#ffffff", 20),
      accent: stringToken(source.accent, "#1f4f63", 20),
      accentSoft: stringToken(source.accentSoft, "#edf4f7", 20),
      headerTreatment: stringToken(source.headerTreatment, "rule", 40),
      sectionTreatment: stringToken(source.sectionTreatment, "underline", 40),
      sectionTextTransform: stringToken(source.sectionTextTransform, "uppercase", 20),
      sectionLetterSpacingEm: numberToken(source.sectionLetterSpacingEm, 0.04, 0, 0.12),
    },
  };
}

export function createApplicationPresentation(renderPlan) {
  const body = presentationBody(renderPlan);
  return Object.freeze({
    ...body,
    tokens: Object.freeze(body.tokens),
    presentationHash: stableHash(body, "application-presentation"),
  });
}

export function validateApplicationPresentation(presentation) {
  if (presentation?.kind !== "application-presentation" || presentation?.schemaVersion !== APPLICATION_PRESENTATION_SCHEMA_VERSION) {
    throw new Error("A supported application-package presentation is required.");
  }
  const { presentationHash, ...body } = presentation;
  if (presentationHash !== stableHash(body, "application-presentation")) {
    throw new Error("The application-package presentation is invalid or stale.");
  }
  return presentation;
}
