import assert from "node:assert/strict";
import test from "node:test";

import {
  RESUME_TEMPLATE_REGISTRY,
  TEMPLATE_IDS,
  analyzeResumeWording,
  availableResumeTemplates,
  buildResumeContentPlan,
  buildResumeRenderPlan,
  createResumePackage,
  manifestVisibleText,
} from "./resumeModel.js";
import { createResumeExportContext, validateResumeExportContext } from "./resumeReadiness.js";
import { resumeDataToPlainText } from "./resumeText.js";
import {
  adminCustomerOperationsResumeFixture,
  adminCustomerTargetItem,
  apprenticeTargetItem,
  creativeAdjacentResumeFixture,
  creativeDesignResumeFixture,
  creativeTargetItem,
  electricianTargetItem,
  fieldServiceTargetItem,
  fieldServiceTechnicianResumeFixture,
  landscapeMaintenanceResumeFixture,
  licensedElectricianResumeFixture,
  missingElectricianCredentialReview,
  marketingCareerChangerResumeFixture,
  marketingCommunicationsResumeFixture,
  marketingTargetItem,
  noisyFieldServicePostingReview,
  propertyMaintenanceResumeFixture,
  technicalSoftwareResumeFixture,
  technicalTargetItem,
  tradeApprenticeResumeFixture,
  verifiedElectricianReview,
} from "../tests/fixtures/resumePhaseBFixtures.js";

const verifiedPosting = {
  posting_readiness: { status: "reviewed_complete", fit_allowed: true, application_ready_allowed: true },
  readiness: { status: "strong_fit" },
  integrity: { status: "passed" },
  application_ready: true,
};

function baseResume(overrides = {}) {
  return {
    name: "Morgan Lee",
    title: "Senior SAP Functional Consultant",
    contact: "morgan@example.com | 416-555-0100 | Toronto, Ontario",
    profile: "SAP functional consultant with verified implementation, requirements, integration, and UAT delivery experience.",
    skills: ["SAP S/4HANA", "FI-CA", "Requirements Gathering", "UAT"],
    experience: [{
      role: "Senior SAP Functional Consultant",
      company: "Example Consulting",
      dates: "2020 - Present",
      bullets: [
        { id: "sap-leadership", text: "Led verified SAP functional requirements and integration workshops.", responsibilityLevel: "led", relevance: "direct" },
        { id: "sap-uat", text: "Coordinated UAT and cutover preparation with business stakeholders.", responsibilityLevel: "contributed", relevance: "direct" },
      ],
    }],
    education: [{ degree: "Bachelor of Commerce", institution: "Example University", dates: "2014" }],
    languages: [{ language: "English", proficiency: "Fluent" }],
    content_strategy: "direct",
    ...overrides,
  };
}

test("canonical package separates facts, evidence, classification, and presentation", () => {
  const resumePackage = createResumePackage(baseResume(), {
    item: { title: "SAP FICO Functional Consultant", company: "Example Bank", category: "tech" },
    atsReview: verifiedPosting,
  });
  assert.equal(resumePackage.schemaVersion, 2);
  assert.equal(resumePackage.document.candidate.fullName, "Morgan Lee");
  assert.equal(resumePackage.document.target.jobTitle, "SAP FICO Functional Consultant");
  assert.equal(resumePackage.classification.occupationFamily, "sap-functional");
  assert.equal(resumePackage.presentation.recommendedTemplateId, TEMPLATE_IDS.SAP_FUNCTIONAL);
  assert.equal(resumePackage.validation.valid, true);
  assert.ok(resumePackage.evidence.items["sap-leadership"]);
  assert.doesNotMatch(JSON.stringify(resumePackage.document), /sourceReferences|recommendationTrace|posting_readiness/);
});

test("template registry exposes nine unique stable Phase A through B3 IDs", () => {
  const templates = availableResumeTemplates();
  const ids = templates.map((template) => template.id);
  assert.deepEqual(ids, [
    TEMPLATE_IDS.ATS_CORE,
    TEMPLATE_IDS.SAP_FUNCTIONAL,
    TEMPLATE_IDS.PROJECT_LEADERSHIP,
    TEMPLATE_IDS.CAREER_TRANSITION,
    TEMPLATE_IDS.TECHNICAL_SOFTWARE,
    TEMPLATE_IDS.ADMIN_CUSTOMER_OPERATIONS,
    TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES,
    TEMPLATE_IDS.MARKETING_COMMUNICATIONS,
    TEMPLATE_IDS.CREATIVE_DESIGN,
  ]);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) {
    assert.equal(RESUME_TEMPLATE_REGISTRY[id].id, id);
    assert.equal(RESUME_TEMPLATE_REGISTRY[id].version, 1);
    assert.equal(RESUME_TEMPLATE_REGISTRY[id].previewMetadata.columnCount, 1);
  }
});

test("deterministic recommendation distinguishes functional SAP, technical SAP, leadership, transition, and fallback", () => {
  const functional = createResumePackage(baseResume(), { item: { title: "SAP FICO Functional Consultant", category: "tech" }, atsReview: verifiedPosting });
  assert.equal(functional.presentation.recommendedTemplateId, TEMPLATE_IDS.SAP_FUNCTIONAL);

  const unsupportedTechnicalPivot = createResumePackage(baseResume(), { item: { title: "SAP ABAP Developer", category: "tech" }, atsReview: verifiedPosting });
  assert.equal(unsupportedTechnicalPivot.classification.functionalVersusTechnical, "technical");
  assert.equal(unsupportedTechnicalPivot.presentation.recommendedTemplateId, TEMPLATE_IDS.CAREER_TRANSITION);
  assert.equal(unsupportedTechnicalPivot.presentation.recommendationReasonCode, "career_transition_technical_evidence_gap");

  const technical = createResumePackage(technicalSoftwareResumeFixture, { item: technicalTargetItem, atsReview: verifiedPosting });
  assert.equal(technical.classification.verifiedTechnicalEvidence, true);
  assert.equal(technical.presentation.recommendedTemplateId, TEMPLATE_IDS.TECHNICAL_SOFTWARE);
  assert.equal(technical.presentation.recommendationStrength, "strong");

  const leadership = createResumePackage(baseResume({ title: "Project Delivery Leader" }), { item: { title: "Program Manager", category: "business" }, atsReview: verifiedPosting });
  assert.equal(leadership.presentation.recommendedTemplateId, TEMPLATE_IDS.PROJECT_LEADERSHIP);

  const transition = createResumePackage(baseResume({ content_strategy: "career_change" }), { item: { title: "Marketing Specialist", category: "marketing" }, atsReview: { ...verifiedPosting, readiness: { status: "significant_gap" } } });
  assert.equal(transition.presentation.recommendedTemplateId, TEMPLATE_IDS.CAREER_TRANSITION);

  const generic = createResumePackage(baseResume({ title: "Operations Analyst", content_strategy: "direct" }), { item: { title: "Operations Analyst", category: "business" }, atsReview: verifiedPosting });
  assert.equal(generic.presentation.recommendedTemplateId, TEMPLATE_IDS.ATS_CORE);
});

test("admin/customer operations recommendation requires matching target and verified service evidence", () => {
  const direct = createResumePackage(adminCustomerOperationsResumeFixture, { item: adminCustomerTargetItem, atsReview: verifiedPosting });
  assert.equal(direct.classification.occupationFamily, "admin-customer-operations");
  assert.equal(direct.classification.verifiedAdminCustomerEvidence, true);
  assert.equal(direct.presentation.recommendedTemplateId, TEMPLATE_IDS.ADMIN_CUSTOMER_OPERATIONS);
  assert.equal(direct.presentation.recommendationReasonCode, "admin_customer_operations_verified");

  const evidenceGap = createResumePackage(baseResume({ title: "SAP Functional Consultant" }), { item: adminCustomerTargetItem, atsReview: verifiedPosting });
  assert.equal(evidenceGap.classification.occupationFamily, "admin-customer-operations");
  assert.equal(evidenceGap.classification.verifiedAdminCustomerEvidence, false);
  assert.equal(evidenceGap.presentation.recommendedTemplateId, TEMPLATE_IDS.ATS_CORE);

  for (const title of ["Sales Representative", "Marketing Coordinator", "Financial Analyst", "Operations Director"]) {
    const excluded = createResumePackage(adminCustomerOperationsResumeFixture, { item: { title, category: "business" }, atsReview: verifiedPosting });
    assert.notEqual(excluded.presentation.recommendedTemplateId, TEMPLATE_IDS.ADMIN_CUSTOMER_OPERATIONS, title);
  }
});

test("technical recommendation covers software, web, cloud, data, and QA targets only with verified evidence", () => {
  for (const title of ["Software Engineer", "Web Application Developer", "Cloud Engineer", "Data Engineer", "QA Automation Engineer"]) {
    const qualified = createResumePackage(technicalSoftwareResumeFixture, { item: { ...technicalTargetItem, title }, atsReview: verifiedPosting });
    assert.equal(qualified.presentation.recommendedTemplateId, TEMPLATE_IDS.TECHNICAL_SOFTWARE, title);
  }

  const titleOnly = createResumePackage(baseResume({ title: "Office Coordinator" }), {
    item: { ...technicalTargetItem, title: "Software Engineer" },
    atsReview: verifiedPosting,
  });
  assert.equal(titleOnly.classification.verifiedTechnicalEvidence, false);
  assert.notEqual(titleOnly.presentation.recommendedTemplateId, TEMPLATE_IDS.TECHNICAL_SOFTWARE);
});

test("ABAP development evidence qualifies while functional collaboration does not", () => {
  const abapDeveloper = createResumePackage(baseResume({
    title: "SAP ABAP Developer",
    skills: ["SAP ABAP", "JavaScript", "Git"],
    profile: "SAP ABAP developer with verified application development and version-control experience.",
    experience: [{
      role: "SAP ABAP Developer",
      company: "Example Consulting",
      dates: "2020 - Present",
      bullets: ["Developed ABAP application enhancements from approved technical specifications."],
    }],
  }), { item: { title: "SAP ABAP Developer", category: "tech" }, atsReview: verifiedPosting });
  assert.equal(abapDeveloper.presentation.recommendedTemplateId, TEMPLATE_IDS.TECHNICAL_SOFTWARE);
  assert.equal(abapDeveloper.presentation.recommendationReasonCode, "technical_software_sap_development_verified");

  const functionalCollaborator = createResumePackage(baseResume({
    profile: "SAP functional consultant who collaborated with ABAP teams on functional specifications and UAT.",
  }), { item: { title: "SAP ABAP Developer", category: "tech" }, atsReview: verifiedPosting });
  assert.equal(functionalCollaborator.presentation.recommendedTemplateId, TEMPLATE_IDS.CAREER_TRANSITION);
  assert.equal(functionalCollaborator.classification.verifiedTechnicalEvidence, false);
});

test("adjacent SAP module pivot remains functional without inserting the target module", () => {
  const resumePackage = createResumePackage(baseResume({ content_strategy: "adjacent" }), {
    item: { title: "SAP MM Functional Consultant", category: "tech" },
    atsReview: { ...verifiedPosting, readiness: { status: "credible_stretch" } },
  });
  assert.equal(resumePackage.presentation.recommendedTemplateId, TEMPLATE_IDS.SAP_FUNCTIONAL);
  assert.equal(resumePackage.classification.careerStrategy, "adjacent");
  assert.doesNotMatch(JSON.stringify(resumePackage.document.skills), /SAP MM/i);
});

test("template override changes presentation only and preserves factual IDs and content hash", () => {
  const original = createResumePackage(baseResume(), { item: { title: "SAP Functional Consultant", category: "tech" }, atsReview: verifiedPosting });
  const overridden = createResumePackage(original, { selectedTemplateId: TEMPLATE_IDS.PROJECT_LEADERSHIP });
  assert.equal(overridden.contentHash, original.contentHash);
  assert.deepEqual(buildResumeContentPlan(overridden), buildResumeContentPlan(original));
  assert.equal(overridden.classification.occupationFamily, original.classification.occupationFamily);
  assert.equal(overridden.classification.careerStrategy, original.classification.careerStrategy);
  assert.equal(overridden.presentation.selectedTemplateId, TEMPLATE_IDS.PROJECT_LEADERSHIP);
});

test("all nine selectable templates keep the same selected factual item IDs", () => {
  const resumePackage = createResumePackage(baseResume(), { item: { title: "SAP Functional Consultant", category: "tech" }, atsReview: verifiedPosting });
  const ids = (plan) => plan.manifest.sections.flatMap((section) => section.items.flatMap((item) => [item.id, ...(item.bullets || []).map((bullet) => bullet.id), ...(item.details || []).map((detail) => detail.id)])).sort();
  const plans = Object.values(TEMPLATE_IDS).map((id) => buildResumeRenderPlan(resumePackage, id));
  for (const plan of plans.slice(1)) assert.deepEqual(ids(plan), ids(plans[0]));
});

test("B3 direct recommendations require verified marketing or creative candidate evidence", () => {
  const marketing = createResumePackage(marketingCommunicationsResumeFixture, {
    item: marketingTargetItem,
    atsReview: verifiedPosting,
  });
  assert.equal(marketing.classification.occupationFamily, "marketing-communications");
  assert.equal(marketing.classification.marketingProfileType, "direct-marketing-communications");
  assert.equal(marketing.presentation.recommendedTemplateId, TEMPLATE_IDS.MARKETING_COMMUNICATIONS);
  assert.equal(marketing.presentation.recommendationDisposition, "direct-fit");
  assert.equal(marketing.presentation.recommendationStrength, "strong");
  assert.match(JSON.stringify(marketing.document), /18%/);
  assert.doesNotMatch(JSON.stringify(marketing.document), /30%/);

  const creative = createResumePackage(creativeDesignResumeFixture, {
    item: creativeTargetItem,
    atsReview: verifiedPosting,
  });
  assert.equal(creative.classification.occupationFamily, "creative-design");
  assert.equal(creative.classification.creativeProfileType, "direct-creative-design");
  assert.equal(creative.classification.verifiedPortfolioEvidence, true);
  assert.equal(creative.classification.verifiedCreativeLeadershipEvidence, false);
  assert.equal(creative.presentation.recommendedTemplateId, TEMPLATE_IDS.CREATIVE_DESIGN);
  assert.equal(creative.presentation.recommendationDisposition, "direct-fit");
  assert.equal(creative.presentation.recommendationStrength, "strong");
  const visible = manifestVisibleText(buildResumeRenderPlan(creative, TEMPLATE_IDS.CREATIVE_DESIGN)).join(" ");
  assert.match(visible, /https:\/\/portfolio\.example\.com\/riley-morgan\/?/i);
});

test("B3 adjacent candidates stay capped and never acquire posting metrics, platforms, portfolios, or leadership", () => {
  const marketing = createResumePackage(marketingCareerChangerResumeFixture, {
    item: marketingTargetItem,
    atsReview: verifiedPosting,
  });
  assert.equal(marketing.classification.adjacentMarketingEvidence, true);
  assert.equal(marketing.classification.marketingProfileType, "adjacent-communications");
  assert.equal(marketing.presentation.recommendedTemplateId, TEMPLATE_IDS.CAREER_TRANSITION);
  assert.equal(marketing.presentation.recommendationDisposition, "career-transition");
  assert.doesNotMatch(JSON.stringify(marketing.document), /HubSpot|30%|conversion/i);
  const marketingPlan = buildResumeRenderPlan(marketing, TEMPLATE_IDS.MARKETING_COMMUNICATIONS);
  assert.ok(marketingPlan.sections.some((section) => section.heading === "Communications & Content Profile"));

  const creative = createResumePackage(creativeAdjacentResumeFixture, {
    item: creativeTargetItem,
    atsReview: verifiedPosting,
  });
  assert.equal(creative.classification.adjacentCreativeEvidence, true);
  assert.equal(creative.classification.creativeProfileType, "adjacent-visual-production");
  assert.equal(creative.classification.verifiedPortfolioEvidence, false);
  assert.equal(creative.classification.verifiedCreativeLeadershipEvidence, false);
  assert.equal(creative.presentation.recommendedTemplateId, TEMPLATE_IDS.CREATIVE_DESIGN);
  assert.equal(creative.presentation.recommendationDisposition, "adjacent-fit");
  assert.equal(creative.presentation.recommendationStrength, "moderate");
  assert.doesNotMatch(JSON.stringify(creative.document), /Figma|Adobe|design system|portfolio|lead creative/i);
  const creativePlan = buildResumeRenderPlan(creative, TEMPLATE_IDS.CREATIVE_DESIGN);
  assert.ok(creativePlan.sections.some((section) => section.heading === "Visual Content & Production Profile"));
});

test("posting requirements can identify a B3 target but can never satisfy candidate-side evidence", () => {
  const marketing = createResumePackage(baseResume({
    title: "Automation Analyst",
    profile: "IT analyst with verified workflow automation and systems documentation experience.",
    skills: ["IT automation", "Systems documentation"],
  }), {
    item: { title: "Marketing Automation Analyst", category: "marketing" },
    atsReview: {
      ...verifiedPosting,
      requirements: [{
        requirement: "Lead HubSpot email campaigns and improve conversion by 25%.",
        classification: "direct",
        evidence_match: "direct",
        resume_evidence: "Automated internal IT workflows.",
      }],
    },
  });
  assert.equal(marketing.classification.verifiedMarketingEvidence, false);
  assert.notEqual(marketing.presentation.recommendationStrength, "strong");
  assert.notEqual(marketing.presentation.recommendationDisposition, "direct-fit");
  assert.doesNotMatch(JSON.stringify(marketing.document), /HubSpot|25%|email campaign/i);

  const creative = createResumePackage(baseResume({
    title: "Operations Analyst",
    profile: "Operations analyst who designed a process for reviewed service requests.",
    skills: ["Process documentation"],
  }), {
    item: { title: "Graphic Designer", category: "design", description: "Use Canva and Figma and lead creative reviews." },
    atsReview: verifiedPosting,
  });
  assert.equal(creative.classification.verifiedCreativeEvidence, false);
  assert.equal(creative.classification.verifiedCreativeLeadershipEvidence, false);
  assert.equal(creative.presentation.recommendedTemplateId, TEMPLATE_IDS.CAREER_TRANSITION);
  assert.doesNotMatch(JSON.stringify(creative.document), /Canva|Figma|creative review/i);
});

test("B3 false-positive overlaps never produce a strong family recommendation", () => {
  const marketingCases = [
    ["Marketing Automation Analyst", "IT Automation Analyst", "Automated generic IT service workflows and documented system operations."],
    ["Product Marketing Manager", "Product Manager", "Managed a product roadmap, backlog, and delivery priorities."],
    ["Growth Marketing Manager", "Business Operations Manager", "Supported business growth through operational planning."],
    ["Communications Engineer", "Telecommunications Engineer", "Maintained telecommunications systems and communication networks."],
    ["Digital Marketing Specialist", "Transformation Analyst", "Supported digital transformation and process governance."],
    ["Brand Manager", "Operations Team Manager", "Managed an unrelated operational team and service inventory."],
    ["Sales Representative", "Sales Representative", "Managed sales accounts and customer orders without marketing responsibilities."],
    ["Office Coordinator", "Office Coordinator", "Coordinated schedules and reports."],
  ];
  for (const [targetTitle, candidateTitle, profile] of marketingCases) {
    const pkg = createResumePackage({ name: "Case Candidate", title: candidateTitle, profile, content_strategy: "direct" }, {
      item: { title: targetTitle, category: "marketing", description: "Role-specific responsibilities." },
      atsReview: verifiedPosting,
    });
    assert.ok(pkg.presentation.recommendedTemplateId !== TEMPLATE_IDS.MARKETING_COMMUNICATIONS || pkg.presentation.recommendationStrength !== "strong", targetTitle);
  }

  const creativeCases = [
    "Software Designer",
    "Solution Designer",
    "Systems Designer",
    "Instructional Designer",
    "Mechanical Designer",
    "Architectural Designer",
    "Design Engineer",
    "Database Designer",
    "SAP Solution Designer",
  ];
  for (const title of creativeCases) {
    const pkg = createResumePackage({
      name: "Case Candidate",
      title,
      profile: title === "Instructional Designer"
        ? "Prepared learning objectives, course content, and facilitator guidance."
        : "Designed a process and documented technical or operational requirements.",
      content_strategy: "direct",
    }, {
      item: { title, category: "design", description: "Complete role responsibilities without verified candidate evidence." },
      atsReview: verifiedPosting,
    });
    assert.ok(pkg.presentation.recommendedTemplateId !== TEMPLATE_IDS.CREATIVE_DESIGN || pkg.presentation.recommendationStrength !== "strong", title);
  }

  const categoryOnly = createResumePackage({ name: "Case Candidate", title: "Office Coordinator", profile: "Coordinated schedules and records." }, {
    item: { title: "Office Coordinator", category: "design", description: "Coordinate schedules and records." },
    atsReview: verifiedPosting,
  });
  assert.notEqual(categoryOnly.presentation.recommendedTemplateId, TEMPLATE_IDS.CREATIVE_DESIGN);
});

test("B3 portfolio URLs are allowlisted, explicitly identified, and visible without inventing a portfolio", () => {
  const safe = createResumePackage(creativeDesignResumeFixture, { item: creativeTargetItem, atsReview: verifiedPosting });
  const safePlan = buildResumeRenderPlan(safe, TEMPLATE_IDS.CREATIVE_DESIGN);
  assert.equal(safe.classification.verifiedPortfolioEvidence, true);
  assert.match(safePlan.header.contactLine, /https:\/\/portfolio\.example\.com\/riley-morgan\/?/i);

  const unsafe = createResumePackage({
    ...creativeDesignResumeFixture,
    candidate: {
      ...creativeDesignResumeFixture.candidate,
      professionalLinks: [
        { label: "Portfolio", url: "javascript:alert(1)" },
        { label: "LinkedIn", url: "https://www.linkedin.com/in/safe-example" },
      ],
    },
  }, { item: creativeTargetItem, atsReview: verifiedPosting });
  assert.equal(unsafe.classification.verifiedPortfolioEvidence, false);
  assert.doesNotMatch(buildResumeRenderPlan(unsafe, TEMPLATE_IDS.CREATIVE_DESIGN).header.contactLine, /javascript|portfolio available/i);
  assert.match(buildResumeRenderPlan(unsafe, TEMPLATE_IDS.CREATIVE_DESIGN).header.contactLine, /linkedin\.com/i);
});

test("incomplete postings cap direct B3 recommendations and produce preliminary-only authorization", () => {
  const partialReview = {
    posting_readiness: { status: "needs_full_posting", fit_allowed: false, application_ready_allowed: false },
    readiness: { status: "needs_full_posting" },
    application_ready: false,
  };
  const packageResult = createResumePackage(marketingCommunicationsResumeFixture, { item: marketingTargetItem, atsReview: partialReview });
  assert.equal(packageResult.presentation.recommendedTemplateId, TEMPLATE_IDS.MARKETING_COMMUNICATIONS);
  assert.equal(packageResult.presentation.recommendationStrength, "moderate");
  assert.equal(packageResult.presentation.recommendationReasonCode, "marketing_communications_verified_preliminary");
  const context = createResumeExportContext(marketingCommunicationsResumeFixture, partialReview, {
    item: marketingTargetItem,
    templateId: TEMPLATE_IDS.MARKETING_COMMUNICATIONS,
  });
  assert.equal(context.authorization.mode, "preliminary");
  assert.equal(context.renderPlan.preliminary, true);
  assert.match(resumeDataToPlainText(context), /PRELIMINARY DRAFT/);
  assert.equal(validateResumeExportContext(context), context);
});

test("B2 recommendation distinguishes regulated, apprentice, field-service, general-maintenance, and landscape profiles", () => {
  const electrician = createResumePackage(licensedElectricianResumeFixture, {
    item: electricianTargetItem,
    atsReview: verifiedElectricianReview,
  });
  assert.equal(electrician.presentation.recommendedTemplateId, TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES);
  assert.equal(electrician.classification.tradeProfileType, "regulated-trade-professional");
  assert.equal(electrician.classification.tradeCredentialStatus, "required-verified");
  assert.equal(electrician.presentation.recommendationStrength, "strong");

  const apprentice = createResumePackage(tradeApprenticeResumeFixture, { item: apprenticeTargetItem, atsReview: verifiedPosting });
  assert.equal(apprentice.presentation.recommendedTemplateId, TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES);
  assert.equal(apprentice.classification.tradeProfileType, "apprentice-helper");
  assert.equal(apprentice.presentation.recommendationReasonCode, "skilled_trades_apprentice_verified");
  assert.doesNotMatch(JSON.stringify(apprentice.document), /journeyperson|journeyman|red seal/i);

  const fieldService = createResumePackage(fieldServiceTechnicianResumeFixture, { item: fieldServiceTargetItem, atsReview: verifiedPosting });
  assert.equal(fieldService.classification.tradeProfileType, "experienced-field-service-professional");
  assert.equal(fieldService.presentation.recommendedTemplateId, TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES);

  const maintenance = createResumePackage(propertyMaintenanceResumeFixture, {
    item: { title: "Property Maintenance Worker", category: "home_services" },
    atsReview: verifiedPosting,
  });
  assert.equal(maintenance.classification.tradeProfileType, "general-maintenance");
  assert.doesNotMatch(maintenance.document.headline, /electrician|plumber|hvac/i);

  const landscape = createResumePackage(landscapeMaintenanceResumeFixture, {
    item: { title: "Landscape Maintenance Worker", category: "trades" },
    atsReview: verifiedPosting,
  });
  assert.equal(landscape.presentation.recommendedTemplateId, TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES);
  assert.equal(landscape.classification.tradeProfileType, "general-maintenance");
});

test("category and ambiguous maintenance language never create direct trade evidence", () => {
  const categoryOnly = createResumePackage(baseResume({ title: "Office Coordinator" }), {
    item: { title: "Office Coordinator", category: "trades", description: "Coordinate office schedules and reports." },
    atsReview: verifiedPosting,
  });
  assert.notEqual(categoryOnly.classification.occupationFamily, "skilled-trades-field-services");
  assert.notEqual(categoryOnly.presentation.recommendedTemplateId, TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES);

  for (const title of ["SAP Plant Maintenance Consultant", "Software Maintenance Engineer", "Maintenance Planner", "IT Service Desk Technician"]) {
    const ambiguous = createResumePackage(baseResume({
      title,
      profile: "Supported SAP Plant Maintenance configuration, maintenance planning, software troubleshooting, work orders, and asset-management reporting.",
      skills: ["SAP PM", "CMMS", "Maintenance planning", "Software troubleshooting"],
    }), { item: { title, category: "trades", description: "Maintain SAP configuration, software services, asset records, and planning workflows." }, atsReview: verifiedPosting });
    assert.notEqual(ambiguous.presentation.recommendedTemplateId, TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES, title);
    assert.equal(ambiguous.classification.verifiedTradeEvidence, false, title);
  }
});

test("direct hands-on evidence with a missing regulated credential cannot receive a strong recommendation", () => {
  const unlicensed = {
    ...licensedElectricianResumeFixture,
    title: "Electrical Installation Worker",
    certifications: [],
  };
  const resumePackage = createResumePackage(unlicensed, {
    item: electricianTargetItem,
    atsReview: missingElectricianCredentialReview,
  });
  assert.equal(resumePackage.presentation.recommendedTemplateId, TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES);
  assert.equal(resumePackage.presentation.recommendationStrength, "moderate");
  assert.equal(resumePackage.classification.tradeCredentialStatus, "required-missing");
  assert.deepEqual(resumePackage.classification.missingTradeCredentials, ["electrical licence"]);
  assert.doesNotMatch(JSON.stringify(resumePackage.document), /309A|electrical licen[cs]e/i);
  assert.match(resumePackage.presentation.recommendationReason, /remains outside the résumé/i);
});

test("posting credential language never counts as candidate credential evidence", () => {
  const resumePackage = createResumePackage(baseResume({
    title: "Office Coordinator",
    profile: "Coordinated work orders, contractor schedules, records, and customer updates.",
  }), {
    item: electricianTargetItem,
    atsReview: {
      ...verifiedPosting,
      requirements: [
        {
          requirement: "Install and test commercial electrical systems; a valid 309A licence is required.",
          classification: "direct",
          resume_evidence: "Coordinated contractor work orders and customer updates.",
        },
      ],
    },
  });

  assert.equal(resumePackage.classification.verifiedTradeEvidence, false);
  assert.equal(resumePackage.classification.tradeCredentialStatus, "required-missing");
  assert.match(resumePackage.classification.missingTradeCredentials.join(" "), /electrical licence/i);
  assert.equal(resumePackage.presentation.recommendedTemplateId, TEMPLATE_IDS.CAREER_TRANSITION);
  assert.equal(resumePackage.presentation.recommendationStrength, "conservative");
});

test("noisy duplicated posting requirements stay review-only and deduplicate credential gaps", () => {
  const clean = createResumePackage(fieldServiceTechnicianResumeFixture, {
    item: fieldServiceTargetItem,
    atsReview: verifiedPosting,
  });
  const noisy = createResumePackage(fieldServiceTechnicianResumeFixture, {
    item: fieldServiceTargetItem,
    atsReview: noisyFieldServicePostingReview,
  });

  assert.equal(noisy.presentation.recommendedTemplateId, TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES);
  assert.equal(noisy.presentation.recommendationStrength, "moderate");
  assert.deepEqual(noisy.classification.missingTradeCredentials, ["driver's licence"]);
  assert.equal(noisy.contentHash, clean.contentHash);
  assert.deepEqual(noisy.document, clean.document);
  assert.doesNotMatch(JSON.stringify(noisy.document), /driver'?s licence/i);
  assert.equal(JSON.stringify(noisy.document).match(/WHMIS/g)?.length, 1);
});

test("manual B2 selection changes render strategy only and stays conservative without direct trade evidence", () => {
  const officeCandidate = createResumePackage(baseResume({
    title: "SAP Plant Maintenance Coordinator",
    profile: "SAP Plant Maintenance coordinator with verified planning and work-order reporting experience.",
  }), {
    item: { title: "Field Service Technician", category: "trades" },
    atsReview: verifiedPosting,
  });
  const selected = createResumePackage(officeCandidate, { selectedTemplateId: TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES });
  const plan = buildResumeRenderPlan(selected, TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES);
  assert.equal(selected.contentHash, officeCandidate.contentHash);
  assert.equal(selected.classification.tradeProfileType, "adjacent-pivot");
  assert.equal(plan.header.headline, officeCandidate.document.headline);
  assert.ok(plan.sections.some((section) => section.heading === "Professional Summary"));
  assert.equal(plan.sections.some((section) => /Trade & Field/.test(section.heading)), false);
});

test("B2 section order adapts deterministically without changing canonical content", () => {
  const regulated = createResumePackage(licensedElectricianResumeFixture, { item: electricianTargetItem, atsReview: verifiedElectricianReview });
  const apprentice = createResumePackage(tradeApprenticeResumeFixture, { item: apprenticeTargetItem, atsReview: verifiedPosting });
  const fieldService = createResumePackage(fieldServiceTechnicianResumeFixture, { item: fieldServiceTargetItem, atsReview: verifiedPosting });
  const order = (pkg) => buildResumeRenderPlan(pkg, TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES).sections.map((section) => section.id);
  assert.deepEqual(order(regulated).slice(0, 5), ["summary", "certifications", "safety", "skills", "experience"]);
  assert.deepEqual(order(apprentice).slice(0, 5), ["summary", "training", "safety", "skills", "experience"]);
  assert.deepEqual(order(fieldService).slice(0, 5), ["summary", "skills", "experience", "certifications", "safety"]);
  assert.deepEqual(order(fieldService), order(fieldService));
  assert.equal(buildResumeRenderPlan(fieldService, TEMPLATE_IDS.SKILLED_TRADES_FIELD_SERVICES).contentHash, fieldService.contentHash);
});

test("admin template preserves coordination wording instead of upgrading it to management", () => {
  const resumePackage = createResumePackage(adminCustomerOperationsResumeFixture, { item: adminCustomerTargetItem, atsReview: verifiedPosting });
  const plan = buildResumeRenderPlan(resumePackage, TEMPLATE_IDS.ADMIN_CUSTOMER_OPERATIONS);
  const bullets = plan.sections
    .filter((section) => section.type === "experience")
    .flatMap((section) => section.items)
    .flatMap((entry) => entry.bullets)
    .map((bullet) => bullet.text);
  assert.ok(bullets.some((bullet) => bullet.startsWith("Coordinated customer requests")));
  assert.equal(bullets.some((bullet) => /^(?:managed|directed|led) customer requests/i.test(bullet)), false);
});

test("malformed values and cycles are omitted with warnings instead of object coercion", () => {
  const cycle = {};
  cycle.text = cycle;
  const resumePackage = createResumePackage(baseResume({
    profile: { arbitrary: { private: "do-not-render" } },
    skills: [{ text: cycle }, { name: "Verified skill" }],
    languages: [null, { arbitrary: "private" }],
  }));
  const visible = manifestVisibleText(buildResumeRenderPlan(resumePackage));
  assert.match(visible.join(" "), /Verified skill/);
  assert.doesNotMatch(visible.join(" "), /\[object Object\]|undefined|null|do-not-render|private/i);
  assert.ok(resumePackage.validation.warnings.some((entry) => entry.code === "unsupported_structured_value"));
});

test("unknown future canonical schema versions fail closed", () => {
  assert.throws(() => createResumePackage({ kind: "resume-package", schemaVersion: 999 }), /Unsupported ResumePackage schema version/);
});

test("wording analysis reports repeated verbs, vague wording, duplicate bullets, and unsupported ownership", () => {
  const resumePackage = createResumePackage(baseResume({
    experience: [{
      role: "Coordinator",
      company: "Example",
      dates: "2019 - 2022",
      bullets: [
        { id: "a", text: "Led the delivery work with stakeholders.", responsibilityLevel: "supported" },
        { id: "b", text: "Led the delivery work with stakeholders.", responsibilityLevel: "supported" },
        { id: "c", text: "Led planning activities for the release.", responsibilityLevel: "supported" },
        { id: "d", text: "Worked on project administration." },
      ],
    }],
  }));
  const codes = new Set(analyzeResumeWording(resumePackage).map((issue) => issue.code));
  for (const code of ["unsupported_ownership", "repeated_opening", "duplicate_bullet", "vague_opening"]) assert.ok(codes.has(code), code);
});

test("export authorization is bound to content, identity, posting, schema, and mode", () => {
  const context = createResumeExportContext(baseResume(), verifiedPosting, { item: { title: "SAP Functional Consultant", category: "tech" }, templateId: TEMPLATE_IDS.SAP_FUNCTIONAL });
  assert.equal(validateResumeExportContext(context), context);
  assert.equal(context.authorization.mode, "final");
  assert.match(resumeDataToPlainText(context), /Morgan Lee/);

  const tampered = {
    ...context,
    resumePackage: { ...context.resumePackage, contentHash: "resume-tampered" },
  };
  assert.throws(() => validateResumeExportContext(tampered), /stale|does not match/i);

  const stalePosting = {
    ...context,
    assessment: { ...context.assessment, posting_readiness: { status: "partial", fit_allowed: false, application_ready_allowed: false } },
  };
  assert.throws(() => validateResumeExportContext(stalePosting), /stale|does not match/i);
  assert.throws(() => resumeDataToPlainText(stalePosting), /stale|does not match/i);

  const contentDrift = {
    ...context,
    resumePackage: {
      ...context.resumePackage,
      document: { ...context.resumePackage.document, summary: "Tampered summary" },
    },
  };
  assert.throws(() => validateResumeExportContext(contentDrift), /content hash/i);

  const renderDrift = {
    ...context,
    renderPlan: {
      ...context.renderPlan,
      header: { ...context.renderPlan.header, headline: "Tampered headline" },
    },
  };
  assert.throws(() => validateResumeExportContext(renderDrift), /stale|does not match/i);
});

test("partial posting creates a preliminary context and missing identity blocks export", () => {
  const preliminary = createResumeExportContext(baseResume(), {
    posting_readiness: { status: "partial", fit_allowed: false, application_ready_allowed: false },
    readiness: { status: "needs_full_posting" },
    application_ready: false,
  });
  assert.equal(preliminary.authorization.mode, "preliminary");
  assert.equal(preliminary.renderPlan.preliminary, true);
  const missingIdentity = createResumeExportContext(baseResume({ name: "candidate" }), verifiedPosting);
  assert.equal(missingIdentity.readiness.canExport, false);
  assert.throws(() => validateResumeExportContext(missingIdentity), /Candidate name/i);
});
