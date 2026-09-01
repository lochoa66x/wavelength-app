const PATH_LABELS = {
  direct: "Role-aligned strategy",
  adjacent: "Adjacent-expertise strategy",
  transferable: "Transferable-strengths strategy",
  career_change: "Transferable-strengths strategy",
};

function safePositioningText(value, fallback) {
  return String(value || fallback || "")
    .replace(/\bcareer[ -](?:change|transition)\b/gi, "transferable-strengths positioning")
    .replace(/\btransitional(?:\s+positioning)?\b/gi, "professional positioning based on verified experience")
    .replace(/\btransition(?:al|ing)?\s+(?:into|to)\b/gi, "applying verified experience toward")
    .replace(/\btransition(?:al)?\s+or\s+entry-level\s+positioning\b/gi, "professional positioning based on verified experience")
    .replace(/\bnew\s+(?:career|path|journey)\b/gi, "next professional opportunity")
    .trim();
}

export function PositioningSummary({ assessment, C }) {
  if (!assessment) return null;
  const transferable = ["transferable", "career_change"].includes(assessment.path);
  return (
    <div style={{ background: transferable ? C.amberTint : C.blueTint, border: `1px solid ${transferable ? C.amberBorder : C.blueBorder}`, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
      <div style={{ color: transferable ? C.amber : C.blue, fontSize: 12.5, fontWeight: 750, marginBottom: 3 }}>{PATH_LABELS[assessment.path] || "Evidence-led positioning"}</div>
      <div style={{ color: C.text, fontSize: 13, fontWeight: 650, marginBottom: 3 }}>Recommended positioning: {safePositioningText(assessment.recommended_level, "Professional positioning based on verified experience")}</div>
      <div style={{ color: C.textSub, fontSize: 13, lineHeight: 1.5 }}>{safePositioningText(assessment.note, "Your verified experience is positioned honestly for this opportunity.")}</div>
    </div>
  );
}
