export const RESUME_SCHEMA_VERSION = 2;

export const TEMPLATE_IDS = Object.freeze({
  ATS_CORE: "ats-core-v1",
  SAP_FUNCTIONAL: "sap-functional-v1",
  PROJECT_LEADERSHIP: "project-leadership-v1",
  CAREER_TRANSITION: "career-transition-v1",
  TECHNICAL_SOFTWARE: "technical-software-v1",
  ADMIN_CUSTOMER_OPERATIONS: "admin-customer-operations-v1",
  SKILLED_TRADES_FIELD_SERVICES: "skilled-trades-field-services-v1",
  MARKETING_COMMUNICATIONS: "marketing-communications-v1",
  CREATIVE_DESIGN: "creative-design-v1",
});

const LEGACY_TRADES_TEMPLATE_ID = "trades-legacy-v1";

const INVALID_EXACT_TEXT = /^(?:\[object Object\]|undefined|null|<\s*unknown\s*>)$/i;
const PLACEHOLDER_IDENTITY = /^(?:<\s*)?(?:unknown|unnamed|name unavailable|candidate|n\/?a|null|undefined)(?:\s*>)?$/i;
const ALLOWED_RELEVANCE = new Set(["direct", "adjacent", "transferable", "background"]);
const ALLOWED_STRATEGIES = new Set(["direct", "adjacent", "transferable", "major-transition"]);
const SAFE_URL_PROTOCOLS = new Set(["https:", "http:"]);

const TEMPLATE_ALIASES = Object.freeze({
  professional: TEMPLATE_IDS.ATS_CORE,
  "ats-core": TEMPLATE_IDS.ATS_CORE,
  "sap-functional": TEMPLATE_IDS.SAP_FUNCTIONAL,
  "project-leadership": TEMPLATE_IDS.PROJECT_LEADERSHIP,
  "career-change": TEMPLATE_IDS.CAREER_TRANSITION,
  "career-transition": TEMPLATE_IDS.CAREER_TRANSITION,
  "technical-software": TEMPLATE_IDS.TECHNICAL_SOFTWARE,
  software: TEMPLATE_IDS.TECHNICAL_SOFTWARE,
  "admin-customer-operations": TEMPLATE_IDS.ADMIN_CUSTOMER_OPERATIONS,
  "admin-operations": TEMPLATE_IDS.ADMIN_CUSTOMER_OPERATIONS,
  trades: TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES,
  "skilled-trades": TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES,
  "skilled-trades-field-services": TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES,
  [LEGACY_TRADES_TEMPLATE_ID]: TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES,
  "marketing-communications": TEMPLATE_IDS.MARKETING_COMMUNICATIONS,
  marketing: TEMPLATE_IDS.MARKETING_COMMUNICATIONS,
  "creative-design": TEMPLATE_IDS.CREATIVE_DESIGN,
  creative: TEMPLATE_IDS.CREATIVE_DESIGN,
});

const BASE_SECTIONS = Object.freeze([
  "summary",
  "skills",
  "experience",
  "projects",
  "training",
  "certifications",
  "safety",
  "education",
  "languages",
]);

const BASE_VISUAL_TOKENS = Object.freeze({
  pageWidthIn: 8.5,
  pageHeightIn: 11,
  marginTopIn: 0.65,
  marginRightIn: 0.68,
  marginBottomIn: 0.65,
  marginLeftIn: 0.68,
  fontFamily: "Arial, Helvetica, sans-serif",
  bodyFontSizePt: 10,
  bodyLineHeight: 1.35,
  nameFontSizePt: 18,
  headlineFontSizePt: 11,
  sectionFontSizePt: 10.5,
  ink: "#17191c",
  muted: "#515861",
  rule: "#c9cdd1",
  paper: "#ffffff",
});

function templateDefinition({
  id,
  displayName,
  description,
  intendedUse,
  accent,
  sectionOrder,
  visualTokens = {},
  visible = true,
  contentStrategy = "Evidence-first single-column presentation of canonical resume facts.",
  recommendationMetadata = {},
}) {
  return Object.freeze({
    id,
    version: 1,
    displayName,
    description,
    intendedUse,
    atsSafetyLevel: "high",
    supportedSections: BASE_SECTIONS,
    pageTarget: 2,
    visible,
    visualTokens: Object.freeze({ ...BASE_VISUAL_TOKENS, accent, ...visualTokens }),
    sectionOrder: Object.freeze(sectionOrder),
    previewMetadata: Object.freeze({ columnCount: 1, hasSidebar: false, usesGraphics: false }),
    compatibilityNotes: "Single-column semantic text; no skill bars, icons, graphics, or layout tables.",
    contentStrategy,
    recommendationMetadata: Object.freeze({ evidenceRequired: true, categoryAloneAllowed: false, ...recommendationMetadata }),
  });
}

export const RESUME_TEMPLATE_REGISTRY = Object.freeze({
  [TEMPLATE_IDS.ATS_CORE]: templateDefinition({
    id: TEMPLATE_IDS.ATS_CORE,
    displayName: "ATS Core",
    description: "Conservative general-professional layout with maximum parser compatibility.",
    intendedUse: "General office, professional, and technical roles",
    accent: "#1d5f7a",
    sectionOrder: ["summary", "skills", "experience", "projects", "education", "certifications", "training", "languages", "safety"],
  }),
  [TEMPLATE_IDS.SAP_FUNCTIONAL]: templateDefinition({
    id: TEMPLATE_IDS.SAP_FUNCTIONAL,
    displayName: "SAP Functional",
    description: "Enterprise-consulting structure for verified functional SAP delivery evidence.",
    intendedUse: "SAP functional, ERP implementation, integration, testing, and transformation",
    accent: "#15586c",
    sectionOrder: ["summary", "skills", "experience", "projects", "certifications", "training", "education", "languages", "safety"],
  }),
  [TEMPLATE_IDS.PROJECT_LEADERSHIP]: templateDefinition({
    id: TEMPLATE_IDS.PROJECT_LEADERSHIP,
    displayName: "Project Leadership",
    description: "Leadership-forward structure that preserves the candidate's verified ownership level.",
    intendedUse: "Project, program, transformation, operations, and delivery leadership",
    accent: "#3f5268",
    sectionOrder: ["summary", "skills", "experience", "projects", "certifications", "education", "training", "languages", "safety"],
  }),
  [TEMPLATE_IDS.CAREER_TRANSITION]: templateDefinition({
    id: TEMPLATE_IDS.CAREER_TRANSITION,
    displayName: "Career Transition",
    description: "Evidence-first presentation for adjacent pivots and material career changes.",
    intendedUse: "Candidates relying on verified transferable evidence",
    accent: "#6b513d",
    sectionOrder: ["summary", "skills", "projects", "training", "experience", "certifications", "education", "languages", "safety"],
  }),
  [TEMPLATE_IDS.TECHNICAL_SOFTWARE]: templateDefinition({
    id: TEMPLATE_IDS.TECHNICAL_SOFTWARE,
    displayName: "Technical / Software",
    description: "Compact engineering structure for verified software, data, cloud, infrastructure, security, and technical-delivery evidence.",
    intendedUse: "Software, data, cloud, DevOps, SRE, cybersecurity, technical QA, and infrastructure roles",
    accent: "#245f87",
    visualTokens: {
      marginTopIn: 0.6,
      marginBottomIn: 0.6,
      bodyFontSizePt: 9.8,
      bodyLineHeight: 1.3,
      nameFontSizePt: 17.5,
      sectionFontSizePt: 10.2,
    },
    sectionOrder: ["summary", "skills", "projects", "experience", "certifications", "training", "education", "languages", "safety"],
  }),
  [TEMPLATE_IDS.ADMIN_CUSTOMER_OPERATIONS]: templateDefinition({
    id: TEMPLATE_IDS.ADMIN_CUSTOMER_OPERATIONS,
    displayName: "Admin / Customer Operations",
    description: "Service-oriented operations structure that preserves verified coordination and responsibility levels.",
    intendedUse: "Administration, customer support, customer success, scheduling, dispatch, and service operations",
    accent: "#3f6a5a",
    visualTokens: {
      bodyLineHeight: 1.38,
      sectionFontSizePt: 10.3,
    },
    sectionOrder: ["summary", "skills", "experience", "certifications", "training", "education", "projects", "languages", "safety"],
  }),
  [TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES]: templateDefinition({
    id: TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES,
    displayName: "Skilled Trades / Field Services",
    description: "Credential-aware practical structure for verified trade, maintenance, installation, repair, and customer-site service evidence.",
    intendedUse: "Skilled trades, apprentices, field service, facilities maintenance, construction support, landscaping, and practical repair roles",
    accent: "#4f653c",
    visualTokens: {
      marginTopIn: 0.6,
      marginBottomIn: 0.6,
      bodyFontSizePt: 9.8,
      bodyLineHeight: 1.32,
      nameFontSizePt: 17.5,
      sectionFontSizePt: 10.2,
    },
    sectionOrder: ["summary", "certifications", "safety", "skills", "experience", "projects", "training", "education", "languages"],
  }),
  [TEMPLATE_IDS.MARKETING_COMMUNICATIONS]: templateDefinition({
    id: TEMPLATE_IDS.MARKETING_COMMUNICATIONS,
    displayName: "Marketing & Communications",
    description: "Editorial business structure for verified campaign, content, channel, brand, communications, and marketing-operations evidence.",
    intendedUse: "Marketing, communications, public relations, content, campaign, brand, social, email, lifecycle, and evidence-supported marketing operations",
    accent: "#7a4e2d",
    visualTokens: {
      bodyFontSizePt: 9.9,
      bodyLineHeight: 1.34,
      nameFontSizePt: 18,
      sectionFontSizePt: 10.4,
    },
    contentStrategy: "Prioritize verified marketing or communications capabilities, experience, and supported campaigns without importing posting metrics or platforms.",
    recommendationMetadata: { occupationFamily: "marketing-communications", adjacentFitAllowed: true },
    sectionOrder: ["summary", "skills", "experience", "projects", "certifications", "education", "training", "languages", "safety"],
  }),
  [TEMPLATE_IDS.CREATIVE_DESIGN]: templateDefinition({
    id: TEMPLATE_IDS.CREATIVE_DESIGN,
    displayName: "Creative & Design",
    description: "Restrained creative structure for verified visual, production, brand, presentation, portfolio, project, and design-tool evidence.",
    intendedUse: "Graphic, visual, brand, production, digital, presentation, illustration, motion, UI, UX, content, and evidence-supported creative leadership",
    accent: "#5a4a86",
    visualTokens: {
      marginTopIn: 0.62,
      marginBottomIn: 0.62,
      bodyFontSizePt: 9.9,
      bodyLineHeight: 1.36,
      nameFontSizePt: 18.5,
      sectionFontSizePt: 10.6,
    },
    contentStrategy: "Prioritize verified creative capabilities, experience, projects, tools, and an explicitly identified safe portfolio link while keeping essential facts selectable and ATS-readable.",
    recommendationMetadata: { occupationFamily: "creative-design", adjacentFitAllowed: true },
    sectionOrder: ["summary", "skills", "experience", "projects", "education", "certifications", "training", "languages", "safety"],
  }),
});

export function availableResumeTemplates() {
  return Object.values(RESUME_TEMPLATE_REGISTRY).filter((template) => template.visible);
}

export function resolveTemplateId(value, fallback = TEMPLATE_IDS.ATS_CORE) {
  const requested = cleanScalar(value).toLowerCase();
  const resolved = TEMPLATE_ALIASES[requested] || requested;
  return RESUME_TEMPLATE_REGISTRY[resolved] ? resolved : fallback;
}

export function cleanScalar(value, maxLength = 12_000) {
  if (value == null || typeof value === "boolean") return "";
  if (!["string", "number", "bigint"].includes(typeof value)) return "";
  const result = String(value)
    .normalize("NFC")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
  return INVALID_EXACT_TEXT.test(result) ? "" : result;
}

export function serializeApprovedValue(value, {
  keys = ["text", "value", "name"],
  separator = " · ",
  seen = new Set(),
} = {}) {
  const direct = cleanScalar(value);
  if (direct || value == null || typeof value !== "object") return direct;
  if (seen.has(value)) return "";
  seen.add(value);

  let result = "";
  if (Array.isArray(value)) {
    result = value
      .map((item) => serializeApprovedValue(item, { keys, separator, seen }))
      .filter(Boolean)
      .join(separator);
  } else {
    result = keys
      .filter((key) => Object.prototype.hasOwnProperty.call(value, key))
      .map((key) => serializeApprovedValue(value[key], { keys, separator, seen }))
      .filter(Boolean)
      .join(separator);
  }

  seen.delete(value);
  return result;
}

function warning(warnings, path, code, message) {
  warnings.push({ path, code, message });
}

function fieldText(value, keys, path, warnings, separator = " · ", maxLength = 12_000) {
  const direct = cleanScalar(value, maxLength);
  if (direct || value == null || typeof value !== "object") return direct;
  const serialized = serializeApprovedValue(value, { keys: [...new Set(["text", ...keys])], separator });
  if (!serialized) warning(warnings, path, "unsupported_structured_value", "Unsupported structured value was omitted instead of being string-coerced.");
  return cleanScalar(serialized, maxLength);
}

function valueList(value) {
  return Array.isArray(value) ? value : value == null ? [] : [value];
}

function hashText(value) {
  const text = typeof value === "string" ? value : stableStringify(value);
  let hash = 0x811c9dc5;
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(36);
}

export function stableHash(value, prefix = "hash") {
  return `${prefix}-${hashText(value)}`;
}

export function stableStringify(value) {
  const seen = new Set();
  const visit = (entry) => {
    if (entry == null || typeof entry !== "object") return entry;
    if (seen.has(entry)) return "[Circular]";
    seen.add(entry);
    const result = Array.isArray(entry)
      ? entry.map(visit)
      : Object.fromEntries(Object.keys(entry).sort().map((key) => [key, visit(entry[key])]));
    seen.delete(entry);
    return result;
  };
  return JSON.stringify(visit(value));
}

function stableId(prefix, supplied, path, seed) {
  const approved = cleanScalar(supplied, 180).replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "");
  return approved || `${prefix}-${hashText(`${path}|${seed}`)}`;
}

function safeUrl(value, path, warnings) {
  const url = cleanScalar(value, 2_000);
  if (!url) return "";
  try {
    const parsed = new URL(url);
    if (!SAFE_URL_PROTOCOLS.has(parsed.protocol)) throw new Error("unsupported protocol");
    return parsed.toString();
  } catch {
    warning(warnings, path, "invalid_url", "An invalid or unsafe professional link was omitted.");
    return "";
  }
}

function identityText(source, warnings) {
  const direct = fieldText(source.name ?? source.full_name ?? source.fullName, ["full_name", "fullName", "name"], "candidate.fullName", warnings, " ", 240);
  if (direct) return direct;
  const structuredName = source.name && typeof source.name === "object" && !Array.isArray(source.name) ? source.name : {};
  return [
    structuredName.first_name ?? structuredName.firstName ?? source.first_name ?? source.firstName,
    structuredName.middle_name ?? structuredName.middleName ?? source.middle_name ?? source.middleName,
    structuredName.last_name ?? structuredName.lastName ?? source.last_name ?? source.lastName,
  ]
    .map((value, index) => fieldText(value, ["name", "value"], `candidate.namePart.${index}`, warnings, " ", 100))
    .filter(Boolean)
    .join(" ");
}

function normalizeContact(source, warnings) {
  const contactSource = source.candidate && typeof source.candidate === "object" ? source.candidate : {};
  const contactLine = fieldText(source.contact ?? contactSource.contactLine, [
    "email", "phone", "location", "address", "city", "region", "province", "state", "country", "website", "linkedin", "url",
  ], "candidate.contactLine", warnings, " | ", 1_000);
  const parts = contactLine.split(/\s*(?:\||·)\s*/).filter(Boolean);
  const email = fieldText(contactSource.email ?? source.email, ["email", "value"], "candidate.email", warnings, " ", 320)
    || parts.find((part) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(part)) || "";
  const phone = fieldText(contactSource.phone ?? source.phone, ["phone", "value"], "candidate.phone", warnings, " ", 100)
    || parts.find((part) => /\d/.test(part) && part.replace(/\D/g, "").length >= 7) || "";
  const location = parts.find((part) => part !== email && part !== phone && !/^https?:\/\//i.test(part)) || "";
  const locationParts = location.split(",").map((part) => part.trim()).filter(Boolean);
  const linksSource = contactSource.professionalLinks ?? source.professional_links ?? source.professionalLinks ?? [];
  const professionalLinks = valueList(linksSource).map((entry, index) => {
    const object = entry && typeof entry === "object" && !Array.isArray(entry) ? entry : { url: entry };
    const url = safeUrl(object.url ?? object.href ?? object.value, `candidate.professionalLinks.${index}.url`, warnings);
    if (!url) return null;
    const label = fieldText(object.label ?? object.name, ["label", "name", "value"], `candidate.professionalLinks.${index}.label`, warnings, " ", 120) || new URL(url).hostname;
    return { id: stableId("link", object.id, `candidate.professionalLinks.${index}`, `${label}|${url}`), label, url };
  }).filter(Boolean);
  return {
    email,
    phone,
    city: fieldText(contactSource.city ?? source.city, ["city", "value"], "candidate.city", warnings, " ", 160) || locationParts[0] || "",
    region: fieldText(contactSource.region ?? contactSource.province ?? contactSource.state ?? source.region, ["region", "province", "state", "value"], "candidate.region", warnings, " ", 160) || locationParts[1] || "",
    country: fieldText(contactSource.country ?? source.country, ["country", "value"], "candidate.country", warnings, " ", 160) || locationParts[2] || "",
    professionalLinks,
    contactLine,
  };
}

function normalizeEvidenceReferences(value, path, warnings) {
  const entries = valueList(value).map((entry, index) => {
    if (typeof entry === "string") {
      const sourcePath = cleanScalar(entry, 500);
      return sourcePath ? { id: stableId("source", "", `${path}.${index}`, sourcePath), sourceType: "resume", sourceId: "", sourcePath, verified: false } : null;
    }
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const sourceType = fieldText(entry.sourceType ?? entry.source_type, ["sourceType", "source_type", "type", "value"], `${path}.${index}.sourceType`, warnings, " ", 80) || "resume";
    const sourceId = fieldText(entry.sourceId ?? entry.source_id, ["sourceId", "source_id", "id", "value"], `${path}.${index}.sourceId`, warnings, " ", 180);
    const sourcePath = fieldText(entry.sourcePath ?? entry.source_path, ["sourcePath", "source_path", "path", "value"], `${path}.${index}.sourcePath`, warnings, " ", 500);
    if (!sourceId && !sourcePath) return null;
    return {
      id: stableId("source", entry.id, `${path}.${index}`, `${sourceType}|${sourceId}|${sourcePath}`),
      sourceType,
      sourceId,
      sourcePath,
      verified: entry.verified === true,
    };
  }).filter(Boolean);
  return entries.length ? entries : [{ id: stableId("source", "", path, path), sourceType: "legacy-tailored-result", sourceId: "", sourcePath: path, verified: false }];
}

function normalizeMetricReferences(value, path, warnings) {
  return valueList(value).map((entry, index) => {
    const object = entry && typeof entry === "object" && !Array.isArray(entry) ? entry : { value: entry };
    const metric = fieldText(object.metric ?? object.value ?? object.text, ["metric", "value", "text"], `${path}.${index}.metric`, warnings, " ", 180);
    if (!metric) return null;
    return { id: stableId("metric", object.id, `${path}.${index}`, metric), metric, sourceReferenceId: cleanScalar(object.sourceReferenceId ?? object.source_reference_id, 180) };
  }).filter(Boolean);
}

function normalizeBullet(value, path, index, warnings, evidenceItems) {
  const object = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const text = fieldText(value, ["value", "bullet", "description", "content", "statement", "text"], `${path}.${index}.text`, warnings, " ", 2_000);
  if (!text) return null;
  const id = stableId("bullet", object.id, `${path}.${index}`, text);
  const relevance = ALLOWED_RELEVANCE.has(object.relevance) ? object.relevance : "background";
  const classification = ALLOWED_RELEVANCE.has(object.classification)
    ? object.classification
    : ALLOWED_RELEVANCE.has(object.evidence_match)
      ? object.evidence_match
      : relevance;
  evidenceItems[id] = {
    sourceReferences: normalizeEvidenceReferences(object.sourceEvidenceReferences ?? object.source_evidence_references ?? object.sourceRefs, `${path}.${index}.sourceReferences`, warnings),
    relevance,
    classification,
    verifiedMetricReferences: normalizeMetricReferences(object.verifiedMetricReferences ?? object.verified_metric_references, `${path}.${index}.metrics`, warnings),
    orderingWeight: Number.isFinite(object.orderingWeight ?? object.ordering_weight) ? Number(object.orderingWeight ?? object.ordering_weight) : 1_000 - index,
    responsibilityLevel: cleanScalar(object.responsibilityLevel ?? object.responsibility_level, 60),
  };
  return { id, text };
}

function normalizeTextItems(value, path, warnings, evidenceItems, keys = ["value", "name", "skill", "label", "text"]) {
  return valueList(value).map((entry, index) => {
    const object = entry && typeof entry === "object" && !Array.isArray(entry) ? entry : {};
    const text = fieldText(entry, keys, `${path}.${index}.text`, warnings, " ", 500);
    if (!text) return null;
    const id = stableId("item", object.id, `${path}.${index}`, text);
    evidenceItems[id] = {
      sourceReferences: normalizeEvidenceReferences(object.sourceEvidenceReferences ?? object.source_evidence_references ?? object.sourceRefs, `${path}.${index}.sourceReferences`, warnings),
      relevance: ALLOWED_RELEVANCE.has(object.relevance) ? object.relevance : "background",
      classification: ALLOWED_RELEVANCE.has(object.classification) ? object.classification : "background",
      verifiedMetricReferences: [],
      orderingWeight: Number.isFinite(object.orderingWeight ?? object.ordering_weight) ? Number(object.orderingWeight ?? object.ordering_weight) : 1_000 - index,
      responsibilityLevel: "",
    };
    return { id, text };
  }).filter(Boolean);
}

function normalizeExperience(value, warnings, evidenceItems) {
  return valueList(value).map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      if (entry != null) warning(warnings, `experience.${index}`, "invalid_experience", "A malformed experience entry was omitted.");
      return null;
    }
    const title = fieldText(entry.title ?? entry.role ?? entry.position ?? entry.job_title ?? entry.jobTitle, ["title", "role", "position", "job_title", "jobTitle", "value"], `experience.${index}.title`, warnings, " ", 300);
    const employer = fieldText(entry.employer ?? entry.company ?? entry.organization, ["employer", "company", "organization", "name", "value"], `experience.${index}.employer`, warnings, " ", 300);
    const dateDisplay = fieldText(entry.dateDisplay ?? entry.dates ?? entry.period ?? entry.date, ["dateDisplay", "dates", "period", "date", "start", "end"], `experience.${index}.dateDisplay`, warnings, " - ", 200);
    const bullets = valueList(entry.bullets ?? entry.achievements ?? entry.highlights ?? entry.responsibilities)
      .map((bullet, bulletIndex) => normalizeBullet(bullet, `experience.${index}.bullets`, bulletIndex, warnings, evidenceItems))
      .filter(Boolean);
    if (!title && !employer && !dateDisplay && !bullets.length) return null;
    return {
      id: stableId("experience", entry.id, `experience.${index}`, `${title}|${employer}|${dateDisplay}`),
      title,
      employer,
      location: fieldText(entry.location, ["location", "city", "region", "country", "value"], `experience.${index}.location`, warnings, ", ", 300),
      startDate: fieldText(entry.startDate ?? entry.start_date, ["startDate", "start_date", "value"], `experience.${index}.startDate`, warnings, " ", 30),
      endDate: fieldText(entry.endDate ?? entry.end_date, ["endDate", "end_date", "value"], `experience.${index}.endDate`, warnings, " ", 30),
      current: entry.current === true || /\b(?:present|current|now)\b/i.test(dateDisplay),
      dateDisplay,
      bullets,
    };
  }).filter(Boolean);
}

function normalizeProjects(value, warnings, evidenceItems) {
  return valueList(value).map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const name = fieldText(entry.name ?? entry.title, ["name", "title", "value"], `projects.${index}.name`, warnings, " ", 300);
    const description = fieldText(entry.description ?? entry.summary, ["description", "summary", "content", "value"], `projects.${index}.description`, warnings, " ", 2_000);
    const bullets = valueList(entry.bullets ?? entry.highlights ?? entry.achievements)
      .map((bullet, bulletIndex) => normalizeBullet(bullet, `projects.${index}.bullets`, bulletIndex, warnings, evidenceItems))
      .filter(Boolean);
    if (!name && !description && !bullets.length) return null;
    return {
      id: stableId("project", entry.id, `projects.${index}`, `${name}|${description}`),
      name,
      organization: fieldText(entry.organization, ["organization", "company", "name", "value"], `projects.${index}.organization`, warnings, " ", 300),
      startDate: fieldText(entry.startDate ?? entry.start_date, ["startDate", "start_date", "value"], `projects.${index}.startDate`, warnings, " ", 30),
      endDate: fieldText(entry.endDate ?? entry.end_date, ["endDate", "end_date", "value"], `projects.${index}.endDate`, warnings, " ", 30),
      description,
      bullets,
    };
  }).filter(Boolean);
}

function normalizeEducation(value, warnings, evidenceItems) {
  return valueList(value).map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const credential = fieldText(entry.credential ?? entry.degree ?? entry.program ?? entry.qualification, ["credential", "degree", "program", "qualification", "name", "value"], `education.${index}.credential`, warnings, " ", 300);
    const institution = fieldText(entry.institution ?? entry.school ?? entry.provider, ["institution", "school", "provider", "organization", "name"], `education.${index}.institution`, warnings, " ", 300);
    const dateDisplay = fieldText(entry.dateDisplay ?? entry.dates ?? entry.date ?? entry.year, ["dateDisplay", "dates", "date", "year", "start", "end"], `education.${index}.dateDisplay`, warnings, " - ", 200);
    const details = normalizeTextItems(entry.details, `education.${index}.details`, warnings, evidenceItems, ["text", "value", "description"]);
    if (!credential && !institution && !dateDisplay && !details.length) return null;
    return {
      id: stableId("education", entry.id, `education.${index}`, `${credential}|${institution}|${dateDisplay}`),
      credential,
      field: fieldText(entry.field, ["field", "value"], `education.${index}.field`, warnings, " ", 240),
      institution,
      location: fieldText(entry.location, ["location", "city", "region", "country", "value"], `education.${index}.location`, warnings, ", ", 300),
      startDate: fieldText(entry.startDate ?? entry.start_date, ["startDate", "start_date", "value"], `education.${index}.startDate`, warnings, " ", 30),
      endDate: fieldText(entry.endDate ?? entry.end_date, ["endDate", "end_date", "value"], `education.${index}.endDate`, warnings, " ", 30),
      dateDisplay,
      details,
    };
  }).filter(Boolean);
}

function normalizeCredentials(value, path, warnings, evidenceItems) {
  return valueList(value).map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const name = fieldText(entry.name ?? entry.title ?? entry.credential, ["name", "title", "credential", "value"], `${path}.${index}.name`, warnings, " ", 300);
    const issuer = fieldText(entry.issuer ?? entry.provider ?? entry.institution, ["issuer", "provider", "institution", "organization", "name"], `${path}.${index}.issuer`, warnings, " ", 300);
    const dateDisplay = fieldText(entry.dateDisplay ?? entry.dates ?? entry.date ?? entry.year, ["dateDisplay", "dates", "date", "year", "start", "end"], `${path}.${index}.dateDisplay`, warnings, " - ", 200);
    if (!name && !issuer && !dateDisplay) return null;
    const id = stableId(path === "training" ? "training" : "certification", entry.id, `${path}.${index}`, `${name}|${issuer}|${dateDisplay}`);
    evidenceItems[id] = {
      sourceReferences: normalizeEvidenceReferences(entry.sourceEvidenceReferences ?? entry.source_evidence_references ?? entry.sourceRefs, `${path}.${index}.sourceReferences`, warnings),
      relevance: ALLOWED_RELEVANCE.has(entry.relevance) ? entry.relevance : "background",
      classification: ALLOWED_RELEVANCE.has(entry.classification) ? entry.classification : "background",
      verifiedMetricReferences: [],
      orderingWeight: 1_000 - index,
      responsibilityLevel: "",
    };
    return {
      id,
      name,
      issuer,
      issueDate: fieldText(entry.issueDate ?? entry.issue_date, ["issueDate", "issue_date", "value"], `${path}.${index}.issueDate`, warnings, " ", 30),
      expirationDate: fieldText(entry.expirationDate ?? entry.expiration_date, ["expirationDate", "expiration_date", "value"], `${path}.${index}.expirationDate`, warnings, " ", 30),
      credentialId: fieldText(entry.credentialId ?? entry.credential_id, ["credentialId", "credential_id", "value"], `${path}.${index}.credentialId`, warnings, " ", 180),
      credentialUrl: safeUrl(entry.credentialUrl ?? entry.credential_url, `${path}.${index}.credentialUrl`, warnings),
      dateDisplay,
    };
  }).filter(Boolean);
}

function normalizeLanguages(value, warnings, evidenceItems) {
  return valueList(value).map((entry, index) => {
    const object = entry && typeof entry === "object" && !Array.isArray(entry) ? entry : {};
    const name = fieldText(entry, ["name", "language", "value", "text"], `languages.${index}.name`, warnings, " ", 180);
    if (!name) return null;
    const proficiency = fieldText(object.proficiency, ["proficiency", "value", "text"], `languages.${index}.proficiency`, warnings, " ", 120);
    const id = stableId("language", object.id, `languages.${index}`, `${name}|${proficiency}`);
    evidenceItems[id] = {
      sourceReferences: normalizeEvidenceReferences(object.sourceEvidenceReferences ?? object.source_evidence_references ?? object.sourceRefs, `languages.${index}.sourceReferences`, warnings),
      relevance: "background",
      classification: "background",
      verifiedMetricReferences: [],
      orderingWeight: 1_000 - index,
      responsibilityLevel: "",
    };
    return { id, name, proficiency };
  }).filter(Boolean);
}

function normalizeAdditionalSections(value, warnings, evidenceItems) {
  return valueList(value).map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const title = fieldText(entry.title, ["title", "name", "value"], `additionalSections.${index}.title`, warnings, " ", 180);
    const items = normalizeTextItems(entry.items, `additionalSections.${index}.items`, warnings, evidenceItems, ["text", "value", "description", "name"]);
    if (!title || !items.length) return null;
    return { id: stableId("additional", entry.id, `additionalSections.${index}`, title), title, items };
  }).filter(Boolean);
}

function normalizeSkills(source, warnings, evidenceItems) {
  const structured = source.skills && typeof source.skills === "object" && !Array.isArray(source.skills) ? source.skills : null;
  if (!structured) {
    return {
      verifiedCore: normalizeTextItems(source.skills, "skills.verifiedCore", warnings, evidenceItems),
      verifiedDomain: [],
      verifiedTools: [],
      transferable: [],
    };
  }
  return {
    verifiedCore: normalizeTextItems(structured.verifiedCore ?? structured.verified_core ?? structured.core, "skills.verifiedCore", warnings, evidenceItems),
    verifiedDomain: normalizeTextItems(structured.verifiedDomain ?? structured.verified_domain ?? structured.domain, "skills.verifiedDomain", warnings, evidenceItems),
    verifiedTools: normalizeTextItems(structured.verifiedTools ?? structured.verified_tools ?? structured.tools, "skills.verifiedTools", warnings, evidenceItems),
    transferable: normalizeTextItems(structured.transferable, "skills.transferable", warnings, evidenceItems),
  };
}

function normalizeCareerStrategy(source) {
  const raw = cleanScalar(source.content_strategy ?? source.fit_assessment?.path ?? source.careerStrategy).toLowerCase().replaceAll("_", "-");
  if (raw === "career-change" || raw === "career-transition") return "major-transition";
  return ALLOWED_STRATEGIES.has(raw) ? raw : "direct";
}

function reviewRequirements(atsReview) {
  return valueList(atsReview?.requirements ?? atsReview?.coverage?.requirements).filter((entry) => entry && typeof entry === "object");
}

function hasVerifiedRequirement(atsReview, pattern) {
  return reviewRequirements(atsReview).some((entry) => {
    const match = cleanScalar(entry.evidence_match ?? entry.classification).toLowerCase();
    const evidence = cleanScalar(entry.resume_evidence ?? entry.evidence);
    return ["direct", "adjacent"].includes(match) && evidence && pattern.test(`${cleanScalar(entry.requirement)} ${evidence}`);
  });
}

function hasVerifiedCandidateEvidence(atsReview, pattern) {
  return reviewRequirements(atsReview).some((entry) => {
    const match = cleanScalar(entry.evidence_match ?? entry.classification).toLowerCase();
    const evidence = cleanScalar(entry.resume_evidence ?? entry.evidence);
    return ["direct", "adjacent"].includes(match) && evidence && pattern.test(evidence);
  });
}

const SAP_PATTERN = /\b(?:sap|s\/4hana|s4hana|hana)\b/i;
const SAP_FUNCTIONAL_PATTERN = /\b(?:functional|fi[- /]?ca|pscd|fico|fi\/co|mdg|mm|sd|configuration|requirements?|uat|functional specifications?|cutover|go-live|process analysis|integration design)\b/i;
const TECHNICAL_TARGET_PATTERN = /\b(?:abap|c\+\+|c#|java(?:script)?|typescript|python|react|node(?:\.js)?|front[- ]?end|back[- ]?end|full[- ]?stack|software|application|mobile|web)\s*(?:developer|development|engineer|engineering)?\b|\b(?:developer|programmer|coding|data engineer|analytics engineer|machine learning|ml engineer|ai engineer|cloud engineer|devops|platform engineer|site reliability|sre|cybersecurity|security engineer|qa automation|test automation|systems engineer|infrastructure engineer)\b/i;
const TECHNICAL_EVIDENCE_PATTERN = /\b(?:c\+\+|c#|java(?:script)?|typescript|python|react|node(?:\.js)?|programming|coded|software development|application development|front[- ]?end|back[- ]?end|full[- ]?stack|data pipeline|etl|machine learning|cloud infrastructure|devops|site reliability|cybersecurity|test automation|qa automation|version control|git|repository|api implementation|database development)\b/i;
const ABAP_DEVELOPMENT_EVIDENCE_PATTERN = /\b(?:abap developer|abap development)\b|\b(?:developed|implemented|programmed|coded)\b.{0,80}\babap\b|\babap\b.{0,80}\b(?:development|developer|coding|programming|implementation)\b/i;
const LEADERSHIP_TARGET_PATTERN = /\b(?:project|program|portfolio|delivery|transformation|operations)\s+(?:manager|management|lead|leader|director)|\b(?:project manager|program manager|delivery manager|transformation lead|operations leader)\b/i;
const LEADERSHIP_EVIDENCE_PATTERN = /\b(?:led|directed|managed|oversaw|governance|program leadership|project leadership|team leadership)\b/i;
const ADMIN_CUSTOMER_TARGET_PATTERN = /\b(?:administrative assistant|executive assistant|office (?:assistant|administrator|coordinator|manager)|operations coordinator|administrative coordinator|customer (?:support|service|success)|client service|service operations|data entry|scheduler|scheduling coordinator|dispatcher|dispatch coordinator|support specialist|support representative|service coordinator|operations assistant)\b/i;
const ADMIN_CUSTOMER_EVIDENCE_PATTERN = /\b(?:administrative support|calendar coordination|calendar management|meeting coordination|scheduling|dispatch|documentation|records management|data entry|customer support|customer service|customer success|client service|issue resolution|service delivery|ticketing|help desk|crm|case management|office coordination|process compliance|cross[- ]functional coordination)\b/i;
const ADMIN_EXCLUDED_TARGET_PATTERN = /\b(?:account executive|sales representative|business development|marketing|communications|copywriter|financial analyst|accountant|bookkeeper|controller|chief|vice president|\bvp\b|director)\b/i;
const MARKETING_TARGET_PATTERN = /\b(?:marketing (?:assistant|associate|coordinator|specialist|analyst|manager|lead|director|operations)|digital marketing|content marketing|product marketing|growth marketing|brand marketing|marketing automation|campaign (?:coordinator|specialist|manager|lead)|communications? (?:assistant|associate|coordinator|specialist|manager|lead|director)|corporate communications?|public relations|\bpr (?:coordinator|specialist|manager|lead|director)|media relations|social[- ]media (?:coordinator|specialist|manager|lead)|email (?:marketing|campaign)|crm marketing|lifecycle marketing)\b/i;
const MARKETING_EXCLUDED_TARGET_PATTERN = /\b(?:communications? engineer|telecommunications?|communication systems?|digital transformation|product manager|product management|growth manager|business growth|sales representative|account executive|business development representative)\b/i;
const MARKETING_TITLE_EVIDENCE_PATTERN = /\b(?:marketing (?:assistant|associate|coordinator|specialist|analyst|manager|lead|director|operations)|digital marketing specialist|content marketing specialist|product marketing manager|brand marketing manager|campaign manager|communications? (?:assistant|associate|coordinator|specialist|manager|lead|director)|public relations (?:coordinator|specialist|manager)|social[- ]media (?:coordinator|specialist|manager)|email marketing specialist|lifecycle marketing|marketing operations)\b/i;
const MARKETING_DIRECT_EVIDENCE_PATTERN = /\b(?:campaign (?:strategy|planning|execution|development|coordination|launch|reporting|analysis)|audience segmentation|customer segmentation|content (?:marketing|strategy|development|calendar|production)|editorial (?:planning|calendar|strategy)|communications? (?:planning|strategy|campaign|program)|public relations|media relations|press releases?|brand (?:marketing|strategy|consistency|governance)|channel (?:strategy|coordination|management)|social[- ]media (?:strategy|management|content|campaign)|email (?:marketing|campaign|automation)|lifecycle marketing|crm marketing|marketing operations|marketing analytics|campaign analytics|search engine optimization|\bseo\b|paid search|\bppc\b|customer marketing|go-to-market communications?)\b/i;
const MARKETING_PLATFORM_EVIDENCE_PATTERN = /\b(?:google analytics|google ads|meta ads|hubspot|salesforce|marketo|mailchimp|hootsuite|adobe analytics|semrush|ahrefs|wordpress|sprout social)\b/i;
const MARKETING_ADJACENT_EVIDENCE_PATTERN = /\b(?:stakeholder communications?|customer communications?|customer engagement|presentations?|research|documentation|event coordination|event planning|content preparation|project coordination|training materials?|facilitat(?:ed|ing) workshops?)\b/i;
const CREATIVE_TARGET_PATTERN = /\b(?:(?:graphic|visual|brand|production|digital|presentation|motion|ui|ux|content|instructional) designer|graphic artist|illustrator|art director|creative director)\b/i;
const CREATIVE_EXCLUDED_TARGET_PATTERN = /\b(?:software designer|solution designer|systems? designer|mechanical designer|architectural designer|database designer|sap solution designer|design engineer|communications? designer)\b/i;
const CREATIVE_TITLE_EVIDENCE_PATTERN = /\b(?:(?:graphic|visual|brand|production|digital|presentation|motion|ui|ux|content) designer|graphic artist|illustrator|art director|creative director)\b/i;
const CREATIVE_DIRECT_EVIDENCE_PATTERN = /\b(?:graphic design|visual design|brand design|production design|digital design|presentation design|motion design|ui design|ux design|content design|brand identity|visual identity|creative direction|art direction|illustration|typography|print production|page layout|wireframing|prototyping|design systems?|motion graphics|adobe photoshop|adobe illustrator|adobe indesign|after effects|premiere pro|figma|sketch|blender|cinema 4d|canva)\b/i;
const CREATIVE_ADJACENT_EVIDENCE_PATTERN = /\b(?:document production|presentation production|presentation materials?|visual content (?:preparation|production|creation)|brand governance support|brand consistency support|layout formatting|creative production support|prepared visual|adapted approved designs?)\b/i;
const CREATIVE_LEADERSHIP_EVIDENCE_PATTERN = /\b(?:art director|creative director|design director|head of design)\b|\b(?:led|directed|supervised)\b.{0,80}\b(?:creative|design|visual|brand|art direction)\b/i;
const TRADE_TARGET_PATTERN = /\b(?:electrician|electrical (?:technician|apprentice|helper)|plumber|plumbing (?:technician|apprentice|helper)|pipefitter|steamfitter|gas fitter|hvac|refrigeration (?:technician|mechanic)|carpenter|carpentry (?:apprentice|helper)|welder|welding (?:apprentice|helper)|millwright|industrial mechanic|automotive (?:technician|mechanic)|auto mechanic|diesel mechanic|heavy[- ]equipment (?:technician|mechanic|operator)|maintenance technician|industrial maintenance|facilities maintenance|property maintenance|handyman|general repair worker|landscap(?:e|er|ing)|grounds maintenance|installer|installation technician|field[- ]service technician|service technician|appliance (?:service )?technician|construction (?:worker|labou?rer|helper)|trade apprentice|journeyperson|journeyman)\b/i;
const TRADE_EXCLUDED_TARGET_PATTERN = /\b(?:sap(?: plant maintenance| pm)?|software|application|it |information technology|help desk|service desk|maintenance planner|maintenance planning|project manager|program manager|operations manager|engineering manager|technical project|asset management system|computerized maintenance management)\b/i;
const REGULATED_TRADE_TARGET_PATTERN = /\b(?:electrician|electrical (?:technician|mechanic)|plumber|plumbing technician|pipefitter|steamfitter|gas fitter|hvac|refrigeration (?:technician|mechanic))\b/i;
const APPRENTICE_TARGET_PATTERN = /\b(?:apprentice|helper|trainee|junior)\b/i;
const GENERAL_FIELD_TARGET_PATTERN = /\b(?:handyman|general repair|property maintenance|facilities maintenance|landscap(?:e|er|ing)|grounds maintenance|construction (?:worker|labou?rer|helper))\b/i;
const TRADE_TITLE_EVIDENCE_PATTERN = /\b(?:electrician|plumber|pipefitter|steamfitter|gas fitter|hvac technician|refrigeration (?:technician|mechanic)|carpenter|welder|millwright|industrial mechanic|automotive (?:technician|mechanic)|auto mechanic|diesel mechanic|heavy[- ]equipment (?:technician|mechanic|operator)|maintenance technician|handyman|landscap(?:e|er|ing)|groundskeeper|installer|field[- ]service technician|appliance (?:service )?technician|construction (?:worker|labou?rer)|trade apprentice|electrical apprentice|plumbing apprentice)\b/i;
const HANDS_ON_ACTION_PATTERN = /\b(?:install(?:ed|ing)?|repair(?:ed|ing)?|diagnos(?:ed|ing)|inspect(?:ed|ing)?|test(?:ed|ing)?|maintain(?:ed|ing)?|assembl(?:ed|ing)|fabricat(?:ed|ing)|operat(?:ed|ing)|servic(?:ed|ing)|replac(?:ed|ing)|troubleshot|calibrat(?:ed|ing)|construct(?:ed|ing)|renovat(?:ed|ing)|landscap(?:ed|ing)|mow(?:ed|ing)|weld(?:ed|ing)|wire(?:d|ing)|plumb(?:ed|ing)|assist(?:ed|ing).{0,50}(?:installation|repair|maintenance|inspection|construction))\b/i;
const PHYSICAL_FIELD_CONTEXT_PATTERN = /\b(?:electrical|wiring|circuit|panel|lighting|fixture|conduit|plumbing|pipe|drain|faucet|boiler|furnace|refrigeration|hvac|motor|pump|compressor|vehicle|engine|brake|equipment|machinery|production line|building|facility|property|drywall|framing|cabinet|door|window|roof|concrete|landscape|grounds|lawn|irrigation|appliance|customer site|service call|work order|preventive maintenance|hand tool|power tool|multimeter|diagnostic equipment|construction site)\b/i;
const ADJACENT_FIELD_EVIDENCE_PATTERN = /\b(?:work orders?|cmms|sap plant maintenance|sap pm|maintenance planning|asset management|warehouse|logistics|customer service|dispatch|scheduling|safety procedures?|inventory|parts coordination|mechanical aptitude|field operations|facilities operations|contractor coordination)\b/i;

const TRADE_CREDENTIAL_GROUPS = Object.freeze([
  { code: "red-seal-journeyperson", label: "Red Seal or journeyperson credential", pattern: /\b(?:red seal|journeyperson|journeyman|certificate of qualification|\bcoq\b)\b/i },
  { code: "electrical-licence", label: "electrical licence", pattern: /\b(?:309a|442a|master electrician|electrical (?:licen[cs]e|certificate of qualification)|licensed electrician)\b/i },
  { code: "plumbing-licence", label: "plumbing licence", pattern: /\b(?:306a|master plumber|plumbing (?:licen[cs]e|certificate of qualification)|licensed plumber)\b/i },
  { code: "gas-fitter-licence", label: "gas fitter licence", pattern: /\b(?:gas fitter|g1 gas|g2 gas|g3 gas|gas technician)\b/i },
  { code: "hvac-refrigeration-credential", label: "HVAC or refrigeration credential", pattern: /\b(?:313a|313d|refrigeration and air conditioning|hvac (?:certification|certificate|licen[cs]e)|refrigeration (?:certification|certificate|licen[cs]e))\b/i },
  { code: "driver-licence", label: "driver's licence", pattern: /\b(?:driver'?s? licen[cs]e|class [a-z0-9]+ licen[cs]e|valid driving licen[cs]e)\b/i },
  { code: "clean-driving-record", label: "clean driving record", pattern: /\b(?:clean driving record|acceptable driver'?s? abstract)\b/i },
  { code: "whmis", label: "WHMIS", pattern: /\bwhmis\b/i },
  { code: "working-at-heights", label: "Working at Heights or fall-protection training", pattern: /\b(?:working at heights|fall protection|fall arrest)\b/i },
  { code: "confined-space", label: "confined-space training", pattern: /\bconfined[- ]space\b/i },
  { code: "lockout-tagout", label: "lockout/tagout training", pattern: /\b(?:lockout[ /-]?tagout|loto)\b/i },
  { code: "first-aid-cpr", label: "First Aid or CPR", pattern: /\b(?:first aid|cpr)\b/i },
  { code: "forklift-heavy-equipment", label: "forklift or heavy-equipment certification", pattern: /\b(?:(?:forklift|heavy[- ]equipment) (?:certification|certificate|ticket|licen[cs]e)|certified (?:forklift|heavy[- ]equipment) operator)\b/i },
  { code: "welding-ticket", label: "welding ticket", pattern: /\b(?:welding ticket|cwb certified|welding certification)\b/i },
  { code: "security-bondability", label: "security clearance or bondability", pattern: /\b(?:security clearance|bondable|bondability)\b/i },
  { code: "manufacturer-certification", label: "manufacturer certification", pattern: /\bmanufacturer (?:certification|certified|training)\b/i },
  { code: "apprenticeship-registration", label: "registered apprenticeship", pattern: /\b(?:registered apprentice|apprenticeship registration|registered apprenticeship)\b/i },
]);

function tradeCredentialEvidence(document, atsReview) {
  const candidateCorpus = stableStringify({
    certifications: document.certifications,
    training: document.training,
    safety: document.safety,
  });
  const verifiedRequirementCorpus = reviewRequirements(atsReview)
    .filter((entry) => ["direct", "adjacent"].includes(cleanScalar(entry.evidence_match ?? entry.classification).toLowerCase()))
    // Posting requirements describe the role, not the candidate. Only the
    // verified candidate-side evidence may satisfy a credential requirement.
    .map((entry) => cleanScalar(entry.resume_evidence ?? entry.evidence))
    .join(" ");
  return `${candidateCorpus} ${verifiedRequirementCorpus}`;
}

function requiredTradeCredentialGroups(targetTitle, atsReview, regulatedTradeTarget) {
  const explicitRequirements = reviewRequirements(atsReview).filter((entry) => {
    const classification = cleanScalar(entry.classification ?? entry.evidence_match).toLowerCase();
    const requirement = cleanScalar(entry.requirement);
    return classification === "credential-required" || /\b(?:required|must|valid|licensed|certified|ticket|registration)\b/i.test(requirement);
  });
  const explicitCorpus = explicitRequirements.map((entry) => cleanScalar(entry.requirement)).join(" ");
  const codes = new Set(TRADE_CREDENTIAL_GROUPS.filter((group) => group.pattern.test(explicitCorpus)).map((group) => group.code));

  if (regulatedTradeTarget) {
    if (/\belectric/i.test(targetTitle)) codes.add("electrical-licence");
    if (/\b(?:plumb|pipefitter|steamfitter)/i.test(targetTitle)) codes.add("plumbing-licence");
    if (/\bgas fitter/i.test(targetTitle)) codes.add("gas-fitter-licence");
    if (/\b(?:hvac|refrigeration)/i.test(targetTitle)) codes.add("hvac-refrigeration-credential");
  }

  return TRADE_CREDENTIAL_GROUPS.filter((group) => codes.has(group.code));
}

export function classifyResumePackageInput(document, source = {}, atsReview = {}, item = {}) {
  const targetTitle = cleanScalar(item?.title ?? source.target?.jobTitle ?? source.target?.job_title ?? document.target.jobTitle, 300);
  const targetCorpus = `${targetTitle} ${cleanScalar(item?.description, 5_000)}`;
  const targetRequirementCorpus = reviewRequirements(atsReview).map((entry) => cleanScalar(entry.requirement, 500)).join(" ");
  const b3TargetCorpus = `${targetCorpus} ${targetRequirementCorpus} ${cleanScalar(stableStringify({
    responsibilities: item?.responsibilities,
    requiredQualifications: item?.requiredQualifications ?? item?.required_qualifications,
    preferredQualifications: item?.preferredQualifications ?? item?.preferred_qualifications,
    highSignalKeywords: item?.highSignalKeywords ?? item?.high_signal_keywords,
  }), 8_000)}`;
  const evidenceCorpus = stableStringify({
    headline: document.headline,
    summary: document.summary,
    skills: document.skills,
    experience: document.experience,
    projects: document.projects,
    training: document.training,
    certifications: document.certifications,
    safety: document.safety,
    professionalLinks: document.candidate.professionalLinks,
  });
  const candidateTitleCorpus = [document.headline, ...document.experience.map((entry) => entry.title)].join(" ");
  const verifiedPortfolioEvidence = document.candidate.professionalLinks.some((link) => /\bportfolio\b/i.test(link.label));
  const postingReadiness = cleanScalar(atsReview?.posting_readiness?.status, 120);
  const explicitlyIncompletePosting = atsReview?.posting_readiness?.fit_allowed === false
    || /(?:needs[_ -]full|incomplete|partial|unverified|blocked|failed)/i.test(postingReadiness);
  const sourceCareerStrategy = normalizeCareerStrategy(source);
  const tradeTarget = TRADE_TARGET_PATTERN.test(targetTitle) && !TRADE_EXCLUDED_TARGET_PATTERN.test(targetTitle);
  const apprenticeTradeTarget = tradeTarget && APPRENTICE_TARGET_PATTERN.test(targetTitle);
  const regulatedTradeTarget = tradeTarget && !apprenticeTradeTarget && REGULATED_TRADE_TARGET_PATTERN.test(targetTitle);
  const tradeTitleEvidence = TRADE_TITLE_EVIDENCE_PATTERN.test(evidenceCorpus);
  const verifiedTradeEvidence = tradeTitleEvidence
    || (HANDS_ON_ACTION_PATTERN.test(evidenceCorpus) && PHYSICAL_FIELD_CONTEXT_PATTERN.test(evidenceCorpus))
    || (hasVerifiedCandidateEvidence(atsReview, HANDS_ON_ACTION_PATTERN) && hasVerifiedCandidateEvidence(atsReview, PHYSICAL_FIELD_CONTEXT_PATTERN));
  const adjacentTradeEvidence = !verifiedTradeEvidence && (
    ADJACENT_FIELD_EVIDENCE_PATTERN.test(evidenceCorpus)
    || hasVerifiedCandidateEvidence(atsReview, ADJACENT_FIELD_EVIDENCE_PATTERN)
  );
  const credentialCorpus = tradeCredentialEvidence(document, atsReview);
  const requiredCredentialGroups = requiredTradeCredentialGroups(targetTitle, atsReview, regulatedTradeTarget);
  const requiredTradeCredentials = requiredCredentialGroups.map((group) => group.label);
  const missingTradeCredentials = requiredCredentialGroups.filter((group) => !group.pattern.test(credentialCorpus)).map((group) => group.label);
  const verifiedTradeCredential = requiredCredentialGroups.length > 0
    ? missingTradeCredentials.length === 0
    : TRADE_CREDENTIAL_GROUPS.some((group) => group.pattern.test(credentialCorpus));
  const tradeCredentialStatus = missingTradeCredentials.length
    ? "required-missing"
    : requiredTradeCredentials.length
      ? "required-verified"
      : verifiedTradeCredential
        ? "verified-not-required"
        : "not-established";
  let tradeProfileType = "not-applicable";
  if (tradeTarget && verifiedTradeEvidence) {
    if (apprenticeTradeTarget || /\b(?:apprentice|helper|trainee)\b/i.test(evidenceCorpus)) tradeProfileType = "apprentice-helper";
    else if (regulatedTradeTarget && verifiedTradeCredential) tradeProfileType = "regulated-trade-professional";
    else if (GENERAL_FIELD_TARGET_PATTERN.test(targetTitle)) tradeProfileType = "general-maintenance";
    else tradeProfileType = "experienced-field-service-professional";
  } else if (tradeTarget && adjacentTradeEvidence) tradeProfileType = "adjacent-pivot";
  else if (tradeTarget) tradeProfileType = "significant-career-change";
  const marketingTarget = MARKETING_TARGET_PATTERN.test(b3TargetCorpus) && !MARKETING_EXCLUDED_TARGET_PATTERN.test(targetTitle);
  const verifiedMarketingEvidence = MARKETING_TITLE_EVIDENCE_PATTERN.test(candidateTitleCorpus)
    || MARKETING_DIRECT_EVIDENCE_PATTERN.test(evidenceCorpus)
    || hasVerifiedCandidateEvidence(atsReview, MARKETING_DIRECT_EVIDENCE_PATTERN)
    || ((MARKETING_PLATFORM_EVIDENCE_PATTERN.test(evidenceCorpus) || hasVerifiedCandidateEvidence(atsReview, MARKETING_PLATFORM_EVIDENCE_PATTERN))
      && (MARKETING_ADJACENT_EVIDENCE_PATTERN.test(evidenceCorpus) || hasVerifiedCandidateEvidence(atsReview, MARKETING_ADJACENT_EVIDENCE_PATTERN)));
  const adjacentMarketingEvidence = !verifiedMarketingEvidence && (
    MARKETING_ADJACENT_EVIDENCE_PATTERN.test(evidenceCorpus)
    || hasVerifiedCandidateEvidence(atsReview, MARKETING_ADJACENT_EVIDENCE_PATTERN)
  );
  const marketingProfileType = !marketingTarget
    ? "not-applicable"
    : verifiedMarketingEvidence
      ? "direct-marketing-communications"
      : adjacentMarketingEvidence
        ? "adjacent-communications"
        : "significant-career-change";
  const creativeTarget = CREATIVE_TARGET_PATTERN.test(b3TargetCorpus) && !CREATIVE_EXCLUDED_TARGET_PATTERN.test(targetTitle);
  const verifiedCreativeEvidence = CREATIVE_TITLE_EVIDENCE_PATTERN.test(candidateTitleCorpus)
    || CREATIVE_DIRECT_EVIDENCE_PATTERN.test(evidenceCorpus)
    || hasVerifiedCandidateEvidence(atsReview, CREATIVE_DIRECT_EVIDENCE_PATTERN)
    || (verifiedPortfolioEvidence && document.projects.length > 0);
  const adjacentCreativeEvidence = !verifiedCreativeEvidence && (
    CREATIVE_ADJACENT_EVIDENCE_PATTERN.test(evidenceCorpus)
    || hasVerifiedCandidateEvidence(atsReview, CREATIVE_ADJACENT_EVIDENCE_PATTERN)
    || verifiedPortfolioEvidence
  );
  const verifiedCreativeLeadershipEvidence = verifiedCreativeEvidence && CREATIVE_LEADERSHIP_EVIDENCE_PATTERN.test(evidenceCorpus);
  const creativeProfileType = !creativeTarget
    ? "not-applicable"
    : verifiedCreativeEvidence
      ? "direct-creative-design"
      : adjacentCreativeEvidence
        ? "adjacent-visual-production"
        : "significant-career-change";
  const sapTarget = SAP_PATTERN.test(targetCorpus);
  const technicalTarget = TECHNICAL_TARGET_PATTERN.test(targetCorpus);
  const sapFunctionalTarget = sapTarget && SAP_FUNCTIONAL_PATTERN.test(targetCorpus) && !technicalTarget;
  const verifiedSapFunctionalEvidence = (SAP_PATTERN.test(evidenceCorpus) && SAP_FUNCTIONAL_PATTERN.test(evidenceCorpus))
    || hasVerifiedRequirement(atsReview, SAP_FUNCTIONAL_PATTERN);
  const verifiedTechnicalEvidence = TECHNICAL_EVIDENCE_PATTERN.test(evidenceCorpus)
    || ABAP_DEVELOPMENT_EVIDENCE_PATTERN.test(evidenceCorpus)
    || hasVerifiedRequirement(atsReview, TECHNICAL_EVIDENCE_PATTERN);
  const leadershipTarget = LEADERSHIP_TARGET_PATTERN.test(targetCorpus);
  const adminCustomerTarget = ADMIN_CUSTOMER_TARGET_PATTERN.test(targetCorpus)
    && !ADMIN_EXCLUDED_TARGET_PATTERN.test(targetCorpus)
    && !leadershipTarget;
  const verifiedAdminCustomerEvidence = ADMIN_CUSTOMER_EVIDENCE_PATTERN.test(evidenceCorpus)
    || hasVerifiedRequirement(atsReview, ADMIN_CUSTOMER_EVIDENCE_PATTERN);
  const reviewIntegritySafe = !["blocked", "failed"].includes(cleanScalar(atsReview?.integrity?.status).toLowerCase());
  const verifiedLeadershipEvidence = reviewIntegritySafe && (
    hasVerifiedRequirement(atsReview, LEADERSHIP_EVIDENCE_PATTERN)
    || document.experience.some((entry) => entry.bullets.some((bullet) => /^(?:led|directed|managed|oversaw)\b/i.test(bullet.text)))
  );

  const technicalEvidenceGapTransition = technicalTarget
    && !verifiedTechnicalEvidence
    && (sourceCareerStrategy === "major-transition" || verifiedSapFunctionalEvidence);
  const tradeEvidenceGapTransition = tradeTarget && !verifiedTradeEvidence;
  const marketingEvidenceGapTransition = marketingTarget && !verifiedMarketingEvidence && !adjacentMarketingEvidence;
  const creativeEvidenceGapTransition = creativeTarget && !verifiedCreativeEvidence && !adjacentCreativeEvidence;
  const careerStrategy = technicalEvidenceGapTransition
    || tradeEvidenceGapTransition
    || marketingEvidenceGapTransition
    || creativeEvidenceGapTransition
    ? "major-transition"
    : sourceCareerStrategy;

  let occupationFamily = "general-professional";
  if (tradeTarget) occupationFamily = "skilled-trades-field-services";
  else if (marketingTarget) occupationFamily = "marketing-communications";
  else if (creativeTarget) occupationFamily = "creative-design";
  else if (sapTarget && technicalTarget) occupationFamily = "technical";
  else if (sapFunctionalTarget) occupationFamily = "sap-functional";
  else if (leadershipTarget) occupationFamily = "project-leadership";
  else if (technicalTarget) occupationFamily = "technical";
  else if (adminCustomerTarget) occupationFamily = "admin-customer-operations";

  let recommendedTemplateId = TEMPLATE_IDS.ATS_CORE;
  let recommendationReason = "ATS Core is the safest general-purpose match for this verified content.";
  let recommendationReasonCode = "ats_core_ambiguous_or_general";
  let recommendationStrength = "conservative";
  let recommendationDisposition = "not-recommended";
  if (occupationFamily === "skilled-trades-field-services" && !verifiedTradeEvidence) {
    recommendedTemplateId = TEMPLATE_IDS.CAREER_TRANSITION;
    recommendationReason = adjacentTradeEvidence
      ? "The target is field-based, but only adjacent operational or service evidence is verified, so a conservative transition presentation avoids implying hands-on trade experience."
      : "The target is field-based, but the résumé does not establish hands-on trade or field-service evidence, so career-transition positioning is safer.";
    recommendationReasonCode = adjacentTradeEvidence ? "skilled_trades_adjacent_pivot" : "skilled_trades_evidence_gap";
    recommendationStrength = "conservative";
    recommendationDisposition = adjacentTradeEvidence ? "adjacent-fit" : "insufficient-evidence";
  } else if (occupationFamily === "marketing-communications" && !verifiedMarketingEvidence && !adjacentMarketingEvidence) {
    recommendedTemplateId = TEMPLATE_IDS.CAREER_TRANSITION;
    recommendationReason = "The target is marketing or communications oriented, but the verified candidate evidence does not establish direct or adjacent work, so transition positioning is safer than implying marketing experience.";
    recommendationReasonCode = "marketing_communications_evidence_gap";
    recommendationStrength = "conservative";
    recommendationDisposition = "insufficient-evidence";
  } else if (occupationFamily === "creative-design" && !verifiedCreativeEvidence && !adjacentCreativeEvidence) {
    recommendedTemplateId = TEMPLATE_IDS.CAREER_TRANSITION;
    recommendationReason = "The target is creative or design oriented, but the verified candidate evidence does not establish direct or adjacent visual work, so transition positioning is safer than implying design experience.";
    recommendationReasonCode = "creative_design_evidence_gap";
    recommendationStrength = "conservative";
    recommendationDisposition = "insufficient-evidence";
  } else if (careerStrategy === "major-transition") {
    recommendedTemplateId = TEMPLATE_IDS.CAREER_TRANSITION;
    recommendationReason = technicalEvidenceGapTransition
      ? "The target is software-oriented, but the verified résumé does not contain direct development evidence, so transferable strengths and the technical gap must remain explicit."
      : occupationFamily === "marketing-communications"
        ? "Verified transferable communications evidence can support an honest marketing transition, but it does not establish direct campaign ownership or platform experience."
        : occupationFamily === "creative-design"
          ? "Verified transferable visual-production evidence can support an honest creative transition, but it does not establish a formal design role, portfolio, tools, or creative leadership."
      : "The evidence indicates a material transition, so transferable strengths need explicit, honest positioning.";
    recommendationReasonCode = technicalEvidenceGapTransition
      ? "career_transition_technical_evidence_gap"
      : occupationFamily === "marketing-communications"
        ? "career_transition_marketing_adjacent"
        : occupationFamily === "creative-design"
          ? "career_transition_creative_adjacent"
      : "career_transition_explicit";
    recommendationStrength = "strong";
    recommendationDisposition = "career-transition";
  } else if (occupationFamily === "skilled-trades-field-services" && verifiedTradeEvidence) {
    recommendedTemplateId = TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES;
    if (missingTradeCredentials.length) {
      recommendationReason = `Verified hands-on trade or field-service evidence supports this structure, but the posting or regulated target still requires ${missingTradeCredentials.join(", ")}. The missing credential remains outside the résumé.`;
      recommendationReasonCode = "skilled_trades_verified_credential_gap";
      recommendationStrength = "moderate";
    } else if (tradeProfileType === "apprentice-helper") {
      recommendationReason = "Verified apprentice or helper experience supports supervised-work, training, safety, and practical-capability positioning without implying journeyperson status.";
      recommendationReasonCode = "skilled_trades_apprentice_verified";
      recommendationStrength = "strong";
    } else if (tradeProfileType === "general-maintenance") {
      recommendationReason = "Verified general repair, property, construction, or grounds-maintenance evidence supports a practical field-work presentation without implying a regulated trade licence.";
      recommendationReasonCode = "skilled_trades_general_maintenance_verified";
      recommendationStrength = "strong";
    } else if (regulatedTradeTarget) {
      recommendationReason = "The regulated-trade target is supported by verified hands-on experience and the relevant credential evidence.";
      recommendationReasonCode = "skilled_trades_regulated_verified";
      recommendationStrength = "strong";
    } else {
      recommendationReason = "Verified installation, diagnostics, repair, maintenance, or customer-site evidence supports the Skilled Trades / Field Services structure.";
      recommendationReasonCode = "skilled_trades_field_service_verified";
      recommendationStrength = "strong";
    }
    recommendationDisposition = "direct-fit";
  } else if (occupationFamily === "marketing-communications" && verifiedMarketingEvidence) {
    recommendedTemplateId = TEMPLATE_IDS.MARKETING_COMMUNICATIONS;
    recommendationReason = explicitlyIncompletePosting
      ? "Verified marketing or communications evidence supports this family, but the incomplete posting keeps the recommendation provisional."
      : "The marketing or communications target is supported by verified campaign, content, channel, platform, brand, public-relations, or marketing-operations evidence.";
    recommendationReasonCode = explicitlyIncompletePosting ? "marketing_communications_verified_preliminary" : "marketing_communications_verified";
    recommendationStrength = explicitlyIncompletePosting ? "moderate" : "strong";
    recommendationDisposition = "direct-fit";
  } else if (occupationFamily === "marketing-communications" && adjacentMarketingEvidence) {
    recommendedTemplateId = TEMPLATE_IDS.MARKETING_COMMUNICATIONS;
    recommendationReason = "Verified communications, research, presentation, event, content-preparation, or coordination evidence supports an adjacent presentation without implying campaign ownership or platform experience.";
    recommendationReasonCode = "marketing_communications_adjacent_verified";
    recommendationStrength = explicitlyIncompletePosting ? "conservative" : "moderate";
    recommendationDisposition = "adjacent-fit";
  } else if (occupationFamily === "creative-design" && verifiedCreativeEvidence) {
    recommendedTemplateId = TEMPLATE_IDS.CREATIVE_DESIGN;
    recommendationReason = explicitlyIncompletePosting
      ? "Verified creative or design evidence supports this family, but the incomplete posting keeps the recommendation provisional."
      : "The creative or design target is supported by verified role, project, portfolio, production, or design-tool evidence.";
    recommendationReasonCode = explicitlyIncompletePosting ? "creative_design_verified_preliminary" : "creative_design_verified";
    recommendationStrength = explicitlyIncompletePosting ? "moderate" : "strong";
    recommendationDisposition = "direct-fit";
  } else if (occupationFamily === "creative-design" && adjacentCreativeEvidence) {
    recommendedTemplateId = TEMPLATE_IDS.CREATIVE_DESIGN;
    recommendationReason = "Verified presentation, document-production, brand-support, or visual-content evidence supports an adjacent creative presentation without implying a formal design role, portfolio, tools, or leadership.";
    recommendationReasonCode = "creative_design_adjacent_verified";
    recommendationStrength = explicitlyIncompletePosting ? "conservative" : "moderate";
    recommendationDisposition = "adjacent-fit";
  } else if (occupationFamily === "project-leadership" && verifiedLeadershipEvidence) {
    recommendedTemplateId = TEMPLATE_IDS.PROJECT_LEADERSHIP;
    recommendationReason = "The target is delivery/leadership oriented and the résumé contains verified ownership evidence.";
    recommendationReasonCode = "project_leadership_verified";
    recommendationStrength = "strong";
    recommendationDisposition = "direct-fit";
  } else if (occupationFamily === "sap-functional" && verifiedSapFunctionalEvidence) {
    recommendedTemplateId = TEMPLATE_IDS.SAP_FUNCTIONAL;
    recommendationReason = careerStrategy === "adjacent"
      ? "Verified SAP functional lifecycle evidence supports an adjacent functional-module presentation without claiming the missing module."
      : "The target and verified background align with functional SAP delivery rather than software development.";
    recommendationReasonCode = careerStrategy === "adjacent" ? "sap_functional_adjacent_verified" : "sap_functional_verified";
    recommendationStrength = "strong";
    recommendationDisposition = careerStrategy === "adjacent" ? "adjacent-fit" : "direct-fit";
  } else if (occupationFamily === "technical" && verifiedTechnicalEvidence) {
    recommendedTemplateId = TEMPLATE_IDS.TECHNICAL_SOFTWARE;
    recommendationReason = sapTarget
      ? "The programming-heavy SAP target is supported by direct technical implementation evidence."
      : "The software-oriented target is supported by verified development, engineering, or technical implementation evidence.";
    recommendationReasonCode = sapTarget ? "technical_software_sap_development_verified" : "technical_software_verified";
    recommendationStrength = "strong";
    recommendationDisposition = "direct-fit";
  } else if (occupationFamily === "admin-customer-operations" && verifiedAdminCustomerEvidence) {
    recommendedTemplateId = TEMPLATE_IDS.ADMIN_CUSTOMER_OPERATIONS;
    recommendationReason = "The target and verified background align with administrative, service, or customer-operations work without implying unverified management authority.";
    recommendationReasonCode = "admin_customer_operations_verified";
    recommendationStrength = "strong";
    recommendationDisposition = "direct-fit";
  } else if (occupationFamily === "technical") {
    recommendationReason = "The target is technical, but ATS Core remains safer because the verified résumé does not establish direct software or engineering evidence.";
    recommendationReasonCode = "technical_software_evidence_gap";
  } else if (occupationFamily === "project-leadership") {
    recommendationReason = "The target mentions leadership, but ATS Core avoids upgrading coordination into unverified ownership.";
    recommendationReasonCode = "project_leadership_evidence_gap";
  } else if (occupationFamily === "admin-customer-operations") {
    recommendationReason = "The target is operations-oriented, but ATS Core remains safer until direct administrative or customer-service evidence is present.";
    recommendationReasonCode = "admin_customer_operations_evidence_gap";
  }

  return {
    occupationFamily,
    careerStrategy,
    fitLevel: cleanScalar(atsReview?.readiness?.status ?? atsReview?.candidate_fit?.status ?? source.fit_assessment?.recommended_level, 120),
    postingReadiness: cleanScalar(atsReview?.posting_readiness?.status, 120),
    verifiedLeadershipEvidence,
    verifiedTechnicalEvidence,
    verifiedAdminCustomerEvidence,
    verifiedMarketingEvidence,
    adjacentMarketingEvidence,
    marketingProfileType,
    verifiedCreativeEvidence,
    adjacentCreativeEvidence,
    verifiedPortfolioEvidence,
    verifiedCreativeLeadershipEvidence,
    creativeProfileType,
    verifiedTradeEvidence,
    verifiedTradeCredential,
    regulatedTradeTarget,
    tradeProfileType,
    tradeCredentialStatus,
    requiredTradeCredentials,
    missingTradeCredentials,
    functionalVersusTechnical: occupationFamily === "sap-functional" ? "functional" : occupationFamily === "technical" ? "technical" : "not-applicable",
    materialRequirementGaps: valueList(atsReview?.missing_evidence ?? atsReview?.coverage?.missing).map((entry) => cleanScalar(entry, 500)).filter(Boolean),
    recommendedTemplateId,
    recommendationReason,
    recommendationReasonCode,
    recommendationStrength,
    recommendationDisposition,
    recommendationTrace: [
      `careerStrategy:${careerStrategy}`,
      `occupationFamily:${occupationFamily}`,
      `sapTarget:${sapTarget}`,
      `sapFunctionalEvidence:${verifiedSapFunctionalEvidence}`,
      `technicalTarget:${technicalTarget}`,
      `technicalEvidence:${verifiedTechnicalEvidence}`,
      `leadershipTarget:${leadershipTarget}`,
      `leadershipEvidence:${verifiedLeadershipEvidence}`,
      `adminCustomerTarget:${adminCustomerTarget}`,
      `adminCustomerEvidence:${verifiedAdminCustomerEvidence}`,
      `marketingTarget:${marketingTarget}`,
      `marketingEvidence:${verifiedMarketingEvidence}`,
      `marketingAdjacentEvidence:${adjacentMarketingEvidence}`,
      `marketingProfile:${marketingProfileType}`,
      `creativeTarget:${creativeTarget}`,
      `creativeEvidence:${verifiedCreativeEvidence}`,
      `creativeAdjacentEvidence:${adjacentCreativeEvidence}`,
      `creativePortfolioEvidence:${verifiedPortfolioEvidence}`,
      `creativeLeadershipEvidence:${verifiedCreativeLeadershipEvidence}`,
      `creativeProfile:${creativeProfileType}`,
      `tradeTarget:${tradeTarget}`,
      `tradeEvidence:${verifiedTradeEvidence}`,
      `tradeProfile:${tradeProfileType}`,
      `tradeCredentialStatus:${tradeCredentialStatus}`,
      `missingTradeCredentials:${missingTradeCredentials.join("|") || "none"}`,
      `reasonCode:${recommendationReasonCode}`,
    ],
  };
}

export function createResumePackage(resumeData = {}, { item = {}, atsReview = {}, selectedTemplateId } = {}) {
  if (resumeData?.kind === "resume-package" && resumeData.schemaVersion !== RESUME_SCHEMA_VERSION) {
    throw new Error(`Unsupported ResumePackage schema version: ${cleanScalar(resumeData.schemaVersion) || "missing"}.`);
  }
  if (resumeData?.kind === "resume-package") {
    if (!selectedTemplateId) return resumeData;
    const resolved = resolveTemplateId(selectedTemplateId, resumeData.presentation.recommendedTemplateId);
    return { ...resumeData, presentation: { ...resumeData.presentation, selectedTemplateId: resolved, pageTarget: RESUME_TEMPLATE_REGISTRY[resolved].pageTarget } };
  }
  const source = resumeData && typeof resumeData === "object" && !Array.isArray(resumeData) ? resumeData : {};
  const warnings = [];
  const evidenceItems = {};
  const contact = normalizeContact(source, warnings);
  const document = {
    candidate: {
      fullName: identityText(source, warnings),
      ...contact,
    },
    target: {
      jobTitle: fieldText(item?.title ?? source.target?.jobTitle ?? source.target?.job_title, ["jobTitle", "job_title", "title", "value"], "target.jobTitle", warnings, " ", 300),
      company: fieldText(item?.company ?? source.target?.company, ["company", "employer", "name", "value"], "target.company", warnings, " ", 300),
    },
    headline: fieldText(source.headline ?? source.title, ["headline", "title", "role", "position", "value", "name"], "headline", warnings, " ", 500),
    summary: fieldText(source.summary ?? source.profile, ["summary", "profile", "description", "content", "value"], "summary", warnings, " ", 4_000),
    skills: normalizeSkills(source, warnings, evidenceItems),
    experience: normalizeExperience(source.experience, warnings, evidenceItems),
    projects: normalizeProjects(source.projects, warnings, evidenceItems),
    education: normalizeEducation(source.education, warnings, evidenceItems),
    certifications: normalizeCredentials(source.certifications, "certifications", warnings, evidenceItems),
    training: normalizeCredentials(source.training, "training", warnings, evidenceItems),
    languages: normalizeLanguages(source.languages, warnings, evidenceItems),
    safety: {
      record: fieldText(source.safety_record ?? source.safety?.record, ["safety_record", "record", "description", "content", "value"], "safety.record", warnings, " ", 1_500),
      certifications: normalizeTextItems(source.safety_certifications ?? source.safety?.certifications, "safety.certifications", warnings, evidenceItems, ["value", "name", "title", "credential", "text"]),
    },
    additionalSections: normalizeAdditionalSections(source.additionalSections ?? source.additional_sections, warnings, evidenceItems),
  };
  const classification = classifyResumePackageInput(document, source, atsReview, item);
  const recommendedTemplateId = classification.recommendedTemplateId;
  const requestedTemplateId = selectedTemplateId ?? source.presentation?.selectedTemplateId ?? source.presentation?.selected_template;
  const selected = resolveTemplateId(requestedTemplateId, recommendedTemplateId);
  const errors = [];
  if (!document.candidate.fullName || PLACEHOLDER_IDENTITY.test(document.candidate.fullName)) {
    errors.push({ path: "candidate.fullName", code: "missing_identity", message: "Candidate name is required before final export." });
  }
  const contentHash = `resume-${hashText(document)}`;
  const resumePackage = {
    kind: "resume-package",
    schemaVersion: RESUME_SCHEMA_VERSION,
    document,
    evidence: {
      items: evidenceItems,
      unsupportedContentRemoved: valueList(atsReview?.unsupported_content_removed ?? atsReview?.unsupported_claims).map((entry) => cleanScalar(entry, 500)).filter(Boolean),
      verifiedFacts: valueList(atsReview?.verified_facts).map((entry) => cleanScalar(entry, 500)).filter(Boolean),
      postingCompleteness: atsReview?.posting_readiness || null,
      warnings,
    },
    classification,
    presentation: {
      recommendedTemplateId,
      selectedTemplateId: selected,
      recommendationReason: classification.recommendationReason,
      recommendationReasonCode: classification.recommendationReasonCode,
      recommendationStrength: classification.recommendationStrength,
      recommendationDisposition: classification.recommendationDisposition,
      pageTarget: RESUME_TEMPLATE_REGISTRY[selected].pageTarget,
      locale: cleanScalar(source.presentation?.locale ?? globalThis.navigator?.language, 40) || "en-CA",
      version: 1,
    },
    validation: { valid: errors.length === 0, errors, warnings },
    contentHash,
  };
  resumePackage.evidence.wordingWarnings = analyzeResumeWording(resumePackage);
  return resumePackage;
}

function skillItems(document) {
  return [
    ...document.skills.verifiedCore,
    ...document.skills.verifiedDomain,
    ...document.skills.verifiedTools,
    ...document.skills.transferable,
  ];
}

export function buildResumeContentPlan(resumePackage) {
  const pkg = createResumePackage(resumePackage);
  const { document } = pkg;
  const sections = [];
  if (document.summary) sections.push({ id: "summary", type: "paragraph", items: [{ id: "summary", text: document.summary }] });
  const skills = skillItems(document);
  if (skills.length) sections.push({ id: "skills", type: "inline-list", items: skills });
  if (document.experience.length) sections.push({ id: "experience", type: "experience", items: document.experience });
  if (document.projects.length) sections.push({ id: "projects", type: "projects", items: document.projects });
  if (document.training.length) sections.push({ id: "training", type: "credentials", items: document.training });
  if (document.certifications.length) sections.push({ id: "certifications", type: "credentials", items: document.certifications });
  if (document.safety.record || document.safety.certifications.length) sections.push({
    id: "safety",
    type: "safety",
    items: [
      ...(document.safety.record ? [{ id: "safety-record", text: document.safety.record }] : []),
      ...document.safety.certifications,
    ],
  });
  if (document.education.length) sections.push({ id: "education", type: "education", items: document.education });
  if (document.languages.length) sections.push({ id: "languages", type: "languages", items: document.languages });
  for (const section of document.additionalSections) sections.push({ id: `additional:${section.id}`, type: "inline-list", title: section.title, items: section.items });
  return Object.freeze({ kind: "resume-content-plan", schemaVersion: pkg.schemaVersion, contentHash: pkg.contentHash, sections: deepFreeze(sections) });
}

function safeSectionHeading(section, templateId, classification) {
  if (section.title) return section.title;
  const isSap = classification.occupationFamily === "sap-functional";
  const isLeadership = classification.occupationFamily === "project-leadership" && classification.verifiedLeadershipEvidence;
  const isTransition = classification.careerStrategy === "major-transition";
  const isTechnical = classification.occupationFamily === "technical" && classification.verifiedTechnicalEvidence;
  const isAdminCustomer = classification.occupationFamily === "admin-customer-operations" && classification.verifiedAdminCustomerEvidence;
  const isTrade = classification.occupationFamily === "skilled-trades-field-services" && classification.verifiedTradeEvidence;
  const isMarketing = classification.occupationFamily === "marketing-communications" && classification.verifiedMarketingEvidence;
  const isMarketingAdjacent = classification.occupationFamily === "marketing-communications" && classification.adjacentMarketingEvidence;
  const isCreative = classification.occupationFamily === "creative-design" && classification.verifiedCreativeEvidence;
  const isCreativeAdjacent = classification.occupationFamily === "creative-design" && classification.adjacentCreativeEvidence;
  const headings = {
    summary: templateId === TEMPLATE_IDS.SAP_FUNCTIONAL && isSap
      ? "SAP Functional Profile"
      : templateId === TEMPLATE_IDS.PROJECT_LEADERSHIP && isLeadership
        ? "Project Delivery Profile"
        : templateId === TEMPLATE_IDS.CAREER_TRANSITION && isTransition
          ? "Career Transition Summary"
          : templateId === TEMPLATE_IDS.TECHNICAL_SOFTWARE && isTechnical
            ? "Technical Profile"
            : templateId === TEMPLATE_IDS.ADMIN_CUSTOMER_OPERATIONS && isAdminCustomer
              ? "Operations & Service Profile"
              : templateId === TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES && isTrade
                ? "Trade & Field Service Profile"
                : templateId === TEMPLATE_IDS.MARKETING_COMMUNICATIONS && isMarketing
                  ? "Marketing & Communications Profile"
                  : templateId === TEMPLATE_IDS.MARKETING_COMMUNICATIONS && isMarketingAdjacent
                    ? "Communications & Content Profile"
                    : templateId === TEMPLATE_IDS.CREATIVE_DESIGN && isCreative
                      ? classification.verifiedCreativeLeadershipEvidence ? "Creative Leadership Profile" : "Creative & Design Profile"
                      : templateId === TEMPLATE_IDS.CREATIVE_DESIGN && isCreativeAdjacent
                        ? "Visual Content & Production Profile"
                : "Professional Summary",
    skills: templateId === TEMPLATE_IDS.SAP_FUNCTIONAL && isSap
      ? "SAP Modules & Functional Capabilities"
      : templateId === TEMPLATE_IDS.PROJECT_LEADERSHIP && isLeadership
        ? "Leadership Competencies"
        : templateId === TEMPLATE_IDS.CAREER_TRANSITION && isTransition
          ? "Transferable Strengths"
          : templateId === TEMPLATE_IDS.TECHNICAL_SOFTWARE && isTechnical
            ? "Technical Skills"
            : templateId === TEMPLATE_IDS.ADMIN_CUSTOMER_OPERATIONS && isAdminCustomer
              ? "Operations & Customer Service Skills"
              : templateId === TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES && isTrade
                ? "Trade & Field Capabilities"
                : templateId === TEMPLATE_IDS.MARKETING_COMMUNICATIONS && isMarketing
                  ? "Marketing & Communications Capabilities"
                  : templateId === TEMPLATE_IDS.MARKETING_COMMUNICATIONS && isMarketingAdjacent
                    ? "Communications & Transferable Capabilities"
                    : templateId === TEMPLATE_IDS.CREATIVE_DESIGN && isCreative
                      ? "Creative Capabilities & Verified Tools"
                      : templateId === TEMPLATE_IDS.CREATIVE_DESIGN && isCreativeAdjacent
                        ? "Visual Content & Production Capabilities"
                : "Core Skills",
    experience: templateId === TEMPLATE_IDS.TECHNICAL_SOFTWARE && isTechnical
      ? "Technical Experience"
      : templateId === TEMPLATE_IDS.ADMIN_CUSTOMER_OPERATIONS && isAdminCustomer
        ? "Administrative & Customer Operations Experience"
        : templateId === TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES && isTrade
          ? "Trade & Field Experience"
          : templateId === TEMPLATE_IDS.MARKETING_COMMUNICATIONS && isMarketing
            ? "Marketing & Communications Experience"
            : templateId === TEMPLATE_IDS.CREATIVE_DESIGN && isCreative
              ? "Creative & Design Experience"
          : "Professional Experience",
    projects: templateId === TEMPLATE_IDS.TECHNICAL_SOFTWARE && isTechnical
      ? "Technical Projects"
      : templateId === TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES && isTrade
        ? "Field Projects & Practical Experience"
        : templateId === TEMPLATE_IDS.MARKETING_COMMUNICATIONS && isMarketing
          ? "Campaigns & Communications Projects"
          : templateId === TEMPLATE_IDS.MARKETING_COMMUNICATIONS && isMarketingAdjacent
            ? "Selected Relevant Projects"
            : templateId === TEMPLATE_IDS.CREATIVE_DESIGN && isCreative
              ? "Selected Creative Projects"
              : templateId === TEMPLATE_IDS.CREATIVE_DESIGN && isCreativeAdjacent
                ? "Selected Visual Content Projects"
        : "Verified Projects",
    training: templateId === TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES && isTrade ? "Training & Apprenticeship" : "Professional Training",
    certifications: templateId === TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES && isTrade ? "Licences & Trade Credentials" : "Certifications",
    safety: templateId === TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES && isTrade ? "Verified Safety Training" : "Safety Training",
    education: "Education",
    languages: "Languages",
  };
  return headings[section.id] || "Additional Information";
}

function sectionOrderForTemplate(template, classification) {
  if (template.id !== TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES || !classification.verifiedTradeEvidence) return template.sectionOrder;
  if (classification.tradeProfileType === "regulated-trade-professional") {
    return ["summary", "certifications", "safety", "skills", "experience", "projects", "training", "education", "languages"];
  }
  if (classification.tradeProfileType === "apprentice-helper") {
    return ["summary", "training", "safety", "skills", "experience", "certifications", "projects", "education", "languages"];
  }
  if (classification.tradeProfileType === "experienced-field-service-professional") {
    return ["summary", "skills", "experience", "certifications", "safety", "projects", "training", "education", "languages"];
  }
  return ["summary", "skills", "experience", "projects", "safety", "training", "certifications", "education", "languages"];
}

function contactLine(candidate) {
  if (candidate.contactLine) {
    const additionalLinks = candidate.professionalLinks
      .map((link) => link.url)
      .filter((url) => !candidate.contactLine.includes(url));
    return [candidate.contactLine, ...additionalLinks].filter(Boolean).join(" | ");
  }
  const location = [candidate.city, candidate.region, candidate.country].filter(Boolean).join(", ");
  return [candidate.email, candidate.phone, location, ...candidate.professionalLinks.map((link) => link.url)].filter(Boolean).join(" | ");
}

export function buildResumeRenderPlan(resumePackage, templateId, { preliminary = false } = {}) {
  const pkg = createResumePackage(resumePackage);
  const resolvedTemplateId = resolveTemplateId(templateId ?? pkg.presentation.selectedTemplateId, pkg.presentation.recommendedTemplateId);
  const template = RESUME_TEMPLATE_REGISTRY[resolvedTemplateId];
  const contentPlan = buildResumeContentPlan(pkg);
  const sectionOrder = sectionOrderForTemplate(template, pkg.classification);
  const order = new Map(sectionOrder.map((id, index) => [id, index]));
  const sections = [...contentPlan.sections]
    .sort((left, right) => (order.get(left.id) ?? 10_000) - (order.get(right.id) ?? 10_000))
    .map((section) => ({ ...section, heading: safeSectionHeading(section, resolvedTemplateId, pkg.classification) }));
  const plan = {
    kind: "resume-render-plan",
    schemaVersion: pkg.schemaVersion,
    templateId: resolvedTemplateId,
    templateName: template.displayName,
    contentHash: pkg.contentHash,
    preliminary,
    // Preliminary state belongs to the surrounding product UI and filename,
    // never to the résumé content an employer or ATS receives.
    preliminaryNotice: "",
    header: {
      fullName: pkg.document.candidate.fullName,
      headline: pkg.document.headline,
      contactLine: contactLine(pkg.document.candidate),
    },
    sections,
    visualTokens: template.visualTokens,
    pageTarget: template.pageTarget,
  };
  plan.manifest = createResumeContentManifest(plan);
  plan.renderPlanHash = `render-${hashText({ templateId: resolvedTemplateId, preliminary, manifest: plan.manifest })}`;
  return deepFreeze(plan);
}

function manifestItem(sectionType, item) {
  if (["experience"].includes(sectionType)) {
    return {
      id: item.id,
      values: [item.title, item.employer, item.location, item.dateDisplay].filter(Boolean),
      bullets: item.bullets.map((bullet) => ({ id: bullet.id, text: bullet.text })),
    };
  }
  if (sectionType === "projects") {
    return {
      id: item.id,
      values: [item.name, item.organization, item.startDate, item.endDate, item.description].filter(Boolean),
      bullets: item.bullets.map((bullet) => ({ id: bullet.id, text: bullet.text })),
    };
  }
  if (sectionType === "credentials") return { id: item.id, values: [item.name, item.issuer, item.dateDisplay].filter(Boolean) };
  if (sectionType === "education") return { id: item.id, values: [item.credential, item.field, item.institution, item.location, item.dateDisplay].filter(Boolean), details: item.details.map((detail) => ({ id: detail.id, text: detail.text })) };
  if (sectionType === "languages") return { id: item.id, values: [item.name, item.proficiency].filter(Boolean) };
  return { id: item.id, text: item.text };
}

export function createResumeContentManifest(renderPlan) {
  return {
    schemaVersion: renderPlan.schemaVersion,
    templateId: renderPlan.templateId,
    preliminary: renderPlan.preliminary,
    header: { ...renderPlan.header },
    sections: renderPlan.sections.map((section) => ({
      id: section.id,
      heading: section.heading,
      items: section.items.map((item) => manifestItem(section.type, item)),
    })),
  };
}

function flattenManifestItem(item) {
  return [
    ...(item.values || []),
    ...(item.text ? [item.text] : []),
    ...(item.bullets || []).map((bullet) => bullet.text),
    ...(item.details || []).map((detail) => detail.text),
  ];
}

export function manifestVisibleText(manifest) {
  const lines = [manifest.header.fullName, manifest.header.headline, manifest.header.contactLine];
  for (const section of manifest.sections) {
    lines.push(section.heading);
    for (const item of section.items) lines.push(...flattenManifestItem(item));
  }
  return lines.map((line) => cleanScalar(line)).filter(Boolean);
}

export function normalizeResumeForLegacyView(resumeData, context = {}) {
  const pkg = createResumePackage(resumeData, context);
  const { document } = pkg;
  return {
    name: document.candidate.fullName,
    title: document.headline,
    contact: contactLine(document.candidate),
    profile: document.summary,
    skills: skillItems(document).map((item) => item.text),
    experience: document.experience.map((entry) => ({ role: entry.title, company: entry.employer, location: entry.location, dates: entry.dateDisplay, bullets: entry.bullets.map((bullet) => bullet.text) })),
    projects: document.projects.map((entry) => ({ name: entry.name, description: entry.description, bullets: entry.bullets.map((bullet) => bullet.text) })),
    training: document.training.map((entry) => ({ name: entry.name, provider: entry.issuer, dates: entry.dateDisplay })),
    certifications: document.certifications.map((entry) => ({ name: entry.name, issuer: entry.issuer, provider: entry.issuer, year: entry.dateDisplay, dates: entry.dateDisplay })),
    safety_record: document.safety.record,
    safety_certifications: document.safety.certifications.map((item) => item.text),
    education: document.education.map((entry) => ({ degree: entry.credential, institution: entry.institution, dates: entry.dateDisplay })),
    languages: document.languages.map((entry) => [entry.name, entry.proficiency].filter(Boolean).join(" · ")),
  };
}

export function hasUsableCandidateIdentity(resumePackage) {
  const pkg = createResumePackage(resumePackage);
  const name = pkg.document.candidate.fullName;
  return Boolean(name) && !PLACEHOLDER_IDENTITY.test(name);
}

export function assertResumePackageIdentity(resumePackage) {
  const pkg = createResumePackage(resumePackage);
  if (!hasUsableCandidateIdentity(pkg)) throw new Error("Candidate name is required before export.");
  return pkg.document.candidate.fullName;
}

export function safeResumeFilenameFromPackage(resumePackage, extension, { preliminary = false } = {}) {
  const pkg = createResumePackage(resumePackage);
  const base = [pkg.document.candidate.fullName || "candidate", pkg.document.headline || "tailored-resume", preliminary ? "preliminary" : ""]
    .filter(Boolean)
    .join("-")
    .normalize("NFKD")
    .replace(/[^a-z0-9 -]/gi, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 100) || "tailored-resume";
  return `${base}.${cleanScalar(extension).replace(/^\./, "")}`;
}

const VAGUE_OPENING = /^(?:worked on|responsible for|helped with|involved in|duties included|tasked with)\b/i;
const LEADERSHIP_OPENING = /^(?:led|directed|managed|oversaw)\b/i;

export function analyzeResumeWording(resumePackage) {
  const pkg = resumePackage?.kind === "resume-package" ? resumePackage : createResumePackage(resumePackage);
  const issues = [];
  const openings = new Map();
  const exact = new Map();
  for (const experience of pkg.document.experience) {
    for (const bullet of experience.bullets) {
      const opening = bullet.text.match(/^([A-Za-z][A-Za-z'-]*)/)?.[1]?.toLowerCase() || "";
      if (opening) openings.set(opening, [...(openings.get(opening) || []), bullet.id]);
      const normalized = bullet.text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      if (normalized) exact.set(normalized, [...(exact.get(normalized) || []), bullet.id]);
      if (VAGUE_OPENING.test(bullet.text)) issues.push({ code: "vague_opening", itemId: bullet.id, message: "Bullet begins with vague wording." });
      if (bullet.text.length > 240) issues.push({ code: "long_bullet", itemId: bullet.id, message: "Bullet is longer than 240 characters." });
      if (bullet.text.split(/\s+/).length < 4) issues.push({ code: "fragment", itemId: bullet.id, message: "Bullet may be a sentence fragment." });
      const evidence = pkg.evidence.items[bullet.id];
      if (LEADERSHIP_OPENING.test(bullet.text) && evidence?.responsibilityLevel && !["led", "owned"].includes(evidence.responsibilityLevel)) {
        issues.push({ code: "unsupported_ownership", itemId: bullet.id, message: "Leadership verb is stronger than the recorded responsibility level." });
      }
    }
  }
  for (const [opening, itemIds] of openings) {
    if (itemIds.length >= 3) issues.push({ code: "repeated_opening", itemIds, message: `Opening verb “${opening}” is repeated ${itemIds.length} times.` });
  }
  for (const itemIds of exact.values()) {
    if (itemIds.length > 1) issues.push({ code: "duplicate_bullet", itemIds, message: "Identical bullet appears in multiple positions." });
  }
  return issues;
}

function deepFreeze(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return value;
  seen.add(value);
  for (const entry of Object.values(value)) deepFreeze(entry, seen);
  return Object.freeze(value);
}
