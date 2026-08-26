function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export function tailoringChangeCurrentText(resumeData, change) {
  if (change?.section !== "experience") return "";
  return clean(resumeData?.experience?.[change.experience_index]?.bullets?.[change.bullet_index]);
}

export function applyTailoringChangeDecision(resumeData, change, decision) {
  if (!resumeData || change?.section !== "experience") return resumeData;
  const replacement = decision === "original" ? clean(change.original) : clean(change.proposed);
  if (!replacement) return resumeData;
  const experienceIndex = Number(change.experience_index);
  const bulletIndex = Number(change.bullet_index);
  const experience = Array.isArray(resumeData.experience) ? resumeData.experience : [];
  const entry = experience[experienceIndex];
  if (!entry || !Array.isArray(entry.bullets) || bulletIndex < 0 || bulletIndex >= entry.bullets.length) return resumeData;

  const nextBullets = [...entry.bullets];
  nextBullets[bulletIndex] = replacement;
  const nextExperience = [...experience];
  nextExperience[experienceIndex] = { ...entry, bullets: nextBullets };
  return { ...resumeData, experience: nextExperience };
}

export function hasTailoringChangeAdjustments(resumeData, changes = []) {
  return changes.some((change) => (
    change?.change_type !== "retained"
      && tailoringChangeCurrentText(resumeData, change) !== clean(change.proposed)
  ));
}

export function reviewAfterTailoringChange(baselineReview, resumeData) {
  const changes = baselineReview?.tailoring_changes || [];
  if (!hasTailoringChangeAdjustments(resumeData, changes)) return baselineReview;
  const blockers = new Set([
    ...(baselineReview?.export_readiness?.blockers || []),
    "tailoring_change_review",
  ]);
  return {
    ...baselineReview,
    application_ready: false,
    output_mode: "preliminary",
    export_readiness: {
      ...(baselineReview?.export_readiness || {}),
      status: "preliminary",
      application_ready: false,
      blockers: [...blockers],
    },
  };
}
