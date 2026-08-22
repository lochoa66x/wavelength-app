function normalized(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9%+$]+/g, " ")
    .trim();
}

function compactNumeric(value) {
  return String(value || "").replace(/\s+/g, "").toLowerCase();
}

function includesAny(value, claims, formatter = normalized) {
  const text = formatter(value);
  return claims.some((claim) => {
    const needle = formatter(claim);
    return needle && text.includes(needle);
  });
}

function removeUnsafeSentences(value, numericClaims, riskyClaims) {
  const text = String(value || "").trim();
  if (!text) return "";
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  return sentences.filter((sentence) => (
    !includesAny(sentence, numericClaims, compactNumeric)
      && !includesAny(sentence, riskyClaims)
  )).join(" ").trim();
}

function cleanList(values, numericClaims, riskyClaims) {
  return (Array.isArray(values) ? values : [])
    .map((value) => removeUnsafeSentences(value, numericClaims, riskyClaims))
    .filter(Boolean);
}

function fallbackProfile(resume, analysis) {
  const role = String(resume?.experience?.[0]?.role || "Experienced professional").trim();
  const skills = (analysis?.verified_transferable_skills || [])
    .map((item) => String(item?.skill || "").trim())
    .filter(Boolean)
    .slice(0, 3);
  const foundation = skills.length ? ` with experience in ${skills.join(", ")}` : "";
  const transition = analysis?.fit_assessment?.path === "career_change"
    ? " Pursuing a career transition through verified transferable experience."
    : " Focused on relevant, evidence-backed experience for this opportunity.";
  return `${role}${foundation}.${transition}`;
}

export function createSafeResumeFallback(resumeData, atsReview, analysis) {
  const numericClaims = (atsReview?.unsupported_metrics || []).map((issue) => issue.claim);
  const riskyClaims = (atsReview?.risky_claims || []).map((issue) => issue.claim);
  const unsupportedExperience = new Set((atsReview?.unsupported_history || []).map((issue) => issue.experienceIndex));
  const unsupportedSkills = new Set((atsReview?.unsupported_skills || []).map((issue) => normalized(issue.skill)));
  const unsupportedProjects = new Set((atsReview?.unsupported_projects || []).map((issue) => normalized(issue.name)));
  const unsupportedTraining = new Set((atsReview?.unsupported_training || []).map((issue) => normalized(issue.name)));
  const unsupportedTargetTerms = (atsReview?.unsupported_target_terms || []).map((issue) => issue.term);

  const experience = (resumeData?.experience || []).flatMap((entry, index) => {
    if (unsupportedExperience.has(index)) return [];
    return [{ ...entry, bullets: cleanList(entry?.bullets, numericClaims, riskyClaims) }];
  });

  const skills = (resumeData?.skills || []).filter((skill) => (
    !unsupportedSkills.has(normalized(skill))
      && !includesAny(skill, unsupportedTargetTerms)
      && !includesAny(skill, numericClaims, compactNumeric)
  ));

  const projects = (resumeData?.projects || []).flatMap((project) => {
    if (unsupportedProjects.has(normalized(project?.name))) return [];
    const text = JSON.stringify(project || {});
    if (includesAny(text, numericClaims, compactNumeric) || includesAny(text, riskyClaims)) return [];
    return [project];
  });

  const training = (resumeData?.training || []).flatMap((item) => {
    if (unsupportedTraining.has(normalized(item?.name))) return [];
    const text = JSON.stringify(item || {});
    if (includesAny(text, numericClaims, compactNumeric) || includesAny(text, riskyClaims)) return [];
    return [item];
  });

  let title = removeUnsafeSentences(resumeData?.title, numericClaims, riskyClaims);
  if ((atsReview?.unsupported_positioning || []).length || includesAny(title, unsupportedTargetTerms) || !title) {
    const baseRole = String(experience[0]?.role || "Experienced Professional").trim();
    title = analysis?.fit_assessment?.path === "career_change"
      ? `${baseRole} | Career Transition`
      : baseRole;
  }

  let profile = removeUnsafeSentences(resumeData?.profile, numericClaims, riskyClaims);
  if (!profile) profile = fallbackProfile({ ...resumeData, experience }, analysis);

  return {
    resume: {
      ...resumeData,
      title,
      profile,
      skills,
      experience,
      projects,
      training,
      education: cleanList(resumeData?.education, numericClaims, riskyClaims),
      languages: cleanList(resumeData?.languages, numericClaims, riskyClaims),
      certifications: cleanList(resumeData?.certifications, numericClaims, riskyClaims),
      safety_certifications: cleanList(resumeData?.safety_certifications, numericClaims, riskyClaims),
    },
    report: {
      omitted_experience_count: unsupportedExperience.size,
      omitted_skill_count: (resumeData?.skills || []).length - skills.length,
      omitted_project_count: (resumeData?.projects || []).length - projects.length,
      omitted_training_count: (resumeData?.training || []).length - training.length,
      removed_numeric_claim_count: numericClaims.length,
    },
  };
}
