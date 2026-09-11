import test from "node:test";
import assert from "node:assert/strict";
import { sourceHistoryEntries, buildAtsReview, missingSourceQualifications, restoreEmptyHistoryFromSource } from "../api/_lib/atsValidation.js";
import { createSafeResumeFallback } from "../api/_lib/safeResumeFallback.js";
import { prepareCandidateEvidenceForSubmission } from "../src/evidenceRefinement.js";
import { capabilityStatement } from "../src/capabilityClaims.js";
import { validateCandidateEvidence, formatCandidateEvidence } from "../api/_lib/candidateEvidence.js";
import { claimMeaningIssues, requirementEvidenceBoundary } from "../src/documentIntegrity.js";
import { validateCoverLetterEdit, createCoverLetterPlan, createCoverLetterExportContext, getCoverLetterReadiness } from "../src/coverLetterModel.js";
import { createResumeExportContext, getResumeExportReadiness, validateResumeExportContext, getResumeExportNotice } from "../src/resumeReadiness.js";
import { createResumeDocxBlob } from "../src/resumeDocx.js";
import { createResumePdfBytes } from "../src/resumePdf.js";
import { createCoverLetterPdfBlob } from "../src/coverLetterPdf.js";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { qualityResume, qualityReview, qualityLetter, qualityBase, qualityItem } from "./fixtures/documentQualityFixture.js";
import { resumeIdentityFromText } from "../src/resumeIdentity.js";
import { createTailorHandler } from "../api/tailor.js";
import JSZip from "jszip";

// Synthetic employer/client layout reproducing the structure seen in live QA.
export const groupedBase = `Jordan Example
Professional Experience
Cedar Consulting
Solution Architect at Revenue Agency, Canada (2022 – 2024)
Led Master Data testing and defect resolution.
Senior Solution Designer at Revenue Agency, Canada (2019 – 2021)
Prepared functional specifications for Contract Accounts.
Previous experience
Birch Consulting, Canada (2014 – 2018)
Senior Consultant at Finance Client, USA
Oversaw SAP banking implementation.
Maple Software, Mexico (2003 – 2009)
QA Consultant at Tourism Client, Mexico
Supervised loans testing at Tourism Client.
QA Consultant at Leasing Client, Mexico
Supervised loans testing at Leasing Client.
Senior Consultant at Cooperative Client, Mexico
Led deposits configuration at Cooperative Client.
Education
Bachelor of Business Finance
Example University
SAP Training and Certification
Various SAP Training Facilities
Programs Completed: Loans Management
Professional affiliations/certifications
SAP Finance Certification
Training
SAP Loans Management, SAP Canada`;
export const groupedResume = {
  name: "Jordan Example", title: "Solution Architect", profile: "Solution architect with SAP consulting experience.", skills: ["SAP"],
  experience: [
    { role: "Solution Architect", company: "Cedar Consulting", dates: "2022 – 2024", bullets: ["Led Master Data testing and defect resolution."] },
    { role: "Senior Solution Designer", company: "Cedar Consulting", dates: "2019 – 2021", bullets: ["Prepared functional specifications for Contract Accounts."] },
    { role: "Senior Consultant", company: "Birch Consulting", dates: "2014 – 2018", bullets: ["Oversaw SAP banking implementation."] },
    { role: "QA Consultant", company: "Maple Software", dates: "2003 – 2009", bullets: ["Supervised loans testing at Tourism Client.", "Supervised loans testing at Leasing Client."] },
    { role: "Senior Consultant", company: "Maple Software", dates: "2003 – 2009", bullets: ["Led deposits configuration at Cooperative Client."] },
  ],
  education: [{ degree: "Bachelor of Business Finance", institution: "Example University" }], certifications: ["SAP Finance Certification"],
};
const context = { baseResume: qualityBase, resumeData: qualityResume, atsReview: qualityReview, item: qualityItem };

test("QA grouped consulting history keeps employer, role, dates and client evidence together", () => {
  const entries = sourceHistoryEntries(groupedBase);
  assert.equal(entries.length, 5);
  assert.equal(entries[0].company, "Cedar Consulting");
  assert.equal(sourceHistoryEntries(groupedBase.replace("Led Master Data testing and defect resolution.", "Led Master Data testing during 2022–2024."))[1].company, "Cedar Consulting");
  const review = buildAtsReview(groupedResume, groupedBase, {}, { analysis: { requirements: [] } });
  assert.deepEqual(review.missing_history, []);
  assert.deepEqual(review.unsupported_history, []);
  assert.deepEqual(review.provenance_issues, []);
  const emptied = structuredClone(groupedResume);
  emptied.experience[4].bullets = [];
  const restored = restoreEmptyHistoryFromSource(emptied, groupedBase);
  assert.deepEqual(restored.experience[4].bullets, groupedResume.experience[4].bullets);
  assert.deepEqual(buildAtsReview(restored, groupedBase, {}, { analysis: { requirements: [] } }).provenance_issues, []);
  assert.deepEqual(missingSourceQualifications(groupedResume, groupedBase), []);
  const omitted = buildAtsReview({ ...groupedResume, experience: groupedResume.experience.filter((_, index) => index !== 1) }, groupedBase, {});
  assert.equal(omitted.missing_history.length, 1);
  const crossed = structuredClone(groupedResume);
  crossed.experience[0].bullets = [groupedResume.experience[4].bullets[0]];
  assert.ok(buildAtsReview(crossed, groupedBase, {}, { analysis: { requirements: [] } }).provenance_issues.length);
});

test("QA user examples survive capability submission and server validation; only generated statements refresh", () => {
  for (const answer of ["I have hands-on experience leading SAP testing at ExampleCo in 2024.", "I have knowledge of SAP testing from the ExampleCo project.", "I have led or owned work on SAP testing at ExampleCo."]) {
    const records = prepareCandidateEvidenceForSubmission([{ requirement_id: "R1", requirement: "SAP testing", evidence_kind: "self_attested_capability", answer_status: "yes", capability_level: "applied", answer }]);
    assert.equal(records[0].answer, answer);
    const checked = validateCandidateEvidence(records);
    assert.deepEqual(checked.errors, []);
    assert.match(formatCandidateEvidence(checked.evidence), /ExampleCo/);
  }
  const record = { requirement_id: "R1", requirement: "SAP testing", evidence_kind: "self_attested_capability", answer_status: "yes", capability_level: "knowledge" };
  const changed = prepareCandidateEvidenceForSubmission([{ ...record, answer: capabilityStatement({ ...record, capability_level: "led" }) }]);
  assert.equal(changed[0].answer, capabilityStatement(record));
});

test("QA forecast percentages retain their qualifier with whitespace, decimals, and repeated claims", () => {
  for (const [claim, source] of [["Reduced costs by 40 %.", "Projected cost reductions of 40%."], ["Reduced costs by 12.5%.", "Projected cost reductions of 12.5%."], ["Projected a 40% improvement. Achieved a 40% improvement.", "Projected a 40% improvement."]]) assert.ok(claimMeaningIssues(claim, [source]).length, claim);
  assert.deepEqual(claimMeaningIssues("Projected cost reductions of 12.5 %.", ["Projected cost reductions of 12.5%."]), []);
  assert.deepEqual(claimMeaningIssues("Reduced costs by 60% and projected sales-cycle improvements of 40%.", ["Reduced costs by 60% and projected sales-cycle improvements of 40%."]), []);
});

test("QA pending, negated, preparation-only and expired credentials cannot establish PMP certification", () => {
  for (const source of ["Currently studying toward PMP certification.", "PMP certification not held.", "Completed PMP exam preparation.", "PMP certification expired.", "I do not have PMP certification.", "Planning to obtain PMP certification."]) assert.equal(requirementEvidenceBoundary("PMP certification", source).valid, false, source);
  assert.equal(requirementEvidenceBoundary("PMP certification", "Project Management Professional (PMP) certification").valid, true);
  assert.equal(requirementEvidenceBoundary("PMP or SAP Activate certification", "PMP not held. SAP Activate certified.").valid, true);
});

test("QA letter edits cannot borrow leadership from unrelated résumé evidence", () => {
  const paragraph = { generatedText: "I supported SAP cutover and go-live support.", evidenceRefs: ["Supported SAP cutover and go-live support."] };
  const editContext = { baseResume: "Supported SAP cutover and go-live support. Led SAP testing." };
  assert.equal(validateCoverLetterEdit("I led SAP cutover and go-live support.", paragraph, editContext).ok, false);
  assert.equal(validateCoverLetterEdit(paragraph.generatedText, paragraph, editContext).ok, true);
  assert.equal(validateCoverLetterEdit("I led SAP testing activities.", { generatedText: "I led SAP testing activities.", evidenceRefs: ["Led SAP testing activities."] }, editContext).ok, true);
  const source = ["Participated in SAP functional specification documentation.", "Contributed in the creation of functional specifications for Contract Accounts."];
  assert.ok(claimMeaningIssues("I created functional specifications for Contract Accounts.", source).length);
  assert.deepEqual(claimMeaningIssues("I contributed to the creation of functional specifications for Contract Accounts.", source), []);
  const legacy = createCoverLetterPlan({ ...qualityLetter, paragraphs: [{ id: "opening", text: "I created functional specifications for Contract Accounts.", evidence_refs: source }, qualityLetter.paragraphs.at(-1)] }, context);
  assert.equal(getCoverLetterReadiness(legacy, context).meaningChanged, true);
  assert.throws(() => createCoverLetterExportContext(legacy, context), /scope or responsibility/);
});

test("QA known integrity failures cannot export through preliminary DOCX, PDF or a matching letter", async () => {
  const review = { ...qualityReview, integrity: { status: "blocked" } };
  assert.equal(getResumeExportReadiness(qualityResume, review).canExport, false);
  assert.equal(getResumeExportNotice(qualityResume, review).code, "integrity_blocked");
  const exported = createResumeExportContext(qualityResume, review);
  assert.throws(() => validateResumeExportContext(exported), /evidence|integrity/i);
  await assert.rejects(() => createResumeDocxBlob(exported), /evidence|integrity/i);
  await assert.rejects(() => createResumePdfBytes(exported), /evidence|integrity/i);
  const blockedContext = { ...context, atsReview: review };
  assert.equal(getCoverLetterReadiness(createCoverLetterPlan(qualityLetter, blockedContext), blockedContext).canExport, false);
  const preliminary = { ...qualityReview, readiness: { status: "significant_gap" } };
  assert.equal(validateResumeExportContext(createResumeExportContext(qualityResume, preliminary)).readiness.canExport, true);
});

test("QA conservative fallback preserves structured degrees and credentials instead of stringifying them", () => {
  const resume = { ...qualityResume, certifications: [{ name: "SAP Finance Certification", issuer: "SAP" }] };
  const result = createSafeResumeFallback(resume, { unsupported_metrics: [], provenance_issues: [] }, {});
  assert.deepEqual(result.resume.education, resume.education);
  assert.deepEqual(result.resume.certifications, resume.certifications);
  assert.doesNotMatch(JSON.stringify(result.resume), /\[object Object\]/);
});

test("QA long letter paragraphs export every line inside PDF page bounds", async () => {
  const longText = "W".repeat(2390) + "END";
  const plan = createCoverLetterPlan({ ...qualityLetter, paragraphs: [{ id: "long", text: longText }, { id: "closing", text: "Thank you for considering my application." }] }, context);
  const blob = await createCoverLetterPdfBlob(createCoverLetterExportContext(plan, context));
  const task = getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
  const pdf = await task.promise;
  let text = "";
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
    const page = await pdf.getPage(pageNumber);
    const items = (await page.getTextContent()).items.filter((item) => item.str?.trim());
    for (const item of items) {
      assert.ok(item.transform[5] >= 30, `page ${pageNumber}: text below bottom margin`);
      assert.ok(item.transform[5] <= page.view[3] - 20, `page ${pageNumber}: text above top margin`);
    }
    text += items.map((item) => item.str).join(" ") + " ";
  }
  assert.ok(text.replace(/\s+/g, "").includes(longText));
  await task.destroy();
});

test("QA letter-only intake recognizes a name followed by a professional title", () => {
  for (const separator of ["–", "—", "-", "|"]) {
    const baseResume = `Jordan Example ${separator} Solution Architect\njordan@example.com\nLed SAP testing.`;
    const candidateIdentity = resumeIdentityFromText(baseResume);
    assert.equal(candidateIdentity.name, "Jordan Example");
    const source = { ...context, baseResume, candidateIdentity, resumeData: { name: candidateIdentity.name, contact: candidateIdentity.contact } };
    const plan = createCoverLetterPlan(qualityLetter, source);
    assert.equal(createCoverLetterExportContext(plan, source).plan.candidate.fullName, "Jordan Example");
  }
  assert.equal(resumeIdentityFromText("Anne-Marie Dupont — Solution Architect").name, "Anne-Marie Dupont");
  assert.equal(resumeIdentityFromText("Solution Architect — Example Consulting").name, "");
});

test("QA API rebuild through DOCX/PDF preserves grouped history and qualifications", async () => {
  let drafts = 0;
  const handler = createTailorHandler({
    authenticate: async () => ({ user: { id: "synthetic-qa" }, supabase: {} }),
    loadListing: async () => ({ id: 42, title: "Solution Architect", company: "QA Sandbox", category: "technology", description: "Lead Master Data testing and prepare functional specifications for SAP implementations." }),
    getApiKey: () => "synthetic-key", getOpenAIKey: () => "",
    fetchImpl: async (_url, options) => {
      const request = JSON.parse(options.body);
      const name = request.tool_choice.name;
      let input;
      if (name === "return_tailoring_analysis") input = {
        posting_assessment: { status: "complete", reason: "Synthetic QA posting." },
        content_strategy: "direct", fit_assessment: { path: "direct", recommended_level: "Role-aligned", note: "Supported SAP background." },
        readiness: { status: "strong_fit", reason: "Supported SAP background." },
        requirements: [{ id: "R1", requirement: "Lead Master Data testing", priority: "required", evidence_match: "direct", resume_evidence: "Led Master Data testing and defect resolution.", safe_language: "Led Master Data testing", keywords: ["Master Data"] }],
        target_keywords: ["Master Data"], verified_transferable_skills: [], missing_evidence: [], prohibited_claims: [], candidate_questions: [],
      };
      else {
        drafts++;
        input = drafts === 1 ? { ...groupedResume, experience: groupedResume.experience.filter((_, index) => index !== 1) } : groupedResume;
      }
      return { ok: true, json: async () => ({ content: [{ type: "tool_use", name, input }] }) };
    },
  });
  const response = { status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
  await handler({ method: "POST", headers: { authorization: "Bearer synthetic-qa" }, body: { resume: groupedBase, listingId: 42 } }, response);
  assert.equal(response.statusCode, 200, JSON.stringify(response.body?.ats_review));
  assert.equal(response.body.repair_applied, true);
  assert.equal(drafts, 2);
  const exportContext = createResumeExportContext(response.body.resume, response.body.ats_review);
  const docx = await createResumeDocxBlob(exportContext);
  const zip = await JSZip.loadAsync(await docx.arrayBuffer());
  const xml = await zip.file("word/document.xml").async("string");
  const pdfBytes = await createResumePdfBytes(exportContext);
  const task = getDocument({ data: new Uint8Array(pdfBytes.bytes || pdfBytes) });
  const pdf = await task.promise;
  let text = "";
  for (let page = 1; page <= pdf.numPages; page++) text += (await (await pdf.getPage(page)).getTextContent()).items.map((item) => item.str || "").join(" ");
  for (const expected of ["Cedar Consulting", "Birch Consulting", "Maple Software", "Senior Solution Designer", "Bachelor of Business Finance", "SAP Finance Certification"]) {
    assert.ok(xml.includes(expected), `DOCX missing ${expected}`);
    assert.ok(text.includes(expected), `PDF missing ${expected}`);
  }
  await task.destroy();
});
