export const TECHNOLOGY_FIELD_LABEL = "Technology & IT";

export const CATEGORY_FIELDS = [
  { label: TECHNOLOGY_FIELD_LABEL, categories: ["tech"] },
  { label: "Design, media & content", categories: ["design", "writing"] },
  { label: "Marketing & sales", categories: ["marketing", "sales"] },
  { label: "Admin, customer service & virtual assistance", categories: ["admin", "customer_service"] },
  { label: "Business, operations & management", categories: ["business"] },
  { label: "Finance & accounting", categories: ["finance"] },
  { label: "Skilled trades", categories: ["trades"] },
  { label: "Home & outdoor services", categories: ["home_services"] },
  { label: "Delivery, logistics & general labour", categories: ["logistics"] },
  { label: "Hospitality, retail & events", categories: ["hospitality"] },
  { label: "Care, education & personal services", categories: ["care"] },
  { label: "Other", categories: ["other"] },
];

export const WORK_ARRANGEMENT_OPTIONS = [
  { id: "full-time", label: "Full-time", hint: "ongoing employment" },
  { id: "part-time", label: "Part-time", hint: "reduced weekly hours" },
  { id: "contract", label: "Contract", hint: "fixed-term engagement" },
  { id: "freelance", label: "Freelance", hint: "independent project work" },
  { id: "temporary", label: "Temporary", hint: "seasonal or short-term work" },
  { id: "one-time", label: "One-time gig", hint: "a single local task or project" },
  { id: "any", label: "Any work type", hint: "show jobs and gigs" },
];

const LEGACY_FIELD_LABELS = {
  "Web & app development": TECHNOLOGY_FIELD_LABEL,
  "Design & creative": "Design, media & content",
  "Writing & content": "Design, media & content",
  "Marketing & social media": "Marketing & sales",
  "Admin & data entry": "Admin, customer service & virtual assistance",
  "Local & trades": "Skilled trades",
};

// Ordered from specific domains to generic management so titles such as
// "IT Manager" and "Construction Manager" are never swallowed by Business.
const SEARCH_CATEGORY_PATTERNS = [
  ["tech", [
    /developer/i, /engineer/i, /software/i, /programmer/i, /coding/i,
    /full.?stack/i, /front.?end/i, /back.?end/i, /technolog/i, /sysadmin/i,
    /devops/i, /\bcloud\b/i, /\bsre\b/i, /cybersecurity/i, /database/i,
    /^it(?:\s+jobs?)?$/i,
    /\bit\s+(?:support|manager|specialist|technician|administrator|analyst|engineer|consultant|operations|infrastructure|systems?|help\s*desk)\b/i,
    /\bhelp\s*desk\b/i, /\btechnical support\b/i,
  ]],
  ["trades", [
    /plumb/i, /carpent/i, /electrician/i, /\belectrical\b/i, /hvac/i,
    /mechanic/i, /welder/i, /welding/i, /roofer/i, /roofing/i,
    /construction/i, /industrial maintenance/i,
  ]],
  ["home_services", [
    /handy(?:man|woman|person)/i, /landscap/i, /lawn care/i, /housekeep/i,
    /cleaner/i, /cleaning/i, /residential paint/i, /property maintenance/i,
    /home repair/i, /mover/i, /moving service/i,
  ]],
  ["design", [/design/i, /graphic/i, /illustrat/i, /creative/i, /art director/i, /product design/i, /\bui\b/i, /\bux\b/i]],
  ["writing", [/writer/i, /writing/i, /content/i, /copy/i, /editor/i, /blog/i, /journalist/i, /author/i, /translat/i]],
  ["marketing", [/marketing/i, /social media/i, /campaign/i, /brand/i, /growth marketing/i, /email marketing/i, /content marketing/i, /\bseo\b/i, /\bads\b/i]],
  ["sales", [/\bsales\b/i, /account executive/i, /business development/i, /sales development/i, /revenue/i]],
  ["admin", [
    /administrat/i, /virtual assistant/i, /data entry/i, /office assistant/i,
    /office manager/i, /receptionist/i, /\bclerk\b/i, /executive assistant/i,
  ]],
  ["customer_service", [/customer service/i, /customer support/i, /call cent(?:er|re)/i, /contact cent(?:er|re)/i, /support representative/i]],
  ["finance", [/accountant/i, /accounting/i, /bookkeep/i, /payroll/i, /financial/i, /finance/i, /controller/i, /auditor/i]],
  ["logistics", [/delivery/i, /courier/i, /warehouse/i, /forklift/i, /general labou?r/i, /shipping/i, /logistics/i, /truck driver/i, /material handler/i]],
  ["hospitality", [/\bchef\b/i, /\bcook\b/i, /server/i, /bartender/i, /restaurant/i, /hotel/i, /hospitality/i, /retail/i, /cashier/i, /event staff/i]],
  ["care", [/caregiver/i, /personal support worker/i, /\bpsw\b/i, /\bnurse\b/i, /nursing/i, /teacher/i, /tutor/i, /childcare/i, /social worker/i, /personal care/i]],
  ["business", [
    /product manager/i, /project manager/i, /program manager/i,
    /operations manager/i, /general manager/i, /business analyst/i,
    /human resources/i, /\bhr manager\b/i, /\bmanagement\b/i, /\bmanager\b/i,
  ]],
];

const HIGH_CONFIDENCE_TITLE_PATTERNS = {
  tech: [
    /\b(?:software|web|front-?end|back-?end|full[ -]?stack|mobile|application|app) (?:developer|engineer)\b/i,
    /\bdevops\b/i, /\bsite reliability engineer\b/i, /\bcloud engineer\b/i,
    /\bdata (?:engineer|scientist)\b/i, /\bcybersecurity\b/i,
    /\bsystems? administrator\b/i,
    /\bit (?:support|service|systems?|infrastructure|operations|help\s*desk|manager|technician|specialist|analyst|administrator)\b/i,
    /\bhelp\s*desk\b/i, /\btechnical support\b/i,
  ],
  trades: [
    /\bplumb(?:er|ing)?\b/i, /\bcarpent(?:er|ry)\b/i, /\belectrician\b/i,
    /\bhvac\b/i, /\b(?:welder|welding)\b/i, /\b(?:roofer|roofing)\b/i,
    /\bconstruction (?:worker|labou?rer|foreman|supervisor|manager)\b/i,
    /\bindustrial maintenance\b/i,
  ],
  home_services: [
    /\bhandy(?:man|woman|person)\b/i, /\blandscap(?:e|er|ing)\b/i,
    /\blawn care\b/i, /\bhousekeep(?:er|ing)\b/i, /\b(?:house|residential) cleaner\b/i,
    /\bproperty maintenance\b/i, /\bhome repair\b/i,
  ],
  design: [/\b(?:graphic|product|visual|ui|ux) designer\b/i, /\billustrator\b/i],
  writing: [/\b(?:copywriter|content writer|technical writer|journalist|editor|translator)\b/i],
  marketing: [/\b(?:digital marketer|social media manager|seo specialist|marketing manager)\b/i],
  sales: [/\b(?:sales manager|sales representative|account executive|business development representative)\b/i],
  admin: [
    /\b(?:data entry(?: clerk| specialist)?|administrative assistant|virtual assistant|virtual administrative assistant|office assistant|office manager|receptionist|executive assistant)\b/i,
  ],
  customer_service: [/\b(?:customer service|customer support|call cent(?:er|re)|support representative)\b/i],
  business: [
    /\b(?:product manager|project manager|program manager|operations manager|general manager|business analyst|human resources manager|hr manager)\b/i,
  ],
  finance: [/\b(?:accountant|bookkeeper|financial analyst|finance manager|payroll specialist|controller|auditor)\b/i],
  logistics: [/\b(?:delivery driver|courier|warehouse worker|forklift operator|general labou?rer|truck driver|material handler|logistics coordinator)\b/i],
  hospitality: [/\b(?:chef|line cook|server|bartender|cashier|retail associate|event staff|hotel clerk)\b/i],
  care: [/\b(?:caregiver|personal support worker|nurse|teacher|tutor|childcare worker|social worker)\b/i],
};

const SUBCATEGORY_PATTERNS = {
  tech: [
    ["software_development", [/developer/i, /software/i, /programmer/i, /full.?stack/i, /front.?end/i, /back.?end/i]],
    ["it_support", [/it support/i, /help\s*desk/i, /technical support/i]],
    ["cloud_infrastructure", [/devops/i, /cloud/i, /sre/i, /infrastructure/i]],
    ["data", [/data engineer/i, /data scientist/i, /database/i]],
  ],
  trades: [
    ["plumbing", [/plumb/i]], ["electrical", [/electric/i]], ["hvac", [/hvac/i]],
    ["carpentry", [/carpent/i]], ["welding", [/weld/i]], ["roofing", [/roof/i]],
    ["mechanical", [/mechanic/i]], ["construction", [/construction/i]],
  ],
  home_services: [
    ["handyman", [/handy(?:man|woman|person)/i, /home repair/i]],
    ["landscaping", [/landscap/i, /lawn care/i]],
    ["cleaning", [/clean/i, /housekeep/i]],
    ["painting", [/paint/i]], ["moving", [/mover/i, /moving/i]],
    ["property_maintenance", [/property maintenance/i]],
  ],
  admin: [
    ["virtual_assistance", [/virtual assistant/i, /virtual office assistant/i]],
    ["data_entry", [/data entry/i]],
    ["office_admin", [/administrative assistant/i, /office assistant/i, /office manager/i, /receptionist/i, /executive assistant/i]],
  ],
  customer_service: [["customer_service", [/customer service/i, /customer support/i, /call cent(?:er|re)/i]]],
  business: [
    ["product_management", [/product manager/i]], ["project_management", [/project manager/i]],
    ["program_management", [/program manager/i]], ["operations_management", [/operations manager/i]],
    ["human_resources", [/human resources/i, /hr manager/i]],
  ],
  marketing: [["marketing", [/marketing/i]], ["social_media", [/social media/i]], ["seo", [/\bseo\b/i]]],
  sales: [["sales", [/sales/i]], ["business_development", [/business development/i]], ["account_management", [/account executive/i]]],
  finance: [["accounting", [/accountant/i, /accounting/i]], ["bookkeeping", [/bookkeep/i]], ["payroll", [/payroll/i]], ["financial_analysis", [/financial analyst/i]]],
  logistics: [["delivery", [/delivery/i, /courier/i]], ["warehouse", [/warehouse/i, /forklift/i, /material handler/i]], ["general_labour", [/general labou?r/i]]],
  hospitality: [["food_service", [/chef/i, /cook/i, /server/i, /bartender/i]], ["retail", [/retail/i, /cashier/i]], ["events", [/event staff/i]]],
  care: [["healthcare", [/nurse/i, /personal support worker/i, /psw/i]], ["caregiving", [/caregiver/i, /personal care/i]], ["education", [/teacher/i, /tutor/i]], ["childcare", [/childcare/i]]],
};

function matchingCategories(title = "") {
  return Object.entries(HIGH_CONFIDENCE_TITLE_PATTERNS)
    .filter(([, patterns]) => patterns.some((pattern) => pattern.test(title)))
    .map(([category]) => category);
}

export function normalizeFieldLabel(field) {
  return LEGACY_FIELD_LABELS[field] || field;
}

export function categoriesForField(field) {
  const normalized = normalizeFieldLabel(field);
  return CATEGORY_FIELDS.find(({ label }) => label === normalized)?.categories || [];
}

export function guessCategoryFromKeyword(keyword = "") {
  const value = keyword.trim();
  if (!value) return null;

  for (const [category, patterns] of SEARCH_CATEGORY_PATTERNS) {
    if (patterns.some((pattern) => pattern.test(value))) return category;
  }

  return null;
}

export function inferHighConfidenceTitleCategory(title = "") {
  const matches = matchingCategories(title);
  return matches.length === 1 ? matches[0] : null;
}

export function inferListingSubcategory(title = "", category) {
  const groups = SUBCATEGORY_PATTERNS[category] || [];
  return groups.find(([, patterns]) => patterns.some((pattern) => pattern.test(title)))?.[0] || null;
}

export function classifyListingTitle(title, storedCategory) {
  const matches = matchingCategories(title);
  const category = matches.length === 1
    ? matches[0]
    : matches.includes(storedCategory)
      ? storedCategory
      : storedCategory || guessCategoryFromKeyword(title) || "other";

  return {
    category,
    subcategory: inferListingSubcategory(title, category),
    confidence: matches.length === 1 ? "high" : storedCategory ? "source" : "low",
  };
}

export function normalizeListingCategory(title, storedCategory) {
  return classifyListingTitle(title, storedCategory).category;
}

export function normalizeListingReason(reason, storedCategory, normalizedCategory) {
  if (!reason || !storedCategory || storedCategory === normalizedCategory) return reason;

  const escaped = storedCategory.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return reason
    .replace(new RegExp(`matched\\s+${escaped}\\s+from`, "i"), `matched ${normalizedCategory} from`)
    .replace(new RegExp(`reads as\\s+${escaped}-shaped\\s+work`, "i"), `reads as ${normalizedCategory}-shaped work`);
}

export function inferKeywordIntent(keyword = "") {
  const category = guessCategoryFromKeyword(keyword);
  return {
    category,
    subcategory: category ? inferListingSubcategory(keyword, category) : null,
  };
}

export function scoreListingRelevance(listing, keyword = "", selectedCategories = []) {
  const normalizedKeyword = keyword.trim().toLowerCase();
  if (!selectedCategories.includes(listing.category)) return 0;
  if (!normalizedKeyword) return 40;

  const normalizedTitle = String(listing.title || "").toLowerCase();
  if (normalizedTitle.includes(normalizedKeyword)) return 100;

  const intent = inferKeywordIntent(normalizedKeyword);
  if (!intent.category || listing.category !== intent.category) return 0;
  if (intent.subcategory) return listing.subcategory === intent.subcategory ? 80 : 0;

  // Broad searches such as "administration" or "management" may show the
  // normalized category, but only after title classification has removed
  // conflicting roles.
  return 50;
}

export function normalizeWorkArrangement(jobType = "", title = "") {
  const value = `${jobType || ""} ${title || ""}`.toLowerCase();
  if (/part[ -]?time/.test(value)) return "part-time";
  if (/full[ -]?time|permanent/.test(value)) return "full-time";
  if (/freelance|self-employed|independent contractor/.test(value)) return "freelance";
  if (/temporary|seasonal|\btemp\b|casual/.test(value)) return "temporary";
  if (/one[ -]?time|single project|day labour|day labor/.test(value)) return "one-time";
  if (/contract|fixed[ -]?term/.test(value)) return "contract";
  return "unlabeled";
}

export function formatWorkArrangement(arrangement) {
  if (!arrangement || arrangement === "unlabeled") return "Unlabeled";
  return WORK_ARRANGEMENT_OPTIONS.find(({ id }) => id === arrangement)?.label || arrangement;
}

export function isTradesLikeCategory(category) {
  return category === "trades" || category === "home_services";
}
