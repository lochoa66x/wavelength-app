export function restoreCitedResumeBullets(resume, review) {
  const replacements = new Map();
  for (const issue of review?.provenance_issues || []) {
    if (issue.restorable_original !== true || typeof issue.original !== "string" || !issue.original.trim()) continue;
    const { experience_index: entry, bullet_index: bullet } = issue;
    if (!Number.isInteger(entry) || !Number.isInteger(bullet) || typeof resume?.experience?.[entry]?.bullets?.[bullet] !== "string") continue;
    const key = `${entry}:${bullet}`;
    // Ambiguous originals require another source review, never a guess.
    if (replacements.has(key) && replacements.get(key) !== issue.original) replacements.set(key, null);
    else if (!replacements.has(key)) replacements.set(key, issue.original);
  }
  let restored = 0;
  const experience = (resume?.experience || []).map((entry, entryIndex) => ({ ...entry, bullets: (entry.bullets || []).map((bullet, bulletIndex) => {
    const original = replacements.get(`${entryIndex}:${bulletIndex}`);
    if (!original || original === bullet) return bullet;
    restored += 1;
    return original;
  }) }));
  return { resume: restored ? { ...resume, experience } : resume, restored };
}

export function resumeIssueCounts(review) {
  const fields = ["unsupported_metrics", "unsupported_history", "missing_history", "missing_qualifications", "unsupported_skills", "unsupported_projects", "unsupported_training", "unsupported_target_terms", "unsupported_positioning", "risky_claims", "provenance_issues"];
  return Object.fromEntries(fields.map((field) => [field, Array.isArray(review?.[field]) ? review[field].length : 0]).concat([
    ["requirement_consistency", review?.requirement_consistency?.status === "blocked" ? 1 : 0],
    ["writing", review?.writing?.status === "blocked" ? 1 : 0],
  ]));
}
