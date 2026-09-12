import {resumeProfessionalLinks} from './resumeIdentity.js';
const text = (value) => typeof value === "string" ? value.trim() : String(value?.name ?? value?.language ?? value?.text ?? value?.value ?? "").trim();
const key = (value) => String(value || "").normalize("NFC").toLowerCase().replace(/[\s:·|–—-]+/g, " ").replace(/[.,;]+$/g, "").trim();
const list = (value) => Array.isArray(value) ? value : [];

// Section boundaries describe document structure, not candidate qualifications.
export function resumeSectionKind(value) {
  const heading = String(value || "").replace(/^[\s#•*-]+|[\s:–—-]+$/g, "").replace(/\s+/g, " ").trim();
  if (/^(?:(?:professional|technical|additional|relevant|selected) )?(?:training|courses?|professional development|courses? (?:and|&) training)$/i.test(heading)) return "training";
  if (/^(?:(?:spoken|foreign) )?languages?(?: (?:skills|proficiency|proficiencies|spoken))?$/i.test(heading)) return "languages";
  if (/^(?:security )?clearances?(?: (?:level|status))?$/i.test(heading)) return "clearance";
  if (/^(?:education|academic (?:background|qualifications)|education (?:and|&) qualifications)$/i.test(heading)) return "education";
  if (/^(?:(?:professional|technical) )?(?:certifications?|certificates?|credentials?|licen[cs]es?)(?: (?:and|&) (?:certifications?|licen[cs]es?))?$/i.test(heading)) return "certifications";
  if (/^(?:(?:professional|relevant|work|employment|career) )?(?:experience|history|employment)$/i.test(heading)) return "experience";
  if (/^(?:(?:core|technical|professional|key) )?(?:skills|competencies|expertise)$/i.test(heading)) return "skills";
  if (/^(?:(?:selected|technical|professional|relevant) )?projects?$/i.test(heading)) return "projects";
  if (/^(?:(?:professional|career) )?(?:summary|profile|objective)$/i.test(heading)) return "summary";
  if (/^(?:interests|hobbies|publications|references|awards|achievements|volunteer(?:ing| experience)?|memberships|additional information)$/i.test(heading)) return "other";
  return "";
}

export function readResumeSections(baseResume) {
  const sections = [];
  let current;
  for (const raw of String(baseResume || "").split(/\r?\n/)) {
    const line = raw.replace(/^[\s•*-]+/, "").trim();
    if (!line) continue;
    const kind = resumeSectionKind(line);
    if (kind) { current = { kind, title: line.replace(/:$/, ""), lines: [] }; sections.push(current); }
    else if (current) current.lines.push(line);
  }
  return sections;
}

function unique(values, identity = text) {
  const seen = new Set();
  return values.filter((value) => { const id = key(identity(value)); if (!id || seen.has(id)) return false; seen.add(id); return true; });
}

const courseIdentity = (entry) => {
  const provider = entry?.provider ?? entry?.issuer ?? "";
  // The SAP prefix is redundant only for an explicitly SAP-supplied course.
  const name = /\bsap\b/i.test(provider) ? text(entry).replace(/^SAP\s+/i, "") : text(entry);
  return [name, provider, entry?.dates ?? entry?.dateDisplay ?? ""].join(" | ");
};
const languageIdentity = (entry) => [text(entry), typeof entry === "object" ? entry?.proficiency : ""].filter(Boolean).join(" ");
const languageLine = /^(?:English|French|Spanish|Portuguese|German|Italian|Arabic|Mandarin|Cantonese|Chinese|Japanese|Korean|Hindi|Urdu|Russian|Ukrainian|Polish)\s*(?::|[–—·-]|\b(?:native|fluent|basic|intermediate|advanced)\b)/i;

// Repairs misplaced sections without changing a qualification's wording/status.
// Canonical fields and source records remain intact; only clear duplicates vanish.
export function organizeResumeSections(source = {}, baseResume = "") {
  const training = [];
  const languages = [...list(source.languages)];
  const additional = list(source.additionalSections ?? source.additional_sections).map((section) => ({ ...section, items: [...list(section.items)] }));
  const clearance = [];
  let destination = "training";
  let extraTitle = "";
  const addExtra = (title, value) => {
    let section = additional.find((entry) => key(entry.title) === key(title));
    if (!section) { section = { title, items: [] }; additional.push(section); }
    section.items.push(value);
  };
  for (const entry of list(source.training)) {
    const name = text(entry);
    const kind = resumeSectionKind(name);
    if (kind && !entry?.provider && !entry?.issuer && !entry?.dates && !entry?.dateDisplay) {
      destination = kind;
      extraTitle = name.replace(/:$/, "");
      continue;
    }
    if (destination === "languages" || languageLine.test(name) || entry?.language || entry?.proficiency) languages.push(entry?.proficiency ? { name, proficiency: entry.proficiency } : name);
    else if (destination === "clearance") clearance.push(name);
    else if (destination === "training") training.push(entry);
    else addExtra(extraTitle || "Additional Information", courseIdentity(entry));
  }
  for (const section of readResumeSections(baseResume)) {
    if (section.kind === "training") {
      for (const line of section.lines) {
        const [name, ...provider] = line.split("|").map((part) => part.trim());
        if (name) training.push({ name, provider: provider.join(" | "), dates: "", restored_from_verified_evidence: true });
      }
    } else if (section.kind === "languages") languages.push(...section.lines);
    else if (section.kind === "clearance") clearance.push(...section.lines);
  }
  for (const section of additional) {
    if (resumeSectionKind(section.title) === "languages") { languages.push(...section.items); section.items = []; }
    if (resumeSectionKind(section.title) === "clearance") { clearance.push(...section.items); section.items = []; }
  }
  if (clearance.length && !additional.some((entry) => key(entry.title) === key("Security Clearance"))) additional.push({ title: "Security Clearance", items: [] });
  const clearSection = additional.find((entry) => key(entry.title) === key("Security Clearance"));
  if (clearSection) clearSection.items = unique(clearance);
  const credentialKey = (entry) => key(text(entry).replace(/\s+certificate$/i, ""));
  const credentialNames = new Set(list(source.certifications).map(credentialKey).filter(Boolean));
  return {
    ...source,
    ...(resumeProfessionalLinks(baseResume).length ? { professionalLinks: unique([...list(source.professionalLinks ?? source.professional_links), ...resumeProfessionalLinks(baseResume)], (entry) => entry?.url || text(entry)) } : {}),
    ...(Array.isArray(source.skills) ? { skills: source.skills.filter((entry) => !credentialNames.has(credentialKey(entry))) } : {}),
    training: unique(training, courseIdentity),
    languages: unique(languages.flatMap((entry) => typeof entry === "string" ? entry.split(/[,;]\s*(?=[\p{L}][\p{L} -]{1,25}:)/u) : [entry]), languageIdentity),
    additionalSections: additional.map((entry) => ({ ...entry, items: unique(entry.items) })).filter((entry) => entry.items.length),
  };
}

export function groupResumeExperience(entries = []) {
  const identity = (entry) => [entry.employer, entry.location, entry.dateDisplay].map(key).join("|");
  const result = [];
  for (let start = 0; start < entries.length;) {
    const first = entries[start];
    let end = start + 1;
    while (first.employer && first.dateDisplay && end < entries.length && identity(first) === identity(entries[end])) end++;
    const run = entries.slice(start, end);
    const wordCount = run.reduce((total, entry) => total + (entry.bullets || []).reduce((count, bullet) => count + String(bullet.text || "").split(/\s+/).length, 0), 0);
    // Group compact assignments that can stay together in every renderer.
    // Longer histories retain employer context on each individual role.
    const grouped = run.length > 1 && run.length <= 4 && wordCount <= 180 && run.every(isCompactResumeRole);
    run.forEach((entry, index) => result.push({
      ...entry, grouped,
      groupHeading: grouped && index === 0 ? [entry.employer, entry.location, entry.dateDisplay].filter(Boolean).join(" | ") : "",
      groupSize: grouped && index === 0 ? run.length : 0,
      groupContinues: grouped && index < run.length - 1,
    }));
    start = end;
  }
  return result;
}

export function resumeRoleHeading(entry, { continued = false } = {}) {
  const title = [entry.title, (!entry.grouped || continued) && entry.employer].filter(Boolean).join(" - ");
  const parts = entry.grouped && !continued ? [title] : [title, entry.location, entry.dateDisplay];
  return parts.filter(Boolean).join(" | ") + (continued ? " (continued)" : "");
}

export function isCompactResumeRole(entry) {
  return (entry.bullets || []).length <= 3 && (entry.bullets || []).reduce((count, bullet) => count + String(bullet.text || "").split(/\s+/).length, 0) <= 130;
}

export function professionalContactLine(candidate) {
  const street = (value) => {
    if (/@|^https?:|^www\./i.test(value) || (/^\+?[\d\s().-]+$/.test(value) && value.replace(/\D/g, "").length >= 7 && value.replace(/\D/g, "").length <= 16)) return false;
    return /^\s*\d+\s+\S/.test(value) || /\b(?:rue|street|st\.|avenue|ave\.|road|rd\.|boulevard|blvd\.?|apartment|apt\.?|suite|postal)\b/i.test(value);
  };
  const raw = String(candidate.contactLine || "").split(/\s*(?:\||·)\s*/).filter(Boolean);
  const parts = raw.filter((part) => !street(part));
  const location = candidate.displayLocation || [candidate.city, candidate.region, candidate.country].filter(Boolean).join(", ");
  const safeLocation = location && !street(location) ? location : "";
  if (safeLocation && candidate.displayLocation) {
    return unique([candidate.email, candidate.phone, safeLocation, ...parts.filter((part) => /@|https?:|www\.|linkedin\./i.test(part)), ...list(candidate.professionalLinks).map((entry) => entry.url)].filter(Boolean)).join(" | ");
  }
  return unique([...(parts.length ? parts : [candidate.email, candidate.phone, safeLocation]), ...list(candidate.professionalLinks).map((entry) => entry.url)].filter(Boolean)).join(" | ");
}
