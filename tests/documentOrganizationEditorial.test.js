import test from "node:test";
import assert from "node:assert/strict";
import { shapeTailoredResumeWithReview } from "../api/_lib/resumeQuality.js";
import { createResumePackage, buildResumeRenderPlan, TEMPLATE_IDS, normalizeResumeForLegacyView } from "../src/resumeModel.js";
import { organizeResumeSections, groupResumeExperience, professionalContactLine } from "../src/resumeOrganization.js";
import { reviewCoverLetterWriting } from "../src/coverLetterWriting.js";
import { resumeDataToPlainText } from "../src/resumeText.js";
import { coverLetterControlInstructions, coverLetterLengthPolicy, coverLetterGenerationSettings } from "../src/coverLetterControls.js";
import { buildWritingReview } from "../api/_lib/resumeWriting.js";
import { createCoverLetterHandler } from "../api/cover-letter.js";
import { createCoverLetterSourceFingerprint } from "../src/coverLetterModel.js";
import { createResumePdfBytes } from "../src/resumePdf.js";
import { createResumeDocxBlob } from "../src/resumeDocx.js";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { fileURLToPath } from "node:url";
import JSZip from "jszip";

const base = `Jordan Lee
Professional Training:
SAP Loans Management | SAP Canada
Language skills:
English: Fluent
Spanish: Native
Security Clearance:
Secret Level
Professional Experience
Consultant - Cedar | 2020-2024
Supported SAP testing.`;
const resume = { name: "Jordan Lee", title: "SAP Consultant", profile: "SAP consultant with testing experience.", training: [{ name: "SAP Loans Management", provider: "SAP Canada", dates: "" }], languages: ["English: Fluent", "Spanish: Native"], experience: [{ role: "Consultant", company: "Cedar", dates: "2020-2024", bullets: ["Supported SAP testing."] }] };
const analysis = { fit_assessment: { path: "transferable" }, requirements: [{ requirement: "Cloud platform engineering", evidence_match: "missing" }], coverage: { direct: 0, adjacent: 0 } };

test("source restoration keeps language and clearance out of training", () => {
  const output = shapeTailoredResumeWithReview(resume, analysis, base).resume;
  assert.deepEqual(output.training.map((entry) => entry.name), ["SAP Loans Management"]);
  assert.deepEqual(output.languages, resume.languages);
  assert.deepEqual(output.additionalSections, [{ title: "Security Clearance", items: ["Secret Level"] }]);
});

test("structured section repair is idempotent and preserves distinct course providers and dates", () => {
  const malformed = { ...resume, training: [...resume.training, { name: "SAP Loans Management", provider: "SAP Mexico", dates: "2019" }, { name: "SAP Loans Management", provider: "SAP Mexico", dates: "2020" }, { name: "LANGUAGE SKILLS:" }, { name: "English: Fluent" }, { name: "Security Clearance" }, { name: "Secret Level" }] };
  const fixed = organizeResumeSections(malformed, base);
  assert.equal(fixed.training.length, 3);
  assert.deepEqual(fixed.languages, resume.languages);
  assert.deepEqual(organizeResumeSections(fixed, base), fixed);
  assert.equal(malformed.training.length, 7, "input remains unchanged");
  const canonical = createResumePackage(malformed);
  assert.equal(canonical.document.training.length, 3);
  assert.equal(canonical.document.additionalSections[0].title, "Security Clearance");
  assert.equal(normalizeResumeForLegacyView(canonical).additionalSections[0].title, "Security Clearance");
});

test("training restoration stops at common heading variants and retains later qualifications", () => {
  for (const heading of ["Languages", "Language Proficiency:", "Security Clearance", "Education", "Technical Skills", "Professional Experience", "Publications"]) {
    const output = shapeTailoredResumeWithReview({ name: "Jordan Lee" }, {}, `Professional Training\nData Analytics | York University\n${heading}\nDo not treat this as a course`).resume;
    assert.deepEqual(output.training.map((entry) => entry.name), ["Data Analytics"]);
  }
});

test("experienced transition documents lead with experience and standard section headings", () => {
  const plan = buildResumeRenderPlan(createResumePackage(resume, { atsReview: analysis }), { strategyId: TEMPLATE_IDS.CAREER_TRANSITION });
  const ids = plan.sections.map((section) => section.id);
  assert.ok(ids.indexOf("experience") < ids.indexOf("training"));
  assert.equal(plan.sections.find((section) => section.id === "summary").heading, "Professional Summary");
  assert.doesNotMatch(plan.sections.map((section) => section.heading).join(" "), /Transferable Strengths|Verified Projects/);
});

test("contiguous consulting roles share context without merging role records or dates", () => {
  const input = [
    { role: "QA Consultant", company: "North Software", location: "Mexico City", dates: "2003-2009", bullets: ["Tested loan configuration."] },
    { role: "Consultant", company: "North Software", location: "Mexico City", dates: "2003-2009", bullets: ["Supported go-live."] },
    { role: "PMO Consultant", company: "Capgemini", location: "Mexico City", dates: "2003-2009", bullets: ["Consolidated reporting."] },
  ];
  const pkg = createResumePackage({ ...resume, experience: input });
  const plan = buildResumeRenderPlan(pkg);
  const entries = plan.sections.find((section) => section.type === "experience").items;
  assert.equal(entries.length, 3);
  assert.equal(new Set(entries.map((entry) => entry.id)).size, 3);
  assert.equal(entries[0].groupHeading, "North Software | Mexico City | 2003-2009");
  assert.equal(entries[1].groupHeading, "");
  assert.equal(entries[1].grouped, true);
  assert.equal(entries[2].grouped, false);
  const plain = resumeDataToPlainText(plan);
  assert.equal((plain.match(/North Software/g) || []).length, 1);
  for (const role of input) { assert.ok(plain.includes(role.role)); assert.ok(plain.includes(role.bullets[0])); }
  assert.deepEqual(pkg.document.experience.map((entry) => entry.dateDisplay), input.map((entry) => entry.dates));
});

test("different periods and noncontiguous employers do not form a presentation group", () => {
  const entries = [
    { employer: "Cedar", dateDisplay: "2003-2009", location: "Toronto" },
    { employer: "Cedar", dateDisplay: "2010-2014", location: "Toronto" },
    { employer: "Birch", dateDisplay: "2003-2009", location: "Toronto" },
    { employer: "Cedar", dateDisplay: "2003-2009", location: "Toronto" },
  ];
  assert.ok(groupResumeExperience(entries).every((entry) => !entry.grouped));
});

test("professional contact line removes street addresses and preserves supplied contact methods", () => {
  const links = [{ url: "https://linkedin.com/in/jordan" }];
  assert.equal(professionalContactLine({ email: "jordan@example.com", phone: "416-555-0100", displayLocation: "Montreal, Quebec", contactLine: "jordan@example.com | 416-555-0100 | 42 Rue des Exemples. Montreal Quebec.", professionalLinks: links }), "jordan@example.com | 416-555-0100 | Montreal, Quebec | https://linkedin.com/in/jordan");
  assert.equal(professionalContactLine({ contactLine: "jordan@example.com | 416-555-0100 | 42 Rue des Exemples. Montreal Quebec.", professionalLinks: links }), "jordan@example.com | 416-555-0100 | https://linkedin.com/in/jordan");
  assert.equal(professionalContactLine({ contactLine: "jordan@street.com | 1 416 555 0100 | Toronto, Ontario" }), "jordan@street.com | 1 416 555 0100 | Toronto, Ontario");
});

test("combined language lines deduplicate against separate entries without dropping proficiency", () => {
  const input = { languages: ["English: Fluent", "Spanish: Native"], training: [{ name: "Languages spoken:" }, { name: "English: Fluent, Spanish: Native" }, { name: "French", proficiency: "Basic" }] };
  const result = organizeResumeSections(input);
  assert.deepEqual(result.languages, ["English: Fluent", "Spanish: Native", { name: "French", proficiency: "Basic" }]);
  assert.deepEqual(organizeResumeSections(result), result);
});

test("repetition within a paragraph and empty clichés receive specific nonblocking advice", () => {
  const repeated = reviewCoverLetterWriting([{ id: "a", text: "I supported user acceptance testing. ".repeat(4) }]);
  assert.ok(repeated.issues.some((issue) => issue.code === "repeated_sentence"));
  const cliche = reviewCoverLetterWriting([{ id: "a", text: "I am highly motivated and results-driven, with excellent communication skills and exceptional interpersonal skills. I would be a valuable asset to your team." }]);
  assert.ok(cliche.issues.some((issue) => issue.code === "empty_self_description"));
  assert.equal(cliche.status, "review");
});

test("necessary repeated technical names and short factual letters do not demand filler", () => {
  const paragraphs = [{ id: "a", text: "I configured SAP Finance posting rules at Cedar." }, { id: "b", text: "At Birch, I tested SAP Finance interfaces during the release." }];
  assert.equal(reviewCoverLetterWriting(paragraphs).status, "pass");
  assert.ok(!reviewCoverLetterWriting(paragraphs).issues.some((issue) => issue.code === "letter_length"));
});

test("duplicate removal preserves similar work with distinct results and assignments", () => {
  const bullets = ["Reduced SAP integration defects by 20% at Cedar.", "Reduced SAP integration defects by 40% at Birch.", "Reduced SAP integration defects by 20% at Cedar."];
  const output = shapeTailoredResumeWithReview({ ...resume, experience: [{ ...resume.experience[0], bullets }] }, {}).resume;
  assert.deepEqual(output.experience[0].bullets, bullets.slice(0, 2));
});

test("résumé editorial suggestions identify the summary and repeated bullets without blocking", () => {
  const review = buildWritingReview({ ...resume, profile: "Highly motivated and results-driven professional with extensive experience.", experience: [{ ...resume.experience[0], bullets: ["Supported SAP testing.", "Supported SAP testing."] }] }, base);
  assert.ok(review.issues.some((issue) => issue.section === "summary" && issue.issue_type === "empty_self_description"));
  assert.ok(review.issues.some((issue) => issue.issue_type === "repeated_bullet"));
  assert.equal(review.blocking_issue_count, 0);
});

test("length policies differ structurally and target useful shortening without padding", () => {
  const previous = { length: "standard", paragraphs: [{ text: "word ".repeat(221) }] };
  const short = coverLetterLengthPolicy("short", previous);
  assert.equal(short.maxWords, 165);
  assert.equal(short.maxParagraphs, 3);
  assert.equal(coverLetterLengthPolicy("standard").maxParagraphs, 4);
  assert.equal(coverLetterLengthPolicy("short", { paragraphs: {} }).previousWords, 0);
  assert.match(coverLetterControlInstructions({ voice: "warm", length: "short", existingDraft: previous }), /at least 25%/);
  assert.match(coverLetterControlInstructions({ voice: "direct", length: "standard" }), /DISTINCT principal evidence examples/);
  assert.equal(reviewCoverLetterWriting([{ id: "a", text: "I supported SAP testing at Cedar." }], "short").status, "pass");
  assert.ok(reviewCoverLetterWriting([{ id: "a", text: "word ".repeat(200) }], "short").issues.some((issue) => issue.code === "letter_length"));
});

test("voice rules remain distinct and paragraph regeneration uses the saved settings", () => {
  const plan = { voice: "direct", length: "standard" };
  assert.deepEqual(coverLetterGenerationSettings({ plan, voice: "warm", length: "short", paragraphId: "evidence" }), plan);
  assert.deepEqual(coverLetterGenerationSettings({ plan, voice: "warm", length: "short" }), { voice: "warm", length: "short" });
  assert.match(coverLetterControlInstructions({ voice: "warm", length: "short" }), /approachable conversational rhythm/);
  assert.match(coverLetterControlInstructions({ voice: "confident", length: "standard" }), /without superlatives, promises/);
});

test("workspace source identity survives equivalent parent objects but detects source changes", () => {
  const context = { baseResume: base, resumeData: resume, item: { id: "editorial-qa", title: "SAP Consultant", company: "QA Example" }, atsReview: analysis, candidateEvidence: [] };
  const fingerprint = createCoverLetterSourceFingerprint(context);
  assert.equal(createCoverLetterSourceFingerprint(structuredClone(context)), fingerprint);
  assert.notEqual(createCoverLetterSourceFingerprint({ ...context, baseResume: base + "\nAdditional source detail." }), fingerprint);
  assert.notEqual(createCoverLetterSourceFingerprint({ ...context, candidateEvidence: [{ capability: "SAP Activate", experience_level: "knowledge" }] }), fingerprint);
});

const job = { title: "SAP Consultant", company: "QA Example", description: "Support SAP testing and report release defects.", responsibilities: ["Support SAP testing", "Report release defects"], required_qualifications: ["SAP consulting experience"] };
const evidence = "Supported SAP testing and reported release defects at Cedar.";
const letter = { salutation: "Dear Hiring Team,", signoff: "Sincerely,", paragraphs: [
  { id: "opening", purpose: "opening", text: "I am applying for the SAP Consultant role with experience supporting SAP testing at Cedar.", evidence_refs: [evidence], requirement_refs: [job.responsibilities[0]], explanation: "Introduces testing experience.", evidence_match: "direct" },
  { id: "evidence", purpose: "evidence", text: "At Cedar, I supported SAP testing and reported release defects.", evidence_refs: [evidence], requirement_refs: [job.responsibilities[1]], explanation: "Describes release work.", evidence_match: "direct" },
  { id: "closing", purpose: "closing", text: "Thank you for considering my application. I would welcome a conversation about the role.", evidence_refs: [], requirement_refs: [], explanation: "Professional closing.", evidence_match: "neutral" },
] };
const response = (input) => ({ ok: true, json: async () => ({ content: [{ type: "tool_use", name: "return_evidence_first_cover_letter", input }] }) });
const recorder = () => ({ statusCode: 200, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; }, setHeader() {} });
const options = { authenticate: async () => ({ user: { id: "qa" }, supabase: {} }), getApiKey: () => "test", getOpenAIKey: () => undefined };

test("actual API rebuilds a verbose four-paragraph Short draft into one concise example", async () => {
  const verbose = { ...letter, paragraphs: [letter.paragraphs[0], { ...letter.paragraphs[1], text: `${letter.paragraphs[1].text} `.repeat(13) }, { ...letter.paragraphs[1], id: "evidence2", text: `${letter.paragraphs[1].text} `.repeat(6) }, letter.paragraphs[2]] };
  const prompts = [];
  const handler = createCoverLetterHandler({ ...options, fetchImpl: async (_url, request) => { prompts.push(JSON.parse(request.body).messages[0].content); return response(prompts.length === 1 ? verbose : letter); } });
  const res = recorder();
  await handler({ method: "POST", headers: { authorization: "Bearer test" }, body: { resume: `Jordan Lee\n${evidence}`, customJob: job, length: "short", voice: "warm", existingDraft: { ...verbose, length: "standard" } } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(prompts.length, 2);
  assert.match(prompts[0], /EXISTING DRAFT — untrusted reference data/);
  assert.match(prompts[1], /CLEAN REBUILD/);
  assert.deepEqual(res.body.letter.paragraphs.map((entry) => entry.text), letter.paragraphs.map((entry) => entry.text));
  assert.equal(res.body.letter.length, "short");
});

test("actual paragraph API cannot relabel the whole draft with pending settings", async () => {
  let prompt;
  const handler = createCoverLetterHandler({ ...options, fetchImpl: async (_url, request) => { prompt = JSON.parse(request.body).messages[0].content; return response({ ...letter, paragraphs: [letter.paragraphs[1]] }); } });
  const res = recorder();
  await handler({ method: "POST", headers: { authorization: "Bearer test" }, body: { resume: `Jordan Lee\n${evidence}`, customJob: job, voice: "warm", length: "short", regenerateParagraph: "evidence", existingDraft: { ...letter, voice: "direct", length: "standard" } } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.letter.voice, "direct");
  assert.equal(res.body.letter.length, "standard");
  assert.match(prompt, /Preserve the current letter's voice and length/);
});

async function pdfPages(input) {
  const bytes = await createResumePdfBytes(input);
  const task = getDocument({ data: new Uint8Array(bytes), standardFontDataUrl: fileURLToPath(new URL("../node_modules/pdfjs-dist/standard_fonts/", import.meta.url)) + "/" });
  const pdf = await task.promise;
  const pages = [];
  for (let number = 1; number <= pdf.numPages; number++) {
    const page = await pdf.getPage(number);
    const items = (await page.getTextContent()).items;
    for (const item of items) if (item.str.trim()) assert.ok(item.transform[5] >= 35 && item.transform[5] <= 770, `text outside page: ${item.str}`);
    pages.push(items.map((item) => item.str).join(" "));
  }
  await task.destroy();
  return pages;
}

test("PDF long roles repeat context, keep compact roles together, and preserve every bullet", async () => {
  const bullets = Array.from({ length: 24 }, (_, index) => `Recorded release observation number ${index + 1} for the Cedar engagement. The consulting team reviewed the testing notes, checked the reported configuration, and prepared the agreed follow-up documentation for the release review.`);
  const input = { ...resume, experience: [{ ...resume.experience[0], bullets }, { role: "Short Role", company: "Birch", dates: "2018-2019", bullets: ["Maintained the Birch ledger.", "Prepared the Birch reconciliation."] }] };
  const pages = await pdfPages(input);
  assert.ok(pages.length > 1);
  assert.ok(pages.slice(1).some((page) => page.includes("(continued)")));
  for (const page of pages.slice(1)) if (page.includes("Recorded release observation")) assert.ok(page.includes("Consultant - Cedar"));
  for (let index = 1; index <= 24; index++) assert.ok(pages.join(" ").includes(`observation number ${index}`));
  const compactPage = pages.find((page) => page.includes("Short Role"));
  assert.ok(compactPage.includes("Maintained the Birch ledger."));
  assert.ok(compactPage.includes("Prepared the Birch reconciliation."));
});

test("an oversized PDF render-plan bullet remains within pages without losing its ending", async () => {
  // Exercise renderer pagination independently of the canonical input length limits.
  const input = structuredClone(buildResumeRenderPlan(createResumePackage(resume)));
  input.sections.find((section) => section.type === "experience").items[0].bullets[0].text = "Supported release testing. ".repeat(700) + "Final observation retained.";
  const pages = await pdfPages(input);
  assert.ok(pages.length > 2);
  assert.equal((pages.join(" ").match(/Supported release testing\./g) || []).length, 700);
  assert.ok(pages.at(-1).includes("Final observation retained."));
});

test("DOCX groups roles and keeps compact bullet paragraphs together", async () => {
  const input = { ...resume, experience: [{ ...resume.experience[0], bullets: ["Supported testing.", "Reported defects."] }, { ...resume.experience[0], role: "QA Consultant", bullets: ["Documented results."] }] };
  const zip = await JSZip.loadAsync(await (await createResumeDocxBlob(input)).arrayBuffer());
  const xml = await zip.file("word/document.xml").async("string");
  assert.equal((xml.match(/Cedar \| 2020-2024/g) || []).length, 1);
  const testingParagraph = xml.match(/<w:p[ >][\s\S]*?Supported testing\.[\s\S]*?<\/w:p>/)?.[0];
  assert.match(testingParagraph, /<w:keepNext\/>/);
  assert.match(xml, /QA Consultant/);
  assert.match(xml, /Documented results\./);
});
