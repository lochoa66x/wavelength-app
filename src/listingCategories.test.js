import assert from "node:assert/strict";
import test from "node:test";
import {
  CATEGORY_FIELDS,
  TECHNOLOGY_FIELD_LABEL,
  categoriesForField,
  classifyListingTitle,
  compareListingDiscoveryOrder,
  guessCategoryFromKeyword,
  inferHighConfidenceTitleCategory,
  inferKeywordIntent,
  normalizeFieldLabel,
  normalizeListingCategory,
  normalizeListingReason,
  normalizeSearchText,
  normalizeWorkArrangement,
  scoreListingRelevance,
} from "./listingCategories.js";

test("exposes the expanded job-and-gig taxonomy with legacy profile compatibility", () => {
  assert.equal(TECHNOLOGY_FIELD_LABEL, "Technology & IT");
  assert.equal(CATEGORY_FIELDS.length, 12);
  assert.equal(normalizeFieldLabel("Web & app development"), "Technology & IT");
  assert.equal(normalizeFieldLabel("Local & trades"), "Skilled trades");
  assert.equal(normalizeFieldLabel("Admin & data entry"), "Admin, customer service & virtual assistance");
  assert.deepEqual(categoriesForField("Design, media & content"), ["design", "writing"]);
  assert.deepEqual(categoriesForField("Local & trades"), ["trades"]);
});

test("routes management searches by function instead of treating every manager as admin", () => {
  assert.equal(guessCategoryFromKeyword("IT manager"), "tech");
  assert.equal(guessCategoryFromKeyword("marketing manager"), "marketing");
  assert.equal(guessCategoryFromKeyword("construction manager"), "trades");
  assert.equal(guessCategoryFromKeyword("office manager"), "admin");
  assert.equal(guessCategoryFromKeyword("product manager"), "business");
  assert.equal(guessCategoryFromKeyword("management"), "business");
  assert.equal(guessCategoryFromKeyword("find it for me"), null);
});

test("recognizes expanded skilled-trade and local-service searches", () => {
  assert.equal(guessCategoryFromKeyword("plumber"), "trades");
  assert.equal(guessCategoryFromKeyword("electrician"), "trades");
  assert.equal(guessCategoryFromKeyword("HVAC technician"), "trades");
  assert.equal(guessCategoryFromKeyword("handyman"), "home_services");
  assert.equal(guessCategoryFromKeyword("landscaping"), "home_services");
});

test("normalizes common technology aliases without losing meaningful punctuation", () => {
  assert.equal(normalizeSearchText("C plus plus / C sharp / dot net"), "c++ / c# / .net");
  assert.equal(normalizeSearchText("S 4 HANA and FI/CO"), "s/4hana and fico");
  assert.equal(normalizeSearchText("Node JS + React.js"), "node.js + react");
});

test("recognizes technologies and combined natural-language searches", () => {
  for (const keyword of [
    "IT SAP", "SAP FICO consultant", "S/4HANA", "Java", "Python data engineer",
    "C++ embedded developer", "C# .NET developer", "React frontend", "Node.js",
    "cloud DevOps", "cybersecurity",
  ]) {
    const intent = inferKeywordIntent(keyword);
    assert.equal(intent.recognized, true, keyword);
    assert.ok(intent.categories.includes("tech"), keyword);
  }

  const sap = inferKeywordIntent("IT SAP");
  assert.deepEqual(sap.technologies, ["sap"]);
  assert.equal(sap.subcategory, "enterprise_software");
});

test("matches requested technologies in titles or descriptions without leaking unrelated tech", () => {
  const intent = inferKeywordIntent("SAP consultant");
  const titleMatch = classifyListingTitle("Senior SAP S/4HANA Consultant", "tech");
  const descriptionMatch = classifyListingTitle("Enterprise Applications Consultant", "tech");
  const unrelated = classifyListingTitle("Senior Java Developer", "tech");

  assert.ok(scoreListingRelevance(
    { title: "Senior SAP S/4HANA Consultant", description: "", ...titleMatch },
    "SAP consultant",
    intent.categories,
    intent,
  ) > 0);
  assert.ok(scoreListingRelevance(
    { title: "Enterprise Applications Consultant", description: "Configure SAP FICO modules.", ...descriptionMatch },
    "SAP consultant",
    intent.categories,
    intent,
  ) > 0);
  assert.equal(scoreListingRelevance(
    { title: "Senior Java Developer", description: "Build Spring services.", ...unrelated },
    "SAP consultant",
    intent.categories,
    intent,
  ), 0);
});

test("public description snippets remain discovery-only matches below title matches", () => {
  const intent = inferKeywordIntent("SAP consultant");
  const titleMatch = {
    id: "title",
    title: "SAP FICO Consultant",
    searchDescription: "",
    ...classifyListingTitle("SAP FICO Consultant", "tech"),
  };
  const snippetMatch = {
    id: "snippet",
    title: "Enterprise Applications Consultant",
    description: null,
    descriptionSnippet: "The consultant configures SAP FICO and supports S/4HANA delivery.",
    ...classifyListingTitle("Enterprise Applications Consultant", "tech"),
  };
  const titleScore = scoreListingRelevance(titleMatch, "SAP consultant", intent.categories, intent);
  const snippetScore = scoreListingRelevance(snippetMatch, "SAP consultant", intent.categories, intent);

  assert.ok(snippetScore > 0);
  assert.ok(titleScore > snippetScore);
  assert.equal(snippetMatch.description, null);
});

test("discovery ordering uses relevance, then valid freshness, then stable id", () => {
  const listings = [
    { id: "b", relevance: 80, postedAt: "invalid" },
    { id: "c", relevance: 90, postedAt: "2026-08-20T00:00:00Z" },
    { id: "a", relevance: 80, postedAt: "2026-08-24T00:00:00Z" },
    { id: "d", relevance: 80, postedAt: "2026-08-24T00:00:00Z" },
  ].sort(compareListingDiscoveryOrder);

  assert.deepEqual(listings.map(({ id }) => id), ["c", "a", "d", "b"]);
});

test("treats SaaS as a cross-functional domain while respecting role context", () => {
  const intent = inferKeywordIntent("SaaS sales");
  const saasSales = classifyListingTitle("Account Executive", "sales");
  const unrelatedSales = classifyListingTitle("Automotive Sales Representative", "sales");

  assert.ok(intent.categories.includes("sales"));
  assert.ok(scoreListingRelevance(
    { title: "Account Executive", description: "Grow a B2B SaaS platform.", ...saasSales },
    "SaaS sales",
    intent.categories,
    intent,
  ) > 0);
  assert.equal(scoreListingRelevance(
    { title: "Automotive Sales Representative", description: "Sell vehicles at a dealership.", ...unrelatedSales },
    "SaaS sales",
    intent.categories,
    intent,
  ), 0);
});

test("corrects obvious source-category mistakes using strong title evidence", () => {
  assert.equal(
    normalizeListingCategory("Data Entry Administrative Virtual Assistant (Remote)", "trades"),
    "admin",
  );
  assert.equal(normalizeListingCategory("Lead Product Manager", "admin"), "business");
  assert.equal(normalizeListingCategory("Hourly Renovation Handyman", "tech"), "home_services");
  assert.equal(normalizeListingCategory("Licensed Electrician", "admin"), "trades");
  assert.equal(normalizeListingCategory("Landscape Crew Member", "trades"), "home_services");
});

test("keeps ambiguous or cross-domain titles in a credible stored category", () => {
  assert.equal(normalizeListingCategory("Maintenance Technician", "tech"), "tech");
  assert.equal(normalizeListingCategory("HVAC Controls Software Developer", "tech"), "tech");
  assert.equal(inferHighConfidenceTitleCategory("HVAC Controls Software Developer"), null);
});

test("assigns category, subcategory, and confidence together", () => {
  assert.deepEqual(
    classifyListingTitle("Journeyperson Plumber", "admin"),
    { category: "trades", subcategory: "plumbing", confidence: "high" },
  );
  assert.deepEqual(
    classifyListingTitle("Entry Level Virtual Assistant - Remote", "trades"),
    { category: "admin", subcategory: "virtual_assistance", confidence: "high" },
  );
});

test("does not show a virtual assistant for a plumbing search", () => {
  const virtualAssistant = classifyListingTitle("Data Entry Administrative Virtual Assistant (Remote)", "trades");
  assert.equal(
    scoreListingRelevance(
      { title: "Data Entry Administrative Virtual Assistant (Remote)", ...virtualAssistant },
      "plumbing",
      ["trades"],
    ),
    0,
  );

  const plumber = classifyListingTitle("Licensed Service Plumber", "trades");
  assert.equal(
    scoreListingRelevance(
      { title: "Licensed Service Plumber", ...plumber },
      "plumbing",
      ["trades"],
    ),
    80,
  );
});

test("allows broad administration searches without leaking product management", () => {
  const assistant = classifyListingTitle("Virtual Administrative Assistant", "admin");
  const productManager = classifyListingTitle("Lead Product Manager", "admin");

  assert.equal(scoreListingRelevance({ title: "Virtual Administrative Assistant", ...assistant }, "administration", ["admin"]), 50);
  assert.equal(scoreListingRelevance({ title: "Lead Product Manager", ...productManager }, "administration", ["admin"]), 0);
});

test("updates stale categories in both supported match-reason formats", () => {
  assert.equal(
    normalizeListingReason("Explicitly contract, matched tech from adzuna", "tech", "trades"),
    "Explicitly contract, matched trades from adzuna",
  );
  assert.equal(
    normalizeListingReason("Unlabeled type, but reads as trades-shaped work (adzuna)", "trades", "admin"),
    "Unlabeled type, but reads as admin-shaped work (adzuna)",
  );
});

test("normalizes jobs and gigs as a separate work-arrangement dimension", () => {
  assert.equal(normalizeWorkArrangement("full-time", "Electrician"), "full-time");
  assert.equal(normalizeWorkArrangement(null, "Part-time Virtual Assistant"), "part-time");
  assert.equal(normalizeWorkArrangement("contract", "Project Manager"), "contract");
  assert.equal(normalizeWorkArrangement(null, "Freelance Landscaper"), "freelance");
  assert.equal(normalizeWorkArrangement(null, "One-time moving help"), "one-time");
  assert.equal(normalizeWorkArrangement(null, "Office Assistant"), "unlabeled");
});
