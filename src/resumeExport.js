export const PRELIMINARY_EXPORT_NOTICE = "PRELIMINARY DRAFT - Verify the complete posting and every resume detail before applying.";

const INVALID_EXACT_TEXT = /^(?:\[object Object\]|undefined|null|<\s*unknown\s*>)$/i;
const PLACEHOLDER_IDENTITY = /^(?:<\s*)?(?:unknown|unnamed|name unavailable|candidate|n\/?a|null|undefined)(?:\s*>)?$/i;

function primitiveText(value) {
  if (value == null || typeof value === "boolean") return "";
  if (!["string", "number", "bigint"].includes(typeof value)) return "";
  const result = String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
  return INVALID_EXACT_TEXT.test(result) ? "" : result;
}

/**
 * Serializes only explicitly approved keys. Objects are never string-coerced,
 * and cycles or unrelated metadata are ignored.
 */
export function serializeExportText(value, {
  keys = ["text", "value", "name"],
  separator = " · ",
  seen = new Set(),
} = {}) {
  const direct = primitiveText(value);
  if (direct || value == null || typeof value !== "object") return direct;
  if (seen.has(value)) return "";
  seen.add(value);

  let result = "";
  if (Array.isArray(value)) {
    result = value
      .map((item) => serializeExportText(item, { keys, separator, seen }))
      .filter(Boolean)
      .join(separator);
  } else if (Object.prototype.hasOwnProperty.call(value, "text")) {
    result = serializeExportText(value.text, { keys, separator, seen });
  } else {
    result = keys
      .filter((key) => key !== "text" && Object.prototype.hasOwnProperty.call(value, key))
      .map((key) => serializeExportText(value[key], { keys, separator, seen }))
      .filter(Boolean)
      .join(separator);
  }

  seen.delete(value);
  return result;
}

function field(value, keys, separator = " · ") {
  return serializeExportText(value, { keys: ["text", ...keys], separator });
}

function identity(value) {
  const direct = field(value, ["full_name", "fullName", "name"]);
  if (direct) return direct;
  return field(value, ["first_name", "firstName", "middle_name", "middleName", "last_name", "lastName"], " ");
}

function textList(value, keys, separator = " · ") {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return values.map((item) => field(item, keys, separator)).filter(Boolean);
}

function structuredList(value, mapper) {
  const values = Array.isArray(value) ? value : value == null ? [] : [value];
  return values.map(mapper).filter(Boolean);
}

function normalizeExperience(entry) {
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
  const normalized = {
    role: field(entry.role ?? entry.title ?? entry.position ?? entry.job_title ?? entry.jobTitle, ["role", "title", "position", "job_title", "jobTitle"]),
    company: field(entry.company ?? entry.employer ?? entry.organization, ["company", "employer", "organization", "name"]),
    dates: field(entry.dates ?? entry.period ?? entry.date, ["dates", "period", "date", "start", "end"], " - "),
    bullets: textList(entry.bullets ?? entry.achievements ?? entry.highlights ?? entry.responsibilities, ["value", "bullet", "description", "content", "statement"]),
  };
  return normalized.role || normalized.company || normalized.dates || normalized.bullets.length ? normalized : null;
}

function normalizeProject(project) {
  if (!project || typeof project !== "object" || Array.isArray(project)) return null;
  const normalized = {
    name: field(project.name ?? project.title, ["name", "title", "value"]),
    description: field(project.description ?? project.summary, ["description", "summary", "content", "value"]),
    bullets: textList(project.bullets ?? project.highlights ?? project.achievements, ["value", "bullet", "description", "content", "statement"]),
  };
  return normalized.name || normalized.description || normalized.bullets.length ? normalized : null;
}

function normalizeTraining(training) {
  if (!training || typeof training !== "object" || Array.isArray(training)) return null;
  const normalized = {
    name: field(training.name ?? training.title ?? training.credential, ["name", "title", "credential", "value"]),
    provider: field(training.provider ?? training.issuer ?? training.institution, ["provider", "issuer", "institution", "organization", "name"]),
    dates: field(training.dates ?? training.date ?? training.year, ["dates", "date", "year", "start", "end"], " - "),
  };
  return normalized.name || normalized.provider || normalized.dates ? normalized : null;
}

function normalizeEducation(education) {
  if (!education || typeof education !== "object" || Array.isArray(education)) return null;
  const normalized = {
    degree: field(education.degree ?? education.program ?? education.qualification, ["degree", "program", "qualification", "name", "value"]),
    institution: field(education.institution ?? education.school ?? education.provider, ["institution", "school", "provider", "organization", "name"]),
    dates: field(education.dates ?? education.date ?? education.year, ["dates", "date", "year", "start", "end"], " - "),
  };
  return normalized.degree || normalized.institution || normalized.dates ? normalized : null;
}

export function normalizeResumeForExport(resumeData = {}) {
  const source = resumeData && typeof resumeData === "object" && !Array.isArray(resumeData) ? resumeData : {};
  return {
    name: identity(source.name ?? source.full_name ?? source.fullName),
    title: field(source.title ?? source.headline, ["title", "headline", "role", "position", "value", "name"]),
    contact: field(source.contact, ["email", "phone", "location", "address", "city", "region", "province", "state", "country", "website", "linkedin", "url"], " | "),
    profile: field(source.profile ?? source.summary, ["profile", "summary", "description", "content", "value"]),
    skills: textList(source.skills, ["value", "name", "skill", "label"]),
    experience: structuredList(source.experience, normalizeExperience),
    projects: structuredList(source.projects, normalizeProject),
    training: structuredList(source.training, normalizeTraining),
    certifications: structuredList(source.certifications, normalizeTraining),
    safety_record: field(source.safety_record, ["safety_record", "description", "content", "value"]),
    safety_certifications: textList(source.safety_certifications, ["value", "name", "title", "credential"]),
    education: structuredList(source.education, normalizeEducation),
    languages: textList(source.languages, ["value", "name", "language", "proficiency"]),
  };
}

export function assertResumeExportIdentity(resumeData) {
  const name = normalizeResumeForExport(resumeData).name;
  if (!name || PLACEHOLDER_IDENTITY.test(name)) {
    throw new Error("Candidate name is required before export.");
  }
  return name;
}

export function safeResumeFilename(resumeData, extension, { preliminary = false } = {}) {
  const normalized = normalizeResumeForExport(resumeData);
  const base = [normalized.name || "candidate", normalized.title || "tailored-resume", preliminary ? "preliminary" : ""]
    .filter(Boolean)
    .join("-")
    .normalize("NFKD")
    .replace(/[^a-z0-9 -]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 100) || "tailored-resume";
  return `${base}.${String(extension || "").replace(/^\./, "")}`;
}
