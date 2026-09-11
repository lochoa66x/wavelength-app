import test from "node:test";
import { sanitizeTailoringAnalysis, findSemanticIntegrityIssues } from "../api/_lib/tailoringEvidence.js";
import assert from "node:assert/strict";
import { buildAtsReview, buildTailoringChangeLedger, sourceHistoryEntries, missingSourceQualifications } from "../api/_lib/atsValidation.js";
import { claimMeaningIssues, hasInternalDocumentLanguage, requirementEvidenceBoundary } from "../src/documentIntegrity.js";
import { buildApplicationRiskView } from "../src/applicationRisk.js";
import { shapeTailoredResumeWithReview } from "../api/_lib/resumeQuality.js";
import { prepareCandidateEvidenceForSubmission } from "../src/evidenceRefinement.js";
import { validateCandidateEvidence, formatCandidateEvidence } from "../api/_lib/candidateEvidence.js";
import { applyTailoringChangeDecision } from "../src/tailoringChanges.js";
import { createCoverLetterPlan, coverLetterToPlainText, createCoverLetterExportContext, getCoverLetterReadiness, updateCoverLetterParagraph } from "../src/coverLetterModel.js";

const architect = { role: "Solution Architect", company: "Deloitte Canada", dates: "2022–2024", bullets: ["Led the Master Data team through testing."] };
const designer = { role: "Senior Solution Designer", company: "Deloitte Canada", dates: "2019–2021", bullets: ["Prepared functional specifications for Contract Accounts."] };
const base = "Jordan Example\nProfessional Experience\nSolution Architect - Deloitte Canada | 2022–2024\nLed the Master Data team through testing.\nSenior Solution Designer - Deloitte Canada | 2019–2021\nPrepared functional specifications for Contract Accounts.\nEducation\nBachelor of Commerce\nExample University\nCertifications\nSAP Finance Certification";

test("employment inventory recognizes common inline, parenthesized, and multiline headers", () => {
  for (const header of [
    "Senior Solution Designer - Deloitte Canada | 2019–2021",
    "Senior Solution Designer | Deloitte Canada (2019–2021)",
    "2019–2021 | Senior Solution Designer | Deloitte Canada",
    "Senior Solution Designer\nDeloitte Canada\n2019–2021",
    "Deloitte Canada\nSenior Solution Designer\n2019–2021",
    "Senior Solution Designer - Deloitte Canada | January 2019 – December 2021",
  ]) {
    const entries = sourceHistoryEntries(header);
    assert.equal(entries.length, 1, header);
    assert.equal(entries[0].role, designer.role, header);
    assert.equal(entries[0].company, designer.company, header);
  }
});

test("missing intermediate Deloitte role blocks integrity even with accurate included roles", () => {
  const review = buildAtsReview({ name: "Jordan Example", experience: [architect] }, base, {});
  assert.equal(review.integrity.status, "blocked");
  assert.equal(review.missing_history.length, 1);
  assert.equal(review.missing_history[0].role, designer.role);
});

test("omitted degree and certification are detected separately from training", () => {
  assert.equal(missingSourceQualifications({}, base).length, 2);
  assert.deepEqual(missingSourceQualifications({ education: [{ degree: "Bachelor of Commerce", institution: "Example University" }], certifications: ["SAP Finance Certification"] }, base), []);
});

test("similar accomplishments in different positions do not erase one role's content", () => {
  const result = shapeTailoredResumeWithReview({ name: "Jordan Example", experience: [architect, { ...designer, bullets: architect.bullets }] }, { requirements: [] });
  assert.equal(result.resume.experience.length, 2);
  assert.equal(result.resume.experience[1].bullets.length, 1);
});

test("training and guidance cannot become responsibility for configuration", () => {
  const original = "Provided training and guidance for the configuration of Consumer and Mortgage Loans.";
  const proposed = "Responsible for the configuration of Consumer and Mortgage Loans.";
  const [change] = buildTailoringChangeLedger({ experience: [{ role: "Consultant", company: "Example", dates: "2009–2010", bullets: [proposed] }] }, `Consultant - Example | 2009–2010\n${original}`);
  assert.equal(change.citation_complete, false);
  assert.match(change.meaning_issues.join(" "), /Training or guidance/);
});

test("projected results remain projected without rejecting a separately realized metric", () => {
  const source = "The project reduced implementation time by 60% and projected sales-cycle improvements of 40%.";
  assert.equal(claimMeaningIssues("Improved sales cycles by 40%.", [source]).length, 1);
  assert.deepEqual(claimMeaningIssues("Reduced implementation time by 60%.", [source]), []);
  assert.deepEqual(claimMeaningIssues("Projected sales-cycle improvements of 40%.", [source]), []);
});

test("project achievements cannot establish PMP or SAP Activate certification", () => {
  assert.equal(requirementEvidenceBoundary("PMP and/or SAP Activate certification", "Contributed to SAP architecture and reduced implementation time.").valid, false);
  assert.equal(requirementEvidenceBoundary("PMP and/or SAP Activate certification", "Project Management Professional (PMP) certification").valid, true);
});

test("PMO reporting is only partial support for compound delivery ownership", () => {
  const boundary = requirementEvidenceBoundary("Own the project plan, budget, resourcing, RAID log, and steering committee reporting", "Monitored progress and consolidated reporting for the Project Manager.");
  assert.equal(boundary.classification, "adjacent");
});

test("historical provenance cannot borrow leadership from another engagement", () => {
  const source = "Consultant - SAP Germany | 2010–2014\nProvided training for SAP banking configuration.\nLead Consultant - BD Consultores | 2009–2010\nLed SAP banking configuration at DESYFIN.";
  const [change] = buildTailoringChangeLedger({ experience: [{ role: "Consultant", company: "SAP Germany", dates: "2010–2014", bullets: ["Led SAP banking configuration at DESYFIN."] }] }, source);
  assert.equal(change.citation_complete, false);
  assert.ok(change.evidence_citations.every((citation) => citation.line_index === 2));
});

test("a multi-source bullet shows a synthesis and cannot restore a fragment", () => {
  const source = "Consultant - Example | 2020–2024\nConfigured Contract Accounts.\nDocumented functional specifications.";
  const resume = { experience: [{ role: "Consultant", company: "Example", dates: "2020–2024", bullets: ["Configured Contract Accounts and documented functional specifications."] }] };
  const [change] = buildTailoringChangeLedger(resume, source);
  assert.equal(change.change_type, "synthesized");
  assert.equal(change.restorable_original, false);
  assert.equal(applyTailoringChangeDecision(resume, change, "original"), resume);
});

test("legacy unscoped change cannot overwrite a user edit or restore unrelated text", () => {
  const resume = { experience: [{ bullets: ["My new wording."] }] };
  const change = { section: "experience", experience_index: 0, bullet_index: 0, original: "Old source.", proposed: "Old proposal." };
  assert.equal(applyTailoringChangeDecision(resume, change, "original"), resume);
  assert.equal(applyTailoringChangeDecision(resume, { ...change, restorable_original: true }, "original"), resume);
});

test("candidate level survives submission and API validation without a compulsory example", () => {
  for (const level of ["knowledge", "applied", "led", "unspecified"]) {
    const selected = prepareCandidateEvidenceForSubmission([{ requirement_id: "R1", requirement: "Apply SAP Activate", evidence_kind: "self_attested_capability", answer_status: "yes", capability_level: level }]);
    const checked = validateCandidateEvidence(selected);
    assert.deepEqual(checked.errors, []);
    assert.equal(checked.evidence[0].capability_level, level);
    assert.match(formatCandidateEvidence(checked.evidence), new RegExp(`experience level: ${level}`));
  }
});

test("central responsibilities stay visible even when all formal qualifications match", () => {
  const view = buildApplicationRiskView({ posting_readiness: { fit_allowed: true }, candidate_fit: { status: "strong", confidence: "high" }, requirements: [
    { id: "R1", requirement: "Bachelor's degree", priority: "required", evidence_match: "direct" },
    { id: "R2", requirement: "Lead end-to-end SAP migration", priority: "responsibility", evidence_match: "missing", gap_severity: "development_gap" },
    { id: "R3", requirement: "Own budget and resourcing", priority: "responsibility", evidence_match: "adjacent" },
  ] });
  assert.equal(view.coreCounts.total, 3);
  assert.equal(view.coreCounts.missing, 1);
  assert.equal(view.coreCounts.relatedEvidence, 1);
  assert.notEqual(view.outlook.status, "strong_verified_alignment");
  assert.notEqual(view.outlook.confidence, "high");
  const incomplete = buildApplicationRiskView({ requirements: [{ id: "R1", priority: "responsibility", evidence_match: "missing" }] });
  assert.equal(incomplete.outlook.confidence, "unavailable");
});

const context = {
  baseResume: base,
  resumeData: { name: "Jordan Example", experience: [architect, designer] },
  item: { title: "SAP Migration Lead", company: "Architecture In Motion", location: "Mississauga, ON; Remote (Pakistan)" },
  atsReview: { posting_readiness: { status: "reviewed_complete", fit_allowed: true, application_ready_allowed: true }, requirements: [{ id: "R1" }], coverage: { direct: 1 }, readiness: { status: "strong_fit" } },
};
const letter = { paragraphs: [
  { id: "opening", text: "I led the Master Data team through testing.", evidence_refs: architect.bullets },
  { id: "evidence", text: "I prepared functional specifications for Contract Accounts.", evidence_refs: designer.bullets },
  { id: "closing", text: "I would welcome a conversation about the migration role." },
] };

test("internal wording in a legacy letter is preserved for review but cannot be exported", () => {
  const plan = createCoverLetterPlan({ ...letter, paragraphs: [{ ...letter.paragraphs[0], text: "My candidate-selected capabilities include applying SAP Activate." }, ...letter.paragraphs.slice(1)] }, context);
  assert.equal(getCoverLetterReadiness(plan, context).internalLanguage, true);
  assert.match(plan.paragraphs[0].text, /candidate-selected/);
  assert.throws(() => createCoverLetterExportContext(plan, context), /internal application wording/);
  assert.equal(hasInternalDocumentLanguage("I prepared evidence for the audit."), false);
});

test("recipient block omits job location conflicts while the target retains the reviewed data", () => {
  const plan = createCoverLetterPlan(letter, context);
  assert.equal(plan.target.location, context.item.location);
  assert.doesNotMatch(coverLetterToPlainText(plan), /Pakistan|Mississauga/);
  const addressed = createCoverLetterPlan(letter, { ...context, item: { ...context.item, employerAddress: "123 Example Avenue" } });
  assert.match(coverLetterToPlainText(addressed), /123 Example Avenue/);
});

test("a safe paragraph edit survives plan export authorization", () => {
  const plan = createCoverLetterPlan(letter, context);
  const changed = updateCoverLetterParagraph(plan, "opening", "I led the Master Data team through testing at Deloitte Canada.", context);
  assert.equal(changed.ok, true);
  assert.match(createCoverLetterExportContext(changed.plan, context).plan.paragraphs[0].text, /Deloitte Canada/);
});

test("a capability-level change marks an older letter as needing refresh", () => {
  const plan = createCoverLetterPlan(letter, context);
  assert.equal(getCoverLetterReadiness(plan, { ...context, candidateEvidence: [{ requirement_id: "R1", capability_level: "applied" }] }).stale, true);
});


test("unrelated degree evidence cannot support budget ownership", () => {
  assert.equal(requirementEvidenceBoundary("Own the project budget and resourcing", "Bachelor of Commerce").valid, false);
});

test("training consolidation preserves different providers and dates", () => {
  const resume = { name: "Jordan Example", experience: [architect], training: [
    { name: "SAP Loans Management", provider: "SAP Canada", dates: "" },
    { name: "Loans Management", provider: "SAP Canada", dates: "" },
    { name: "SAP Loans Management", provider: "SAP Mexico", dates: "2023" },
  ] };
  const result = shapeTailoredResumeWithReview(resume, { requirements: [] }, "Professional Training\nSAP Loans Management | SAP Canada");
  assert.equal(result.resume.training.length, 2);
  assert.equal(result.resume.training[1].dates, "2023");
});


test("a capability selection that echoes certification wording does not establish the credential", () => {
  const selected = prepareCandidateEvidenceForSubmission([{ requirement_id: "R1", requirement: "PMP certification", evidence_kind: "self_attested_capability", answer_status: "yes", capability_level: "led" }]);
  const notes = validateCandidateEvidence(selected).evidence;
  const result = sanitizeTailoringAnalysis({ requirements: [{ id: "R1", requirement: "PMP certification", priority: "preferred", evidence_match: "direct", resume_evidence: notes[0].answer }] }, "Jordan Example\nSAP consultant", { status: "complete", fit_allowed: true, application_ready_allowed: true }, [], notes);
  assert.equal(result.requirements[0].evidence_match, "missing");
});


test("internal generation terminology in a resume summary is a blocking claim issue", () => {
  const issues = findSemanticIntegrityIssues({ profile: "My candidate-selected capabilities include SAP delivery." }, "SAP delivery", {}, "SAP Consultant");
  assert.ok(issues.risky_claims.some((issue) => /Internal generation terminology/.test(issue.claim)));
});
