// Reconstructed regression example, not a live candidate record or AI output.
export const qualityResume = {
  name: "Jordan Example", title: "Senior SAP Solution Architect",
  contact: "jordan@example.com | 416-555-0100 | Toronto, Ontario",
  candidate: { city: "Toronto", region: "Ontario" },
  profile: "SAP solution architect with consulting experience in public-sector and financial-services implementations. Led Master Data testing activities and contributed to SAP S/4HANA integration, cutover, and release support. Earlier assignments include consultant-team leadership, functional design, and PMO reporting, providing a practical foundation for coordinating complex SAP delivery work.",
  skills: ["SAP S/4HANA and SAP MDG", "SAP FI-CA and PSCD", "Functional design and integration", "UAT and defect resolution", "Cutover and release support", "Team coordination and PMO reporting"],
  experience: [
    { role: "Solution Architect", company: "Deloitte Canada", dates: "2022–2024", bullets: ["Led the Master Data team through user acceptance testing, mock cutover activities, and defect resolution for the CBSA engagement.", "Integrated SAP S/4HANA with SAP Master Data Governance and an external master-data solution through SAP PI/PO.", "Contributed to cutover, go-live, and release support for the CBSA implementation."] },
    { role: "Senior Solution Designer", company: "Deloitte Canada", dates: "2019–2021", bullets: ["Prepared functional specifications for Contract Accounts and Contract Objects.", "Supported testing and integration activities for the SAP PSCD implementation."] },
    { role: "Senior Consultant", company: "Axiome Canada", dates: "2014–2018", bullets: ["Contributed to architecture definition for the Advance Banking Platform project, which reported a 60% reduction in implementation time and projected sales-cycle improvements of 40%.", "Oversaw development, customization, testing, documentation, and implementation of SAP banking software at John Deere Financial."] },
    { role: "SAP Banking Consultant", company: "SAP Canada", location: "Germany", dates: "2010–2014", bullets: ["Participated in SAP Loans Management data migration, go-live, and support.", "Configured, tested, and documented SAP Loans Management components for SAP Germany."] },
    { role: "Lead Consultant", company: "BD Consultores", location: "San José, Costa Rica", dates: "2009", bullets: ["Led a consultant team implementing SAP banking at Financiera DESYFIN, covering gap analysis, blueprint documentation, and functional design.", "Provided training and guidance for Business Partner, Deposits Management, and Consumer and Mortgage Loans configuration."] },
    { role: "QA Consultant", company: "North American Software", dates: "2003–2009", bullets: ["Supervised implementation of Consumer and Mortgage Loans at FONATUR, including solution blueprint, data-migration strategy, and go-live support."] },
    { role: "PMO Consultant", company: "Capgemini", dates: "2003–2009", bullets: ["Monitored progress, coordinated deliverable dates, and consolidated reporting for Project Manager reviews at NISSAN."] },
  ],
  education: [{ degree: "Bachelor of Business Finance", institution: "Example University", dates: "2003" }],
  certifications: ["SAP Finance Certification", "SAP Banking Services Certification"],
  training: [{ name: "SAP Loans Management", provider: "SAP Canada" }, { name: "SAP Collateral Management", provider: "SAP Mexico" }, { name: "SAP Finance Academy", provider: "SAP Mexico" }],
  languages: ["English: Fluent", "Spanish: Native", "French: Basic"],
};

export const qualityItem = { id: "quality-regression", title: "SAP S/4HANA Project Manager (Migration Lead)", company: "Architecture In Motion Inc.", location: "Mississauga, ON; Remote (Pakistan)" };
export const qualityBase = [qualityResume.name, qualityResume.contact, qualityResume.profile, "Professional Experience", ...qualityResume.experience.flatMap((entry) => [`${entry.role} - ${entry.company} | ${entry.dates}`, ...entry.bullets]), "Education", "Bachelor of Business Finance", "Example University", "Certifications", ...qualityResume.certifications, "Professional Training", ...qualityResume.training.map((item) => `${item.name} | ${item.provider}`)].join("\n");
export const qualityReview = {
  application_ready: true,
  posting_readiness: { status: "reviewed_complete", fit_allowed: true, application_ready_allowed: true },
  requirements: [
    { id: "R1", requirement: "Bachelor's degree", priority: "required", evidence_match: "direct" },
    { id: "R2", requirement: "Lead a full SAP migration", priority: "responsibility", evidence_match: "adjacent", resume_evidence: qualityResume.experience[0].bullets[0] },
    { id: "R3", requirement: "Own budget and resourcing", priority: "responsibility", evidence_match: "missing", gap_severity: "development_gap" },
  ],
  coverage: { direct: 1, adjacent: 1, transferable: 0, missing: 1 },
  readiness: { status: "credible_stretch" }, candidate_fit: { status: "adjacent", confidence: "medium" },
  integrity: { status: "pass" }, writing: { status: "pass" }, identity: { status: "complete" }, parseability: { status: "pass" },
  export_readiness: { status: "ready", application_ready: true, blockers: [] },
};

export const qualityLetter = {
  createdAt: "2026-09-10T12:00:00.000Z", salutation: "Dear Hiring Team,", signoff: "Sincerely,", voice: "direct", length: "standard",
  paragraphs: [
    { id: "opening", purpose: "opening", text: "I am applying for the SAP S/4HANA Project Manager (Migration Lead) position at Architecture In Motion. My SAP consulting background combines solution architecture, team leadership, and implementation support across public-sector and financial-services engagements. Your manufacturing client's migration calls for clear coordination through go-live and hypercare; my experience includes bringing functional design, testing, integration, and delivery teams together around SAP implementation work.", evidence_refs: [qualityResume.profile], requirement_refs: ["Lead migration delivery through go-live and hypercare"], explanation: "Introduces the relevant delivery foundation without claiming ownership of a manufacturing migration." },
    { id: "delivery", purpose: "evidence", text: "At Deloitte Canada, supporting CBSA, I led the Master Data team through user acceptance testing, mock cutover activities, and defect resolution. I also integrated SAP S/4HANA with SAP Master Data Governance and an external master-data solution, and contributed to cutover, go-live, and release support. This work gives me a concrete basis for coordinating the testing and integration activities that need to come together before a release.", evidence_refs: qualityResume.experience[0].bullets, requirement_refs: ["Coordinate cutover planning and go-live readiness"], explanation: "Uses the Deloitte engagement for a focused testing and integration example." },
    { id: "leadership", purpose: "evidence", text: "Earlier, at Financiera DESYFIN, I led a consultant team implementing SAP banking, covering gap analysis, blueprint documentation, and functional design. My PMO work at NISSAN included monitoring progress, coordinating deliverable dates, and consolidating reports for Project Manager reviews. Together, these assignments add team leadership and delivery reporting to my technical background. I would bring that combination to coordinating consultants, maintaining visibility of deliverables, and supporting decisions across your client's implementation team.", evidence_refs: [qualityResume.experience[4].bullets[0], qualityResume.experience[6].bullets[0]], requirement_refs: ["Coordinate consulting teams and delivery reporting"], explanation: "Connects team leadership and PMO support without turning reporting into budget ownership." },
    { id: "closing", purpose: "closing", text: "I would welcome a conversation about the migration's delivery priorities and how my SAP architecture and implementation experience could support the engagement. Thank you for considering my application.", evidence_refs: [], requirement_refs: [], explanation: "Closes without adding new candidate claims." },
  ],
};
