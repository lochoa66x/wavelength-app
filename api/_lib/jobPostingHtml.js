import { htmlToReadableText } from "./publicJobPage.js";

const GENERIC_COMPANIES = new Set(["", "unknown", "confidential", "not specified"]);
const STOP_WORDS = new Set(["a", "an", "and", "at", "for", "in", "of", "on", "the", "to", "with"]);

function clean(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function textValue(value) {
  if (Array.isArray(value)) return value.map(textValue).filter(Boolean).join("\n");
  if (value && typeof value === "object") return textValue(value.name || value.value || value.description || "");
  return clean(value);
}

function typeIncludesJobPosting(type) {
  const values = Array.isArray(type) ? type : [type];
  return values.some((value) => clean(value).toLowerCase() === "jobposting");
}

function collectJobPostings(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectJobPostings(item, output);
    return output;
  }
  if (!value || typeof value !== "object") return output;
  if (typeIncludesJobPosting(value["@type"])) output.push(value);
  for (const key of ["@graph", "mainEntity", "itemListElement"]) {
    if (value[key]) collectJobPostings(value[key], output);
  }
  return output;
}

function parseJsonLd(raw) {
  const normalized = String(raw || "")
    .replace(/^\s*<!--/, "")
    .replace(/-->\s*$/, "")
    .replace(/^\s*\/\/<!\[CDATA\[/, "")
    .replace(/\/\/\]\]>\s*$/, "")
    .trim()
    .replace(/;\s*$/, "");
  if (!normalized) return null;
  try {
    return JSON.parse(normalized);
  } catch {
    return null;
  }
}

function organizationName(value) {
  if (Array.isArray(value)) return organizationName(value[0]);
  if (value && typeof value === "object") return clean(value.name || value.legalName);
  return clean(value);
}

function postalAddress(value) {
  if (!value) return "";
  if (Array.isArray(value)) return value.map(postalAddress).filter(Boolean).join(" · ");
  const address = value.address && typeof value.address === "object" ? value.address : value;
  if (typeof address === "string") return clean(address);
  return [address.addressLocality, address.addressRegion, address.addressCountry?.name || address.addressCountry]
    .map(clean)
    .filter(Boolean)
    .join(", ");
}

export function normalizeJobPostingRecord(record) {
  if (!record || !typeIncludesJobPosting(record["@type"])) return null;
  const description = htmlToReadableText(textValue(record.description));
  return {
    title: clean(record.title || record.name),
    company: organizationName(record.hiringOrganization),
    location: postalAddress(record.jobLocation) || textValue(record.jobLocationType),
    employmentType: textValue(record.employmentType),
    description,
    responsibilities: htmlToReadableText(textValue(record.responsibilities)),
    qualifications: htmlToReadableText(textValue(record.qualifications || record.educationRequirements || record.experienceRequirements)),
    skills: htmlToReadableText(textValue(record.skills)),
    datePosted: clean(record.datePosted),
    validThrough: clean(record.validThrough),
  };
}

export function extractJobPostingsFromHtml(html) {
  const records = [];
  const scripts = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = scripts.exec(String(html || "")))) {
    if (!/\btype\s*=\s*(["'])application\/ld\+json(?:\s*;[^"']*)?\1/i.test(match[1])) continue;
    const parsed = parseJsonLd(match[2]);
    for (const record of collectJobPostings(parsed)) {
      const normalized = normalizeJobPostingRecord(record);
      if (normalized?.title && normalized.description) records.push(normalized);
    }
  }
  return records;
}

function tokens(value) {
  return new Set(clean(value).toLowerCase().match(/[\p{L}\p{N}+#.]{2,}/gu)?.filter((token) => !STOP_WORDS.has(token)) || []);
}

function tokenCoverage(expected, actual) {
  const expectedTokens = tokens(expected);
  if (!expectedTokens.size) return 0;
  const actualTokens = tokens(actual);
  let matches = 0;
  for (const token of expectedTokens) if (actualTokens.has(token)) matches += 1;
  return matches / expectedTokens.size;
}

export function scoreJobPostingMatch(posting, listing) {
  const expectedTitle = clean(listing?.title).toLowerCase();
  const actualTitle = clean(posting?.title).toLowerCase();
  const expectedCompany = clean(listing?.company).toLowerCase();
  const actualCompany = clean(posting?.company).toLowerCase();
  let score = 0;
  if (expectedTitle && actualTitle && expectedTitle === actualTitle) score += 8;
  else score += tokenCoverage(expectedTitle, actualTitle) * 6;
  if (!GENERIC_COMPANIES.has(expectedCompany)) {
    if (expectedCompany === actualCompany) score += 4;
    else score += tokenCoverage(expectedCompany, actualCompany) * 3;
  }
  return score;
}

export function selectMatchingJobPosting(postings, listing) {
  const ranked = (postings || [])
    .map((posting) => ({ posting, score: scoreJobPostingMatch(posting, listing) }))
    .sort((left, right) => right.score - left.score);
  const best = ranked[0];
  if (!best || best.score < 3.5) return null;
  return best.posting;
}

export function readablePageMatchesListing(pageText, listing) {
  const titleCoverage = tokenCoverage(listing?.title, pageText);
  const expectedCompany = clean(listing?.company).toLowerCase();
  const companyCoverage = GENERIC_COMPANIES.has(expectedCompany) ? 1 : tokenCoverage(expectedCompany, pageText);
  return titleCoverage >= 0.6 && companyCoverage >= 0.5;
}

export function composeJobPostingText(posting) {
  return [
    posting?.title && `Job title: ${posting.title}`,
    posting?.company && `Employer: ${posting.company}`,
    posting?.location && `Location: ${posting.location}`,
    posting?.employmentType && `Employment type: ${posting.employmentType}`,
    posting?.description,
    posting?.responsibilities && `Responsibilities:\n${posting.responsibilities}`,
    posting?.qualifications && `Qualifications:\n${posting.qualifications}`,
    posting?.skills && `Skills:\n${posting.skills}`,
  ].filter(Boolean).join("\n\n").trim();
}
