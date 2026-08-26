import { availableResumeDesigns } from "../resumeModel.js";

export { PRODUCT_TOUR_VERSION } from "./productTourConfig.js";

export const productTourCandidate = Object.freeze({
  name: "Jordan Lee",
  headline: "Licensed Industrial Electrician",
  contact: "jordan.lee@example.com · Hamilton, Ontario",
});

export const productTourPosting = Object.freeze({
  title: "Facilities Electrician",
  company: "Northline Manufacturing",
  location: "Hamilton, Ontario · On-site",
  responsibilities: [
    "Troubleshoot three-phase electrical equipment and motor controls",
    "Complete preventive maintenance and document work in the CMMS",
    "Apply lockout/tagout procedures and read electrical drawings",
  ],
});

export const productTourReview = Object.freeze({
  application_ready: false,
  integrity: { status: "pass" },
  identity: { status: "complete" },
  posting_readiness: {
    status: "reviewed_complete",
    fit_allowed: true,
    application_ready_allowed: true,
  },
  candidate_fit: {
    status: "adjacent",
    confidence: "high",
    reason: "The candidate has strong electrical maintenance evidence with one material controls-programming gap.",
  },
  parseability: { status: "pass" },
  writing: { status: "pass" },
  export_readiness: { application_ready: false, blockers: ["candidate_fit"] },
  gap_summary: {
    outlook: {
      status: "viable_transition_material_gaps",
      label: "Viable with a material gap",
      confidence: "high",
      reason: "Core electrical maintenance and safety requirements are supported. Advanced PLC programming remains unverified.",
      what_would_change: "Candidate-confirmed PLC programming evidence or a posting that treats PLC work as preferred rather than mandatory.",
    },
  },
  requirements: [
    {
      id: "tour-r1",
      requirement: "Valid Ontario 309A electrician licence",
      priority: "required",
      evidence_match: "direct",
      gap_severity: "supported",
      requirement_origin: "credential",
      importance: "mandatory",
      confidence: "high",
      reason_code: "verified_direct_evidence",
      assessment_explanation: "The résumé explicitly identifies a current Ontario 309A licence.",
      next_action: "Confirm the licence remains current before applying.",
      safe_language: "Ontario 309A Construction and Maintenance Electrician.",
      evidence: [{ source: "base_resume", section: "certifications", line_index: 18, excerpt: "Ontario 309A Construction and Maintenance Electrician" }],
    },
    {
      id: "tour-r2",
      requirement: "Troubleshoot three-phase equipment and motor controls",
      priority: "responsibility",
      evidence_match: "direct",
      gap_severity: "supported",
      requirement_origin: "responsibility",
      importance: "mandatory",
      confidence: "high",
      reason_code: "verified_direct_evidence",
      assessment_explanation: "The résumé contains exact hands-on troubleshooting evidence.",
      next_action: "Keep the verified maintenance example near the top of the résumé.",
      safe_language: "Diagnosed three-phase motors and motor-control faults during scheduled and corrective maintenance.",
      evidence: [{ source: "base_resume", section: "experience", line_index: 7, excerpt: "Diagnosed three-phase motors and motor-control faults." }],
    },
    {
      id: "tour-r3",
      requirement: "Document preventive maintenance work in a CMMS",
      priority: "responsibility",
      evidence_match: "adjacent",
      gap_severity: "supported",
      requirement_origin: "responsibility",
      importance: "important",
      confidence: "high",
      assessment_explanation: "The résumé confirms maintenance documentation and work-order closure in a different CMMS.",
      next_action: "Name the candidate-used CMMS only if it is already confirmed.",
      safe_language: "Documented preventive maintenance and closed verified work orders in the site CMMS.",
      evidence: [{ source: "base_resume", section: "experience", line_index: 9, excerpt: "Documented preventive maintenance and closed work orders in Maximo." }],
    },
    {
      id: "tour-r4",
      requirement: "Program and modify Allen-Bradley PLC logic",
      priority: "required",
      evidence_match: "missing",
      gap_severity: "material_gap",
      requirement_origin: "mandatory_qualification",
      importance: "mandatory",
      confidence: "high",
      reason_code: "missing_mandatory_skill",
      assessment_explanation: "No candidate evidence confirms hands-on PLC programming or logic modification.",
      next_action: "Confirm genuine PLC programming evidence or keep this requirement visible as a gap.",
      unproven: "Hands-on Allen-Bradley PLC programming and logic modification.",
      application_impact: "The employer may screen for this capability even though the electrical foundation is strong.",
      evidence: [],
    },
  ],
});

export const productTourDesigns = Object.freeze(availableResumeDesigns().slice(0, 3));

export const productTourRenderPlan = Object.freeze({
  designId: productTourDesigns[0].id,
  designName: productTourDesigns[0].displayName,
  strategyId: "skilled-trades-field-services-v1",
  strategyName: "Skilled Trades / Field Services",
  contentHash: "synthetic-product-tour",
  visualTokens: productTourDesigns[0].visualTokens,
  header: {
    fullName: productTourCandidate.name,
    headline: productTourCandidate.headline,
    contactLine: productTourCandidate.contact,
  },
  sections: [
    {
      id: "summary",
      type: "paragraph",
      heading: "Professional Summary",
      items: [{ id: "summary-1", text: "Licensed industrial electrician with verified experience in electrical troubleshooting, preventive maintenance, motor controls, and safe work practices." }],
    },
    {
      id: "skills",
      type: "inline-list",
      heading: "Core Capabilities",
      items: [
        { id: "skill-1", text: "Three-phase troubleshooting" },
        { id: "skill-2", text: "Motor controls" },
        { id: "skill-3", text: "Lockout/tagout" },
        { id: "skill-4", text: "Preventive maintenance" },
      ],
    },
    {
      id: "experience",
      type: "experience",
      heading: "Professional Experience",
      items: [{
        id: "experience-1",
        title: "Industrial Electrician",
        employer: "Maple Works",
        location: "Hamilton, Ontario",
        dateDisplay: "2021–Present",
        bullets: [
          { id: "bullet-1", text: "Diagnosed three-phase motors and motor-control faults during scheduled and corrective maintenance." },
          { id: "bullet-2", text: "Documented preventive maintenance and closed verified work orders in Maximo." },
        ],
      }],
    },
    {
      id: "certifications",
      type: "credentials",
      heading: "Licences & Certifications",
      items: [{ id: "credential-1", name: "Ontario 309A Construction and Maintenance Electrician", issuer: "Skilled Trades Ontario", dateDisplay: "Current" }],
    },
  ],
});
