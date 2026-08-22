const PATH_LABELS = {
  direct: "Direct-match strategy",
  adjacent: "Adjacent-pivot strategy",
  career_change: "Career-change strategy",
};

export function PositioningSummary({ assessment, C }) {
  if (!assessment) return null;
  const careerChange = assessment.path === "career_change";
  return (
    <div style={{ background: careerChange ? C.amberTint : C.blueTint, border: `1px solid ${careerChange ? C.amberBorder : C.blueBorder}`, borderRadius: 12, padding: "12px 14px", marginBottom: 14 }}>
      <div style={{ color: careerChange ? C.amber : C.blue, fontSize: 12.5, fontWeight: 750, marginBottom: 3 }}>{PATH_LABELS[assessment.path] || "Evidence-led positioning"}</div>
      <div style={{ color: C.text, fontSize: 13, fontWeight: 650, marginBottom: 3 }}>Recommended positioning: {assessment.recommended_level}</div>
      <div style={{ color: C.textSub, fontSize: 13, lineHeight: 1.5 }}>{assessment.note}</div>
    </div>
  );
}
