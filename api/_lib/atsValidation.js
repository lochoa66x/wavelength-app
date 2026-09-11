import { resumeSectionKind } from "../../src/resumeOrganization.js";
import { resumeDataToPlainText } from "../../src/resumeText.js";
import { findSemanticIntegrityIssues } from "./tailoringEvidence.js";
import { isPlaceholderIdentity } from "./resumeQuality.js";
import { buildWritingReview } from "./resumeWriting.js";
import { claimMeaningIssues, requirementEvidenceBoundary } from "../../src/documentIntegrity.js";

function normalized(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9%+$]+/g, " ")
    .trim();
}

const HISTORY_TOKEN_ALIASES = new Map([
  ["sr", ["senior"]],
  ["snr", ["senior"]],
  ["jr", ["junior"]],
  ["mgr", ["manager"]],
  ["mgmt", ["management"]],
  ["dir", ["director"]],
  ["assoc", ["associate"]],
  ["asst", ["assistant"]],
  ["admin", ["administrator"]],
  ["coord", ["coordinator"]],
  ["dev", ["developer"]],
  ["eng", ["engineer"]],
  ["engr", ["engineer"]],
  ["spec", ["specialist"]],
  ["capgemini", ["cap", "gemini"]],
]);

const HISTORY_JOINERS = new Set(["a", "an", "and", "at", "for", "of", "the"]);
const COMPANY_SUFFIXES = new Set([
  "co", "company", "corp", "corporation", "inc", "incorporated", "llc", "limited", "ltd", "plc",
]);

function historyTokens(value, field) {
  return normalized(value)
    .split(/\s+/)
    .filter(Boolean)
    .flatMap((token) => HISTORY_TOKEN_ALIASES.get(token) || [token])
    .filter((token) => !HISTORY_JOINERS.has(token))
    .filter((token) => field !== "company" || !COMPANY_SUFFIXES.has(token));
}

function historySegments(baseResume) {
  return String(baseResume || "")
    .split(/\r?\n/)
    .flatMap((line) => {
      const parts = line.split(/\s+(?:[|•·]|[—–])\s+|\t+|\s{2,}/).map((part) => part.trim()).filter(Boolean);
      return parts.length ? parts : [line];
    })
    .filter(Boolean);
}

function historyFieldSupported(value, baseResume, field) {
  const candidateTokens = historyTokens(value, field);
  if (!candidateTokens.length) return true;

  const candidatePhrase = candidateTokens.join(" ");
  const basePhrase = historyTokens(baseResume, field).join(" ");
  if (basePhrase.includes(candidatePhrase)) return true;

  return historySegments(baseResume).some((segment) => {
    const sourceTokens = new Set(historyTokens(segment, field));
    return candidateTokens.every((token) => sourceTokens.has(token));
  });
}

function dateFieldSupported(value, baseResume) {
  const candidate = normalized(value);
  if (!candidate) return true;

  const base = normalized(baseResume);
  if (base.includes(candidate)) return true;

  const years = [...candidate.matchAll(/\b(?:19|20)\d{2}\b/g)].map((match) => match[0]);
  const current = isCurrent(candidate);
  if (!years.length && !current) return false;

  return String(baseResume || "").split(/\r?\n/).some((line) => {
    const normalizedLine = normalized(line);
    return years.every((year) => normalizedLine.includes(year))
      && (!current || isCurrent(normalizedLine));
  });
}

function lineContainsHistoryField(line, value, field) {
  const candidateTokens = historyTokens(value, field);
  if (!candidateTokens.length) return true;
  const sourceTokens = new Set(historyTokens(line, field));
  return candidateTokens.every((token) => sourceTokens.has(token));
}

function lineContainsEmploymentDates(line, value) {
  const candidate = normalized(value);
  if (!candidate) return true;
  const candidateYears = [...candidate.matchAll(/\b(?:19|20)\d{2}\b/g)].map((match) => match[0]);
  const sourceYears = [...normalized(line).matchAll(/\b(?:19|20)\d{2}\b/g)].map((match) => match[0]);
  if (!candidateYears.every((year) => sourceYears.includes(year))) return false;
  if (isCurrent(candidate) && !isCurrent(line)) return false;
  return sourceYears.every((year) => candidateYears.includes(year));
}

function historyEntryAssociationSupported(experience, baseResume) {
  const role = String(experience?.role || "").trim();
  const company = String(experience?.company || "").trim();
  const dates = String(experience?.dates || "").trim();
  if (!role || !company) return true;
  if (sourceHistoryEntries(baseResume).some((source) => historyEntryCoversSource(experience, source))) return true;

  const lines = String(baseResume || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const supports = (line) => lineContainsHistoryField(line, role, "role")
    && lineContainsHistoryField(line, company, "company")
    && (!dates || lineContainsEmploymentDates(line, dates));

  if (lines.some(supports)) return true;
  if (!dates) return false;

  // Some parsers put title, employer, and dates on two or three consecutive
  // lines. Permit that layout, but reject windows containing an extra year;
  // an extra date normally means two adjacent jobs were accidentally combined.
  for (let start = 0; start < lines.length; start += 1) {
    for (let width = 2; width <= 3 && start + width <= lines.length; width += 1) {
      if (supports(lines.slice(start, start + width).join(" "))) return true;
    }
  }
  return false;
}

const EMPLOYMENT_ROLE_HINT_PATTERN = /\b(?:architect|consultant|designer|manager|director|engineer|developer|analyst|administrator|coordinator|specialist|lead|supervisor|officer|advisor|adviser|technician|representative|associate|intern|president|principal|owner|founder)\b/i;
const EMPLOYMENT_DATE_RANGE_PATTERN = /\b(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+)?(?:19|20)\d{2}\s*(?:-|–|—|to)\s*(?:(?:(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\.?\s+)?(?:19|20)\d{2}|present|current)\b/i;
const EMPLOYMENT_SINGLE_YEAR_PATTERN = /\b(?:19|20)\d{2}\b\s*$/i;

function cleanHistorySourcePart(value) {
  return String(value || "")
    .replace(/^[\s|•·—–-]+|[\s|•·—–-]+$/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function sourceHistoryEntries(baseResume) {
  const lines = String(baseResume || "")
    .split(/\r?\n/)
    .map((line) => line.replace(/^[\s•*-]+/, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const entries = [];
  const grouped = new Map();
  const employerHeadings = new Set();
  let employer = null;
  const sectionHeading = /^(?:(?:professional|previous) experience|experience|employment|education|(?:professional )?(?:affiliations\/)?certifications?|(?:SAP )?training(?: and certification)?|languages?|language skills|security clearance|VERIFIED CANDIDATE NOTES)$|^\[CANDIDATE NOTE\b/i;
  const clientRole = (line) => {
    const match = String(line || "").match(/^(.{3,80}?)\s+at\s+(.+)$/i);
    return match && EMPLOYMENT_ROLE_HINT_PATTERN.test(match[1]) ? match : null;
  };
  // Explicit consulting groups have an employer heading followed by roles
  // "at" clients. The employer's dates apply only to its own undated roles.
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index];
    if (sectionHeading.test(line)) { employer = null; continue; }
    const range = line.match(EMPLOYMENT_DATE_RANGE_PATTERN) || line.match(/\b(?:19|20)\d{2}\b(?=\s*\)?$)/);
    const prefix = cleanHistorySourcePart((range ? line.slice(0, range.index) : line).replace(/[([]\s*$/, ""));
    if (clientRole(lines[index + 1]) && prefix.length < 110 && prefix.length > 1
        && !EMPLOYMENT_ROLE_HINT_PATTERN.test(prefix) && !/[.!?:]$/.test(prefix)
        && !/^(?:led|managed|owned|supported|prepared|provided|participated|contributed|delivered|designed|developed|configured|tested|integrated|oversaw|supervised|coordinated)\b/i.test(prefix)) {
      employer = { company: prefix.split(",")[0].trim(), dates: range?.[0] || "" };
      employerHeadings.add(index);
      continue;
    }
    const roleMatch = clientRole(line);
    if (roleMatch && employer && (range || employer.dates)) {
      grouped.set(index, { role: roleMatch[1].trim(), company: employer.company, dates: range?.[0] || employer.dates, sourceLine: line, headerIndex: index });
    } else if (range && !roleMatch && EMPLOYMENT_ROLE_HINT_PATTERN.test(prefix) && /[|—–]|\s-\s/.test(prefix)) {
      employer = null;
    }
  }

  let sectionKind = "";
  for (let index = 0; index < lines.length; index += 1) {
    sectionKind = resumeSectionKind(lines[index]) || sectionKind;
    if (grouped.has(index)) { entries.push(grouped.get(index)); continue; }
    if (employerHeadings.has(index)) continue;
    const line = lines[index];
    if (/^(?:led|managed|owned|supported|prepared|provided|participated|contributed|delivered|designed|developed|configured|tested|integrated|oversaw|supervised|coordinated)\b/i.test(line)) continue;
    const rangeMatch = line.match(EMPLOYMENT_DATE_RANGE_PATTERN);
    const singleYearMatch = rangeMatch ? null : line.match(EMPLOYMENT_SINGLE_YEAR_PATTERN);
    const dateMatch = rangeMatch || singleYearMatch;
    if (!dateMatch) continue;

    const dates = dateMatch[0];
    const prefix = cleanHistorySourcePart(line.slice(0, dateMatch.index).replace(/[([]\s*$/, ""));
    const suffix = cleanHistorySourcePart(line.slice(dateMatch.index + dates.length).replace(/^[)\]]\s*/, ""));
    const parts = prefix
      .split(/\s*[|•·—–]\s*|\s+-\s+|\s+at\s+/i)
      .map(cleanHistorySourcePart)
      .filter(Boolean);
    let role = "";
    let company = "";

    if (parts.length >= 2 && (EMPLOYMENT_ROLE_HINT_PATTERN.test(parts[0]) || (sectionKind === "experience" && !EMPLOYMENT_ROLE_HINT_PATTERN.test(parts[1]) && /\s[-–—]\s/.test(prefix) && parts[0].length <= 80 && !/[.!?]$/.test(parts[0])))) {
      [role, company] = parts;
    } else if (parts.length >= 2 && EMPLOYMENT_ROLE_HINT_PATTERN.test(parts[1])) {
      [company, role] = parts;
    } else if (!prefix && suffix) {
      const afterDate = suffix.split(/\s*[|•·—–]\s*|\s+-\s+|\s+at\s+/i).filter(Boolean);
      if (afterDate.length >= 2 && EMPLOYMENT_ROLE_HINT_PATTERN.test(afterDate[0])) [role, company] = afterDate;
      else if (afterDate.length >= 2 && EMPLOYMENT_ROLE_HINT_PATTERN.test(afterDate[1])) [company, role] = afterDate;
    } else if (parts.length === 1 && EMPLOYMENT_ROLE_HINT_PATTERN.test(parts[0]) && index > 0
        && lines[index - 1].length < 120 && !EMPLOYMENT_DATE_RANGE_PATTERN.test(lines[index - 1])
        && !/^(?:professional experience|experience|employment)$/i.test(lines[index - 1])) {
      role = parts[0];
      company = cleanHistorySourcePart(lines[index - 1]);
    } else if (parts.length === 1 && index > 0 && EMPLOYMENT_ROLE_HINT_PATTERN.test(lines[index - 1])) {
      role = cleanHistorySourcePart(lines[index - 1]);
      company = parts[0];
    } else if (!parts.length && index > 1 && EMPLOYMENT_ROLE_HINT_PATTERN.test(lines[index - 1]) && !EMPLOYMENT_ROLE_HINT_PATTERN.test(lines[index - 2])) {
      role = cleanHistorySourcePart(lines[index - 1]);
      company = cleanHistorySourcePart(lines[index - 2]);
    } else if (!parts.length && index > 1 && EMPLOYMENT_ROLE_HINT_PATTERN.test(lines[index - 2])) {
      role = cleanHistorySourcePart(lines[index - 2]);
      company = cleanHistorySourcePart(lines[index - 1]);
    }

    // A single year is common for short engagements, but it is too ambiguous
    // to treat as employment unless the same line contains a clear job header.
    if (!role || !company || (singleYearMatch && parts.length < 2)) continue;
    entries.push({ role, company, dates, sourceLine: line, headerIndex: index });
  }
  const boundaries = [...entries.map((entry) => entry.headerIndex), ...employerHeadings,
    ...lines.flatMap((line, index) => sectionHeading.test(line) ? [index] : [])].sort((a, b) => a - b);
  const unique = new Map();
  for (const entry of entries) {
    const key = [entry.role, entry.company, entry.dates].map(normalized).join("|");
    const sourceRange = { start: entry.headerIndex, end: boundaries.find((index) => index > entry.headerIndex) ?? lines.length };
    if (unique.has(key)) unique.get(key).sourceRanges.push(sourceRange);
    else unique.set(key, { ...entry, sourceRanges: [sourceRange] });
  }
  return [...unique.values()];
}

function roleEquivalent(candidate, source) {
  return historyFieldSupported(candidate, source, "role")
    && historyFieldSupported(source, candidate, "role");
}

function historyEntryCoversSource(candidate, source) {
  return roleEquivalent(String(candidate?.role || ""), source.role)
    && historyFieldSupported(String(candidate?.company || ""), source.company, "company")
    && lineContainsEmploymentDates(String(candidate?.dates || ""), source.dates);
}

function missingSourceHistory(resumeData, baseResume) {
  const output = Array.isArray(resumeData?.experience) ? resumeData.experience : [];
  return sourceHistoryEntries(baseResume)
    .filter((source) => !output.some((candidate) => historyEntryCoversSource(candidate, source)))
    .map(({ role, company, dates, sourceLine }) => ({ role, company, dates, sourceLine }));
}

export function restoreEmptyHistoryFromSource(resumeData, baseResume) {
  const headers = sourceHistoryEntries(baseResume);
  const lines = String(baseResume || "").split(/\r?\n/).map((line) => line.replace(/^[\s•*-]+/, "").replace(/\s+/g, " ").trim()).filter(Boolean);
  const factualOpening = /^(?:led|managed|owned|supported|prepared|provided|participated|contributed|delivered|designed|developed|configured|tested|integrated|oversaw|supervised|coordinated|drove|defined|created|performed|monitored|trained|assisted)\b/i;
  return { ...resumeData, experience: (resumeData?.experience || []).map((entry) => {
    if ((entry.bullets || []).some((bullet) => String(bullet || "").trim())) return entry;
    const header = headers.find((source) => historyEntryCoversSource(entry, source));
    const statement = header?.sourceRanges.flatMap(({ start, end }) => lines.slice(start + 1, end))
      .find((line) => line.length >= 20 && line.length <= 500 && factualOpening.test(line));
    return statement ? { ...entry, bullets: [statement] } : entry;
  }) };
}

function numericClaims(value) {
  return [...String(value || "").matchAll(/(?:[$€£]\s*)?\b\d[\d,]*(?:\.\d+)?(?:\s*%|\+)?/g)]
    .map((match) => match[0].replace(/\s+/g, "").toLowerCase());
}

function textValues(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(textValues);
  if (value && typeof value === "object") return Object.values(value).flatMap(textValues);
  return [];
}

function exportedResumeValues(resumeData) {
  const resume = resumeData || {};
  return textValues({
    name: resume.name,
    title: resume.title,
    contact: resume.contact,
    profile: resume.profile,
    skills: resume.skills,
    projects: resume.projects,
    training: resume.training,
    experience: resume.experience,
    education: resume.education,
    languages: resume.languages,
    certifications: resume.certifications,
    safety_record: resume.safety_record,
    safety_certifications: resume.safety_certifications,
  });
}


export function missingSourceQualifications(resumeData, baseResume) {
  const output = normalized(textValues({ education: resumeData?.education, certifications: resumeData?.certifications, training: resumeData?.training }).join(" "));
  let section = "";
  const missing = [];
  for (const raw of String(baseResume || "").split(/\r?\n/)) {
    const line = raw.replace(/^[\s•*-]+/, "").trim();
    if (/^(?:education|academic (?:background|qualifications)|certifications?|professional (?:affiliations\/)?certifications?)$/i.test(line)) { section = line; continue; }
    if (/^(?:SAP )?Training and Certification$/i.test(line)) { section = ""; continue; }
    if (/^(?:professional (?:experience|training)|experience|employment|training|skills|languages|projects|references)$/i.test(line)) { section = ""; continue; }
    if (!section || !/\b(?:bachelor|master|doctorate|phd|diploma|associate|certified|certification|PMP)\b/i.test(line) || line.length > 220) continue;
    const terms = normalized(line).split(" ").filter((word) => word.length > 2 && !["the", "and", "with", "from"].includes(word));
    if (terms.length >= 2 && !terms.every((word) => output.split(" ").includes(word))) missing.push({ section, source: line });
  }
  return missing;
}

function endYear(value) {
  const text = String(value || "").toLowerCase();
  if (/present|current|now|ongoing/.test(text)) return Number.POSITIVE_INFINITY;
  const years = [...text.matchAll(/\b(?:19|20)\d{2}\b/g)].map((match) => Number(match[0]));
  return years.length ? Math.max(...years) : null;
}

function isCurrent(value) {
  return /present|current|now|ongoing/i.test(String(value || ""));
}

function stableChronologicalSort(experience) {
  return experience
    .map((entry, index) => ({ entry, index, score: endYear(entry?.dates) }))
    .sort((a, b) => {
      if (a.score === null && b.score === null) return a.index - b.index;
      if (a.score === null) return 1;
      if (b.score === null) return -1;
      return b.score - a.score || a.index - b.index;
    })
    .map(({ entry }) => entry);
}

export function enforceReverseChronology(resumeData) {
  return {
    ...resumeData,
    experience: stableChronologicalSort(Array.isArray(resumeData?.experience) ? resumeData.experience : []),
  };
}

const CHANGE_STOPWORDS = new Set([
  "a", "an", "and", "as", "at", "by", "for", "from", "in", "into", "of", "on", "or", "the", "to", "with",
  "worked", "work", "responsible", "including", "using", "supported", "provided",
]);

const PROVENANCE_STOPWORDS = new Set([
  ...CHANGE_STOPWORDS,
  "across", "also", "candidate", "company", "experience", "project", "projects", "role", "sap", "system", "systems", "team", "teams",
  "authored", "built", "collaborated", "configured", "contributed", "coordinated", "created", "defined", "delivered", "designed", "developed",
  "directed", "implemented", "integrated", "led", "managed", "oversaw", "participated", "performed", "prepared", "supported", "tested",
]);

const REQUIREMENT_LINK_STOPWORDS = new Set([
  ...CHANGE_STOPWORDS,
  "capability", "capabilities", "configure", "configuration", "documents", "expertise", "good", "implementation",
  "integration", "integrated", "knowledge", "module", "modules", "preparing", "process", "processes", "required",
  "setting", "strong", "support", "supporting", "testing", "understanding", "experience",
]);

const OWNERSHIP_RANK = Object.freeze({
  assist: 1, assisted: 1, help: 1, helped: 1, support: 1, supported: 1, participate: 1, participated: 1,
  collaborate: 2, collaborated: 2, contribute: 2, contributed: 2, coordinate: 2, coordinated: 2,
  author: 3, authored: 3, create: 3, created: 3, define: 3, defined: 3, deliver: 3, delivered: 3,
  design: 3, designed: 3, implement: 3, implemented: 3, own: 3, owned: 3, perform: 3, performed: 3,
  direct: 4, directed: 4, drive: 4, drove: 4, lead: 4, led: 4, manage: 4, managed: 4, oversee: 4, oversaw: 4,
});

function changeTokens(value) {
  return new Set(normalized(value).split(" ").filter((token) => token.length > 2 && !CHANGE_STOPWORDS.has(token)));
}

function changeSimilarity(left, right) {
  const leftText = normalized(left);
  const rightText = normalized(right);
  if (!leftText || !rightText) return 0;
  if (leftText === rightText) return 1;
  if (leftText.includes(rightText) || rightText.includes(leftText)) return 0.92;
  const leftTokens = changeTokens(leftText);
  const rightTokens = changeTokens(rightText);
  const denominator = Math.min(leftTokens.size, rightTokens.size);
  if (denominator < 3) return 0;
  const overlap = [...leftTokens].filter((token) => rightTokens.has(token)).length;
  return overlap / denominator;
}

function provenanceTokens(value) {
  return new Set(normalized(value).split(" ").filter((token) => token.length > 2 && !PROVENANCE_STOPWORDS.has(token)));
}

function sourceContribution(sourceTokens, coveredTokens, proposedTokens) {
  return [...sourceTokens].filter((token) => proposedTokens.has(token) && !coveredTokens.has(token));
}

function firstActionVerb(value) {
  if (/^(?:I\s+)?(?:was\s+)?responsible for\b/i.test(String(value).trim())) return "owned";
  if (/^(?:participated|served) as (?:the )?(?:team )?lead\b/i.test(String(value).trim())) return "led";
  return normalized(value).replace(/^i /, "").split(" ").find(Boolean) || "";
}

function unsupportedOwnershipStrengthening(proposed, citations) {
  const proposedRank = OWNERSHIP_RANK[firstActionVerb(proposed)] || 0;
  if (proposedRank < 3 || !citations.length) return null;
  const sourceRanks = citations.map((citation) => OWNERSHIP_RANK[firstActionVerb(citation.excerpt)] || 0);
  const strongestSource = Math.max(0, ...sourceRanks);
  if (strongestSource >= proposedRank) return null;
  return {
    proposed_verb: firstActionVerb(proposed),
    strongest_source_verb: citations.map((citation) => firstActionVerb(citation.excerpt)).find((verb) => (OWNERSHIP_RANK[verb] || 0) === strongestSource) || "unspecified",
  };
}

function resumeEvidenceLines(baseResume) {
  return String(baseResume || "").split(/\r?\n/).map((raw, index) => ({
    line_index: index + 1,
    excerpt: raw.replace(/^\s*(?:[-*•]|\d+[.)])\s*/, "").replace(/\s+/g, " ").trim(),
  })).filter(({ excerpt }) => excerpt.length >= 8 && !/^(?:profile|summary|skills|experience|professional experience|employment|projects|education|training|certifications|languages)$/i.test(excerpt));
}

function distinctiveRequirementOverlap(bullet, requirementText) {
  const bulletTokens = changeTokens(bullet);
  const requirementTokens = [...changeTokens(requirementText)]
    .filter((token) => !REQUIREMENT_LINK_STOPWORDS.has(token));
  const overlap = requirementTokens.filter((token) => bulletTokens.has(token));
  const minimum = requirementTokens.length <= 1 ? requirementTokens.length : 2;
  return { count: overlap.length, minimum, requirementTokenCount: requirementTokens.length };
}

function bestRequirementForBullet(bullet, requirements = []) {
  return requirements.map((requirement) => {
    if (!requirementEvidenceBoundary(requirement.requirement, bullet).valid) return null;
    const requirementScore = changeSimilarity(bullet, requirement.requirement);
    const evidenceScore = Math.max(0, ...((requirement.evidence || []).map((citation) => changeSimilarity(bullet, citation.excerpt))));
    const distinctive = distinctiveRequirementOverlap(bullet, requirement.requirement);
    return { requirement, requirementScore, score: Math.max(requirementScore, evidenceScore * 0.6), distinctive };
  }).filter(Boolean).filter(({ score, requirementScore, distinctive }) => (
    distinctive.requirementTokenCount > 0
    && distinctive.count >= distinctive.minimum
    && score >= 0.28
    && requirementScore >= 0.16
  ))
    .sort((left, right) => right.score - left.score)[0] || null;
}

function citationsForBullet(proposed, requirement, sourceLines) {
  const proposedTokens = provenanceTokens(proposed);
  const candidates = [];
  for (const citation of requirement?.evidence || []) {
    if (!citation?.excerpt) continue;
    // Historical bullets must be grounded in their own engagement, never a
    // generic capability checkbox or a similarly worded role elsewhere.
    if (citation.source === "candidate_note" || !sourceLines.some((line) => normalized(line.excerpt).includes(normalized(citation.excerpt)))) continue;
    candidates.push({
      source: citation.source || "base_resume",
      section: citation.section || "base resume",
      line_index: citation.line_index || null,
      excerpt: citation.excerpt,
      score: changeSimilarity(proposed, citation.excerpt),
    });
  }
  for (const source of sourceLines) candidates.push({ ...source, source: "base_resume", section: "base resume", score: changeSimilarity(proposed, source.excerpt) });
  candidates.sort((left, right) => right.score - left.score || (left.line_index || 0) - (right.line_index || 0));

  const selected = [];
  const selectedKeys = new Set();
  const coveredTokens = new Set();
  for (const candidate of candidates) {
    if (candidate.score < 0.22 || selected.length >= 4) continue;
    const key = `${candidate.source}|${candidate.line_index || ""}|${normalized(candidate.excerpt)}`;
    if (selectedKeys.has(key)) continue;
    const candidateTokens = provenanceTokens(candidate.excerpt);
    const contribution = sourceContribution(candidateTokens, coveredTokens, proposedTokens);
    if (selected.length && contribution.length < 2) continue;
    selectedKeys.add(key);
    selected.push({
      source: candidate.source,
      section: candidate.section,
      line_index: candidate.line_index,
      excerpt: candidate.excerpt,
    });
    for (const token of candidateTokens) if (proposedTokens.has(token)) coveredTokens.add(token);
  }
  const uncoveredTerms = [...proposedTokens].filter((token) => !coveredTokens.has(token));
  const coverage = proposedTokens.size ? coveredTokens.size / proposedTokens.size : selected.length ? 1 : 0;
  return { citations: selected, coverage, uncoveredTerms };
}

export function buildTailoringChangeLedger(resumeData, baseResume, analysis = {}) {
  const sourceLines = resumeEvidenceLines(baseResume);
  const headers = sourceHistoryEntries(baseResume);
  const nonemptyLines = String(baseResume || "").split(/\r?\n/).map((line, index) => ({ text: line.replace(/^[\s•*-]+/, "").replace(/\s+/g, " ").trim(), index })).filter((line) => line.text);
  const requirements = Array.isArray(analysis?.requirements) ? analysis.requirements : [];
  const changes = [];

  for (const [experienceIndex, experience] of (resumeData?.experience || []).entries()) {
    const roleHeaders = headers.filter((entry) => roleEquivalent(String(experience?.role || ""), entry.role));
    const header = headers.find((entry) => historyEntryCoversSource(experience, entry)) || (!experience.company && !experience.dates && roleHeaders.length === 1 ? roleHeaders[0] : null);
    const nextHeader = header && headers.find((entry) => entry.headerIndex > header.headerIndex);
    const startLine = header ? nonemptyLines[header.headerIndex]?.index + 1 : null;
    const endLine = nextHeader ? nonemptyLines[nextHeader.headerIndex]?.index + 1 : Infinity;
    const sectionEndIndex = header ? nonemptyLines.find((line) => line.index + 1 > startLine && /^(?:education|professional training|training|certifications?|languages?|VERIFIED CANDIDATE NOTES|\[CANDIDATE NOTE)/i.test(line.text))?.index : null;
    const sectionEnd = sectionEndIndex == null ? null : sectionEndIndex + 1;
    const sourceRanges = header?.sourceRanges?.map(({ start, end }) => ({ start: nonemptyLines[start]?.index + 1, end: nonemptyLines[end]?.index + 1 || Infinity }));
    const scopedLines = header ? sourceLines.filter((line) => sourceRanges?.length
      ? sourceRanges.some((range) => line.line_index > range.start && line.line_index < range.end)
      : line.line_index > startLine && line.line_index < Math.min(endLine, sectionEnd || Infinity)) : headers.length ? [] : sourceLines;
    for (const [bulletIndex, proposedValue] of (experience?.bullets || []).entries()) {
      const proposed = String(proposedValue || "").replace(/\s+/g, " ").trim();
      if (!proposed) continue;
      const requirementMatch = bestRequirementForBullet(proposed, requirements);
      const requirement = requirementMatch?.requirement || null;
      const provenance = citationsForBullet(proposed, requirement, scopedLines);
      const bestSource = provenance.citations[0] || null;
      const original = bestSource?.excerpt || "";
      const exact = normalized(original) === normalized(proposed);
      const changeType = exact
        ? "retained"
        : provenance.citations.length > 1
          ? "synthesized"
        : proposed.length < original.length * 0.72
          ? "condensed"
          : requirement
            ? "repositioned"
            : "rephrased";
      const ownershipStrengthening = exact ? null : unsupportedOwnershipStrengthening(proposed, provenance.citations);
      const meaningIssues = claimMeaningIssues(proposed, provenance.citations);
      const citationComplete = !meaningIssues.length && (exact || Boolean(provenance.citations.length && provenance.coverage >= 0.5 && !ownershipStrengthening));
      const boundary = requirement ? requirementEvidenceBoundary(requirement.requirement, proposed) : null;
      const reason = exact
        ? "Retains the source wording."
        : meaningIssues.length ? meaningIssues.join(" ")
        : citationComplete && changeType === "synthesized"
          ? `Combines ${provenance.citations.length} source statements${header ? ` from ${header.role} at ${header.company}` : ""}. Review the combined scope and contribution. ${boundary?.reason || ""}`.trim()
        : requirement && citationComplete
          ? `Emphasizes experience relevant to “${requirement.requirement}”. ${boundary?.reason || "Review the cited scope and responsibility level."}`
          : citationComplete
            ? "Rephrases the cited source. Review the wording and responsibility level."
            : "This wording needs evidence review before it can be treated as verified.";
      changes.push({
        id: `experience-${experienceIndex}-bullet-${bulletIndex}`,
        section: "experience",
        role: String(experience?.role || "Experience").slice(0, 160),
        experience_index: experienceIndex,
        bullet_index: bulletIndex,
        original,
        restorable_original: Boolean(header && provenance.citations.length === 1),
        source_role: header ? `${header.role} | ${header.company} | ${header.dates}` : "",
        proposed,
        change_type: changeType,
        reason,
        requirement_id: requirement?.id || null,
        requirement: requirement?.requirement || "",
        evidence_citations: provenance.citations,
        citation_coverage: Number(provenance.coverage.toFixed(3)),
        citation_complete: citationComplete,
        unsupported_strengthening: ownershipStrengthening,
        meaning_issues: meaningIssues,
        uncovered_terms: provenance.uncoveredTerms.slice(0, 12),
      });
    }
  }
  return changes.slice(0, 60);
}

function requirementConsistencyReview(analysis = null) {
  const requirements = Array.isArray(analysis?.requirements) ? analysis.requirements : [];
  if (!analysis || requirements.length === 0) {
    return {
      status: "pass",
      issue_count: 0,
      issues: [],
      canonical_total: requirements.length,
      required_total: 0,
    };
  }
  const actual = { direct: 0, adjacent: 0, transferable: 0, missing: 0 };
  for (const requirement of requirements) {
    if (Object.hasOwn(actual, requirement?.evidence_match)) actual[requirement.evidence_match] += 1;
  }
  const supplied = analysis?.coverage;
  const required = requirements.filter((requirement) => requirement?.priority === "required");
  const actualRequired = { direct: 0, adjacent: 0, transferable: 0, missing: 0 };
  for (const requirement of required) {
    if (Object.hasOwn(actualRequired, requirement?.evidence_match)) actualRequired[requirement.evidence_match] += 1;
  }
  const suppliedRequired = analysis?.core_coverage;
  const issues = [];
  for (const key of Object.keys(actual)) {
    if (supplied && Number(supplied[key] || 0) !== actual[key]) issues.push(`coverage_${key}_mismatch`);
    if (suppliedRequired && Number(suppliedRequired[key] || 0) !== actualRequired[key]) issues.push(`required_${key}_mismatch`);
  }
  if (suppliedRequired && Number(suppliedRequired.total || 0) !== required.length) issues.push("required_total_mismatch");
  if (new Set(requirements.map((requirement) => requirement?.id)).size !== requirements.length) issues.push("duplicate_requirement_id");
  if (analysis?.requirement_consistency?.status === "blocked") issues.push(...(analysis.requirement_consistency.issues || []));
  return {
    status: issues.length ? "blocked" : "pass",
    issue_count: [...new Set(issues)].length,
    issues: [...new Set(issues)],
    canonical_total: requirements.length,
    required_total: required.length,
  };
}

export function buildAtsReview(resumeData, baseResume, jobBrief, options = {}) {
  const base = String(baseResume || "");
  const historyBase = String(options.historyEvidence || baseResume || "");
  const allowedNumbers = new Set(numericClaims(base));
  const unsupported_metrics = [];
  const unsupported_history = [];
  const missing_history = missingSourceHistory(resumeData, historyBase);
  const missing_qualifications = missingSourceQualifications(resumeData, historyBase);

  const unsupportedClaims = [...new Set(exportedResumeValues(resumeData).flatMap(numericClaims).filter((claim) => !allowedNumbers.has(claim)))];
  unsupported_metrics.push(...unsupportedClaims.map((claim) => ({ claim })));

  for (const [experienceIndex, experience] of (resumeData.experience || []).entries()) {
    const role = String(experience?.role || "").trim();
    const company = String(experience?.company || "").trim();
    const dates = String(experience?.dates || "").trim();

    const roleSupported = !role || historyFieldSupported(role, historyBase, "role");
    const companySupported = !company || historyFieldSupported(company, historyBase, "company");
    const datesSupported = !dates || dateFieldSupported(dates, historyBase);

    if (!roleSupported) {
      unsupported_history.push({ field: "role", value: role, experienceIndex });
    }
    if (!companySupported) {
      unsupported_history.push({ field: "company", value: company, experienceIndex });
    }
    if (!datesSupported) {
      unsupported_history.push({ field: "dates", value: dates, experienceIndex });
    }
    if (roleSupported && companySupported && datesSupported
      && !historyEntryAssociationSupported(experience, historyBase)) {
      unsupported_history.push({
        field: "association",
        value: [role, company, dates].filter(Boolean).join(" | "),
        experienceIndex,
      });
    }

  }

  const writingReview = buildWritingReview(resumeData, baseResume, options);
  const tailoringChanges = buildTailoringChangeLedger(resumeData, historyBase, options.analysis);
  const provenance_issues = (options.analysis ? tailoringChanges : []).filter((change) => (
    change.change_type !== "retained" && change.citation_complete !== true
  )).map((change) => ({
    id: change.id,
    experience_index: change.experience_index,
    bullet_index: change.bullet_index,
    original: change.original,
    proposed: change.proposed,
    issue_type: change.meaning_issues?.length ? "meaning_changed" : change.unsupported_strengthening ? "unsupported_strengthening" : "incomplete_citation",
    unsupported_strengthening: change.unsupported_strengthening,
    restorable_original: change.restorable_original,
    meaning_issues: change.meaning_issues,
    uncovered_terms: change.uncovered_terms,
    evidence_citations: change.evidence_citations,
  }));
  const requirementConsistency = requirementConsistencyReview(options.analysis);
  const verb_issues = writingReview.issues
    .filter((issue) => ["weak_opener", "imprecise_verb", "unrecognized_opener", "contribution_level"].includes(issue.issue_type))
    .map((issue) => ({ experienceIndex: issue.experience_index, bulletIndex: issue.bullet_index, opening: issue.original.match(/^[A-Za-z]+/)?.[0]?.toLowerCase() || "missing" }));
  const tense_issues = writingReview.issues
    .filter((issue) => issue.issue_type === "tense")
    .map((issue) => ({ experienceIndex: issue.experience_index, bulletIndex: issue.bullet_index, expected: /past tense/i.test(issue.explanation) ? "past" : "present" }));

  const years = (resumeData.experience || []).map((entry) => endYear(entry?.dates)).filter((year) => year !== null);
  const reverse_chronological = years.every((year, index) => index === 0 || years[index - 1] >= year);
  const searchableOutput = normalized(resumeDataToPlainText(resumeData));
  const keywords = [...new Set((jobBrief?.keywords || []).map((keyword) => String(keyword).trim()).filter(Boolean))];
  const matched_keywords = keywords.filter((keyword) => searchableOutput.includes(normalized(keyword)));
  const missing_keywords = keywords.filter((keyword) => !searchableOutput.includes(normalized(keyword)));

  const semantic = options.analysis
    ? findSemanticIntegrityIssues(
      resumeData,
      baseResume,
      options.analysis,
      options.targetTitle,
      { isTrades: options.isTrades },
    )
    : {
      unsupported_skills: [],
      unsupported_projects: [],
      unsupported_training: [],
      unsupported_target_terms: [],
      unsupported_positioning: [],
      risky_claims: [],
    };

  let score = 100;
  score -= Math.min(50, unsupported_metrics.length * 20);
  score -= Math.min(40, unsupported_history.length * 15);
  score -= Math.min(40, missing_history.length * 15);
  score -= Math.min(20, verb_issues.length * 4);
  score -= Math.min(16, tense_issues.length * 4);
  if (!reverse_chronological) score -= 10;
  if (keywords.length) score -= Math.round((missing_keywords.length / keywords.length) * 15);
  score = Math.max(0, Math.min(100, score));

  const integrityBlocked = Boolean(
    unsupported_metrics.length
      || unsupported_history.length
      || missing_history.length
      || missing_qualifications.length
      || semantic.unsupported_skills.length
      || semantic.unsupported_projects.length
      || semantic.unsupported_training.length
      || semantic.unsupported_target_terms.length
      || semantic.unsupported_positioning.length
      || semantic.risky_claims.length
      || provenance_issues.length
      || requirementConsistency.status === "blocked"
  );
  const writingScore = Math.max(0, 100
    - Math.min(20, verb_issues.length * 4)
    - Math.min(16, tense_issues.length * 4));
  const writingStatus = writingReview.status;
  const identityMissing = isPlaceholderIdentity(resumeData?.name);
  const postingAssessment = options.postingAssessment || options.analysis?.posting_assessment || {
    status: "unverified",
    reason: "The posting was not independently assessed.",
    fit_allowed: false,
    application_ready_allowed: false,
  };
  const assessmentVerified = postingAssessment.status === "complete"
    && postingAssessment.fit_allowed === true
    && postingAssessment.application_ready_allowed === true;
  const postingReadiness = options.analysis?.posting_readiness || {
    status: assessmentVerified ? "reviewed_complete" : "needs_full_posting",
    reason: postingAssessment.reason,
    description_status: postingAssessment.status,
    fit_allowed: assessmentVerified,
    application_ready_allowed: assessmentVerified,
    confidence: assessmentVerified ? "available" : "unavailable",
    output_mode: assessmentVerified ? "final_candidate" : "preliminary",
  };
  const postingVerified = postingReadiness.status === "reviewed_complete"
    && postingReadiness.fit_allowed === true
    && postingReadiness.application_ready_allowed === true;
  const coverage = options.analysis?.coverage || {
    direct: 0,
    adjacent: 0,
    transferable: 0,
    missing: 0,
  };
  const coverageTotal = ["direct", "adjacent", "transferable", "missing"]
    .reduce((total, key) => total + Number(coverage[key] || 0), 0);
  const requirementCount = Array.isArray(options.analysis?.requirements) ? options.analysis.requirements.length : 0;
  const requirementAnalysisReady = requirementCount > 0
    && coverageTotal > 0
    && requirementCount === coverageTotal
    && requirementConsistency.status === "pass";
  const verifiedBlockerCount = Number(options.analysis?.gap_summary?.counts?.verified_blocker || 0);
  const readiness = options.analysis?.readiness || {
    status: integrityBlocked ? "significant_gap" : "credible_stretch",
    reason: "Application readiness requires a complete requirement-to-evidence analysis.",
  };
  const fitReady = !["significant_gap", "needs_full_posting"].includes(readiness.status)
    && verifiedBlockerCount === 0;
  const writingBlocked = writingReview.blocking_issue_count > 0;
  const status = integrityBlocked || writingBlocked
    ? "blocked"
    : writingStatus === "review" || !postingVerified || !requirementAnalysisReady || !fitReady
      ? "review"
      : "ready";
  const applicationReady = Boolean(
    postingVerified
      && !integrityBlocked
      && !identityMissing
      && requirementAnalysisReady
      && reverse_chronological
      && !writingBlocked
      && fitReady
  );

  const focusReview = options.focusReview || {
    status: "not_available",
    target_length: "one_to_two_pages",
    estimated_pages: null,
    included_experience_ids: [],
    condensed_experience: [],
    omitted_bullets: [],
    omitted_experience: [],
    duplicate_groups: [],
    rationale: "A deterministic focus review was not supplied.",
  };

  const exportReadiness = {
    status: applicationReady ? "ready" : "preliminary",
    application_ready: applicationReady,
    blockers: [
      ...(postingVerified ? [] : ["posting_readiness"]),
      ...(requirementAnalysisReady ? [] : ["requirement_analysis"]),
      ...(fitReady ? [] : ["candidate_fit"]),
      ...(integrityBlocked ? ["evidence_integrity"] : []),
      ...(writingBlocked ? ["contribution_language"] : []),
      ...(identityMissing ? ["candidate_identity"] : []),
      ...(!reverse_chronological ? ["chronology"] : []),
    ],
    consistency: "Screen preview, copied text, DOCX, and ATS-safe PDF use the same validated tailored résumé data.",
  };

  return {
    score,
    status,
    reverse_chronological,
    unsupported_metrics,
    unsupported_history,
    missing_history,
    missing_qualifications,
    unsupported_skills: semantic.unsupported_skills,
    unsupported_projects: semantic.unsupported_projects,
    unsupported_training: semantic.unsupported_training,
    unsupported_target_terms: semantic.unsupported_target_terms,
    unsupported_positioning: semantic.unsupported_positioning,
    risky_claims: semantic.risky_claims,
    provenance_issues,
    requirement_consistency: requirementConsistency,
    verb_issues,
    tense_issues,
    matched_keywords,
    missing_keywords,
    integrity: {
      status: integrityBlocked ? "blocked" : "pass",
      issue_count: unsupported_metrics.length
        + unsupported_history.length
        + missing_history.length
        + missing_qualifications.length
        + semantic.unsupported_skills.length
        + semantic.unsupported_projects.length
        + semantic.unsupported_training.length
        + semantic.unsupported_target_terms.length
        + semantic.unsupported_positioning.length
        + semantic.risky_claims.length
        + provenance_issues.length
        + requirementConsistency.issue_count,
    },
    posting: postingAssessment,
    posting_readiness: postingReadiness,
    candidate_fit: options.analysis?.candidate_fit || {
      status: postingReadiness.fit_allowed ? "not_available" : "not_assessed",
      confidence: postingReadiness.fit_allowed ? "low" : "unavailable",
      reason: postingReadiness.reason,
    },
    requirements: options.analysis?.requirements || [],
    gap_summary: options.analysis?.gap_summary || null,
    core_coverage: options.analysis?.core_coverage || null,
    requirement_summary: options.analysis?.requirement_summary || null,
    coverage: {
      ...coverage,
      total: coverageTotal,
      matched_keywords,
      missing_keywords,
    },
    parseability: {
      status: reverse_chronological ? "pass" : "review",
      checks: [
        "Reverse-chronological work history",
        "Single-column ATS-safe export",
        "Standard section headings",
      ],
    },
    writing: {
      status: writingStatus,
      score: writingScore,
      issue_count: writingReview.issue_count,
    },
    writing_review: writingReview,
    tailoring_changes: tailoringChanges,
    focus_review: focusReview,
    export_readiness: exportReadiness,
    identity: {
      status: identityMissing ? "missing" : "complete",
      reason: identityMissing
        ? "A real candidate name is required before export; placeholders are never inserted."
        : "Candidate name is present.",
    },
    application_ready: applicationReady,
    output_mode: applicationReady ? "final" : "preliminary",
    readiness,
    missing_evidence: options.analysis?.missing_evidence || [],
    candidate_questions: options.analysis?.candidate_questions || [],
    evidence_questions: options.analysis?.evidence_questions || [],
    disclaimer: "This evaluates evidence integrity, requirement coverage, writing, and parseability separately. No résumé can guarantee an ATS result or interview.",
  };
}
