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

export const productTourPostingText = `Facilities Electrician
Northline Manufacturing — Hamilton, Ontario
Full-time, on-site

Maintain and troubleshoot production electrical systems in a safety-first manufacturing environment. Complete preventive and corrective maintenance, document work accurately, and partner with operations to reduce downtime.

Responsibilities
- Troubleshoot three-phase electrical equipment, motors, starters, and motor controls.
- Complete preventive maintenance and document work orders in the CMMS.
- Apply lockout/tagout procedures and interpret electrical drawings.
- Support production teams during equipment faults and planned shutdowns.

Required qualifications
- Current Ontario 309A Construction and Maintenance Electrician licence.
- Experience with three-phase systems and industrial motor controls.
- Ability to use electrical drawings and follow lockout/tagout procedures.
- Hands-on Allen-Bradley PLC programming and logic modification.

Preferred qualifications
- Experience using Maximo or another CMMS.
- Manufacturing or facilities-maintenance experience.`;

export const productTourJobBrief = Object.freeze({
  title: productTourPosting.title,
  company: productTourPosting.company,
  location: "Hamilton, Ontario",
  type: "Full-time · On-site",
  category: "trades",
  description: "Maintain and troubleshoot production electrical systems in a safety-first manufacturing environment. Complete preventive and corrective maintenance, document work accurately, and partner with operations to reduce downtime.",
  responsibilities: productTourPosting.responsibilities,
  required_qualifications: [
    "Current Ontario 309A Construction and Maintenance Electrician licence",
    "Experience with three-phase systems and industrial motor controls",
    "Ability to use electrical drawings and follow lockout/tagout procedures",
    "Hands-on Allen-Bradley PLC programming and logic modification",
  ],
  preferred_qualifications: ["Experience using Maximo or another CMMS", "Manufacturing or facilities-maintenance experience"],
  keywords: ["Ontario 309A", "three-phase", "motor controls", "lockout/tagout", "CMMS", "Allen-Bradley PLC"],
  source_url: "",
  source_review: {
    status: "complete",
    page_count: 1,
    user_confirmed_complete: true,
    conflicts: [],
    conflicts_resolved: true,
  },
});

export const productTourReview = Object.freeze({
  application_ready: false,
  posting: { status: "complete", reason: "The full posting was pasted and reviewed by the user." },
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
  readiness: {
    status: "significant_gap",
    reason: "The electrical foundation is strong, but hands-on Allen-Bradley PLC programming remains a material mandatory gap.",
  },
  coverage: { direct: 2, adjacent: 1, transferable: 0, missing: 1, total: 4 },
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

export const productTourResume = Object.freeze({
  name: productTourCandidate.name,
  title: productTourCandidate.headline,
  contact: productTourCandidate.contact,
  profile: "Licensed industrial electrician with verified experience in three-phase troubleshooting, motor controls, preventive maintenance, and safe work practices.",
  skills: ["Three-phase troubleshooting", "Motor controls", "Lockout/tagout", "Preventive maintenance", "Maximo CMMS", "Electrical drawings"],
  experience: [{
    role: "Industrial Electrician",
    company: "Maple Works",
    location: "Hamilton, Ontario",
    dates: "2021–Present",
    bullets: [
      { id: "tour-bullet-1", text: "Diagnosed three-phase motors and motor-control faults during scheduled and corrective maintenance.", responsibilityLevel: "performed", relevance: "direct" },
      { id: "tour-bullet-2", text: "Documented preventive maintenance and closed verified work orders in Maximo.", responsibilityLevel: "performed", relevance: "adjacent" },
      { id: "tour-bullet-3", text: "Applied lockout/tagout procedures and interpreted electrical drawings during equipment repairs.", responsibilityLevel: "performed", relevance: "direct" },
    ],
  }],
  certifications: [{ name: "Ontario 309A Construction and Maintenance Electrician", issuer: "Skilled Trades Ontario", dates: "Current" }],
  education: [{ degree: "Electrical Techniques Diploma", institution: "Ontario Technical College", dates: "2020" }],
  languages: [{ language: "English", proficiency: "Fluent" }],
  content_strategy: "direct",
  fit_assessment: {
    path: "adjacent",
    recommended_level: "Licensed facilities electrician with a transparent controls-programming gap",
    note: "Lead with verified industrial electrical maintenance evidence. Keep Allen-Bradley PLC programming visible as unverified rather than adding it to the résumé.",
  },
});

export const productTourTailoredResult = Object.freeze({
  resume: productTourResume,
  atsReview: productTourReview,
  evidenceQuestions: [],
});
