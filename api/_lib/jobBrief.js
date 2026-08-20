import { normalizeListingCategory } from "../../src/listingCategories.js";

const VALID_CATEGORIES = new Set([
  "tech", "design", "writing", "marketing", "sales", "admin",
  "customer_service", "business", "finance", "trades", "home_services",
  "logistics", "hospitality", "care", "other",
]);

function cleanString(value, maxLength) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanParagraph(value, maxLength) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, maxLength);
}

function cleanList(value, { maxItems = 30, maxItemLength = 500 } = {}) {
  if (!Array.isArray(value)) return [];
  const seen = new Set();
  const result = [];
  for (const item of value) {
    const cleaned = cleanString(item, maxItemLength);
    const key = cleaned.toLowerCase();
    if (!cleaned || seen.has(key)) continue;
    seen.add(key);
    result.push(cleaned);
    if (result.length >= maxItems) break;
  }
  return result;
}

function cleanSourceUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value.trim());
    if (url.protocol !== "https:") return "";
    url.username = "";
    url.password = "";
    return url.toString().slice(0, 2000);
  } catch {
    return "";
  }
}

export function normalizeCustomJobBrief(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const title = cleanString(value.title, 180);
  const description = cleanParagraph(value.description, 16000);
  if (!title || !description) return null;

  const proposedCategory = cleanString(value.category, 40).toLowerCase();
  const category = VALID_CATEGORIES.has(proposedCategory)
    ? proposedCategory
    : normalizeListingCategory(title, proposedCategory || "other");

  return {
    title,
    company: cleanString(value.company, 180),
    location: cleanString(value.location, 180),
    type: cleanString(value.type || value.job_type, 80) || "Unlabeled",
    category: VALID_CATEGORIES.has(category) ? category : "other",
    description,
    responsibilities: cleanList(value.responsibilities),
    required_qualifications: cleanList(value.required_qualifications),
    preferred_qualifications: cleanList(value.preferred_qualifications),
    keywords: cleanList(value.keywords, { maxItems: 40, maxItemLength: 100 }),
    source_url: cleanSourceUrl(value.source_url),
  };
}

export function jobBriefToText(brief) {
  const sections = [brief.description];
  const append = (heading, values) => {
    if (!values?.length) return;
    sections.push(`${heading}:\n${values.map((value) => `- ${value}`).join("\n")}`);
  };
  append("Responsibilities", brief.responsibilities);
  append("Required qualifications", brief.required_qualifications);
  append("Preferred qualifications", brief.preferred_qualifications);
  append("Keywords", brief.keywords);
  return sections.filter(Boolean).join("\n\n").slice(0, 24000);
}
