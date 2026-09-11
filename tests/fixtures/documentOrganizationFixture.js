import { qualityResume, qualityReview, qualityItem, qualityLetter } from "./documentQualityFixture.js";
import { organizeResumeSections } from "../../src/resumeOrganization.js";

// Reconstructed examples for document QA. These are not live model results.
export const organizationInput = {
  ...qualityResume,
  contact: "jordan@example.com | 416-555-0100 | 12 Example Street, Toronto, Ontario",
  profile: "SAP solution architect with consulting experience in public-sector and financial-services implementations. Led Master Data testing and SAP integration, and contributed to cutover and release support. Earlier assignments include consultant-team leadership, functional design, and PMO reporting.",
  experience: [...qualityResume.experience.slice(0, 6), { role: "Consultant", company: "North American Software", dates: "2003–2009", bullets: ["Prepared functional specifications and supported testing for banking implementations."] }, ...qualityResume.experience.slice(6)],
  training: [...qualityResume.training, { name: "Language skills" }, { name: "English: Fluent" }, { name: "Spanish: Native" }, { name: "French: Basic" }, { name: "Security Clearance" }, { name: "Secret Level" }],
};
export const organizationResume = organizeResumeSections(organizationInput);
export const organizationBase = [organizationResume.name, organizationResume.profile, "Professional Experience", ...organizationResume.experience.flatMap((entry) => [`${entry.role} - ${entry.company} | ${entry.dates}`, ...entry.bullets]), "Education", "Bachelor of Business Finance", "Example University", "Certifications", ...organizationResume.certifications, "Professional Training", ...qualityResume.training.map((entry) => `${entry.name} | ${entry.provider}`), "Language skills", ...organizationResume.languages, "Security Clearance", "Secret Level"].join("\n");
export const organizationItem = { ...qualityItem, id: "organization-editorial-qa", company: "QA Example Migration" };
export const organizationReview = { ...qualityReview, fit_assessment: { path: "transferable" } };
const paragraph = (id, purpose, text, evidence_refs) => ({ id, purpose, text, evidence_refs, requirement_refs: purpose === "closing" ? [] : ["Coordinate implementation testing and delivery reporting"], explanation: "Source-backed example for editorial QA." });
export const standardOrganizationLetter = {
  ...qualityLetter,
  paragraphs: [
    paragraph("opening", "opening", "I am applying for the SAP S/4HANA Project Manager role. My consulting background combines solution architecture, Master Data team leadership, and implementation support across public-sector and financial-services engagements.", [organizationResume.profile]),
    paragraph("delivery", "evidence", "At Deloitte Canada, on the CBSA engagement, I led the Master Data team through user acceptance testing, mock cutover activities, and defect resolution. I integrated SAP S/4HANA with SAP Master Data Governance and an external master-data solution through SAP PI/PO. I also contributed to cutover, go-live, and release support.", organizationResume.experience[0].bullets),
    paragraph("leadership", "evidence", "At Financiera DESYFIN, I led a consultant team implementing SAP banking through gap analysis, blueprint documentation, and functional design. My PMO assignment at NISSAN involved monitoring progress, coordinating deliverable dates, and consolidating reports for Project Manager reviews. These assignments included both technical delivery and keeping project decisions informed by the status of the work.", [organizationResume.experience[4].bullets[0], organizationResume.experience[7].bullets[0]]),
    paragraph("closing", "closing", "I would welcome a conversation about the engagement's delivery priorities and how my SAP architecture and implementation experience could support the team. Thank you for considering my application.", []),
  ],
};
export const shortOrganizationLetter = {
  ...standardOrganizationLetter, voice: "warm", length: "short",
  paragraphs: [
    paragraph("opening", "opening", "I am applying for the SAP S/4HANA Project Manager role with a background in SAP solution architecture, Master Data team leadership, and implementation support.", [organizationResume.profile]),
    paragraph("delivery", "evidence", "At Deloitte Canada, I led the CBSA Master Data team through user acceptance testing, mock cutover activities, and defect resolution. I also integrated SAP S/4HANA with SAP Master Data Governance and an external master-data solution, and contributed to go-live and release support. This assignment combined technical integration with coordinating the team's testing work.", organizationResume.experience[0].bullets),
    paragraph("closing", "closing", "Thank you for considering my application. I would welcome a conversation about the team's delivery priorities and how my SAP experience could contribute.", []),
  ],
};
