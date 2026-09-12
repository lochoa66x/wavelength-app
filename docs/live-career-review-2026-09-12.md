# Live application-document review — 12 September 2026

## Method and evidence

Ten fictional candidates and ten complete fictional postings were entered through the authenticated production browser at `gigscapes.com`, on release `58d4389`. These were real intake, résumé-generation, and cover-letter-generation requests. The corpus contains inputs only; no model response was substituted. Standard/Direct was used for nine cases. The translator used Short/Direct and the Studio Editorial style; the other cases retained their recommended styles.

Each completed package was downloaded through the actual UI as résumé DOCX/PDF and letter DOCX/PDF: **40 files, 20 documents, 20 PDF pages**. PDF text was extracted and compared with DOCX paragraphs. All 20 PDF pages were rendered and visually inspected. No missing DOCX-to-PDF paragraphs, off-page text, unexpected second pages, or editor annotations were found in those downloads. This is format parity, not proof that the generated content was good.

The first visible failures were retained, then the original input was retried. Intake for L02 and L10 and résumé generation for L05 returned an expired-session error while the UI still showed the user signed in. Reloading recovered those requests. L06's first letter was rejected for an unsupported number/duration; its retry succeeded. Thus ten completed packages must not be reported as ten flawless first attempts. Server validation may also repair a draft before any text becomes visible; the saved browser evidence is the first visible result, not the raw provider response.

Local evidence is under `tmp/live-career-review-2026-09-12`: intake snapshots, document snapshots, clipboard captures, real downloads, extracted text, PDF renders, and `download-inspection.json`. The original user's résumé backup is private and excluded from shareable evidence bundles.

## Findings by career

| Case | Résumé findings | Cover-letter findings |
|---|---|---|
| L01 Bookkeeper | Four monthly bank accounts and approximately 120 monthly invoices retained. Summary is repetitive. Credit-card reconciliation remains unproven. | 91 words. Repeats the role title and explicitly announces how each task matches the posting. Weak, mechanical advocacy. |
| L02 Residential plumber | Three calls/day and apprenticeship history retained. The review incorrectly reported a missing plumbing credential despite displaying the held journeyperson certificate. | 121 words. Factual scope retained, but repeats the date/credential and adds an unnecessary posting-match sentence. |
| L03 Finish carpenter | 18 projects, 2025, and three-person crew retained. An older helper role incorrectly demoted the current content classification. | 116 words. Accurate crew attribution, with repetitive statements explaining relevance. |
| L04 Dental receptionist | **All three current-role bullets disappeared.** The older retail bullet remained. Saturday availability was correctly left unconfirmed. | 111 words. Dental examples survived in the letter, exposing a résumé-specific source-scoping failure. |
| L05 Warehouse associate | 65 orders/shift and the team's 9% improvement retained. Forklift training stayed in progress. **The older stockroom bullet disappeared.** | 103 words. Team result retained; repetitive matching commentary weakened the writing. |
| L06 Early childhood educator | Active registration and CPR retained. Summary changed a room with two educators to work “alongside two educators,” an ambiguous increase in staffing. Skills repeated the credential section. | First attempt rejected; successful retry 104 words. Opening and next paragraph repeat the play-based activity example. |
| L07 Customer support | 38 tickets/shift, 12 articles, and escalation responsibility retained without promotion to management. | 115 words. Opening and first evidence paragraph repeat Zendesk/email/chat experience. |
| L08 Freelance translator | 8,000 source words/month and translation direction retained. **Explicit portfolio URL omitted.** | 75-word Short letter stayed concise, but referred to a “listed link” that was absent. Introductory language was awkward. |
| L09 Bicycle mechanic | Six services/day, seasonal work, volunteer history, and repair scope retained. | 112 words. Factual but padded with sentences that restate the repair and documentation example. |
| L10 Junior data analyst | Internship, 14,000 rows, four dashboard users, supervision, and sample-project/non-production status retained. **Volunteer bullet and portfolio omitted.** SQL/data-cleaning evidence was incorrectly classified as absent. | 136 words. Supervision and numbers retained. Repeats the dashboard example as a future contribution. |

## Shared defects fixed

1. **Profession-independent source history.** Explicit role/employer/date rows in an experience section no longer depend on an office-job title vocabulary. Source ranges stop at subsequent roles and section captions. Empty roles can recover up to three exact source statements; missing statements now trigger a completeness failure instead of silently passing.
2. **Candidate links.** Explicitly labeled HTTP(S) portfolio/work-sample/professional links are retained from anywhere in the source, including letters created without a tailored résumé. Credential-bearing URLs and arbitrary employer links are not collected. Employment date ranges are no longer interpreted as phone/contact text.
3. **Evidence and positioning.** A held journeyperson plumber certificate is recognized, while expired, unheld, and unfinished credentials remain excluded. Old helper history does not demote an established tradesperson. SQL querying, data cleaning, and data validation can receive separate source-backed assessments; SQL alone does not establish cleaning. Original compound-row context is retained.
4. **Writing.** Instructions no longer require each example to explain its match to the posting. Repeated examples and title repetition are discouraged, and additional matching-process phrases trigger editorial advice. Length controls state upper limits instead of promising word ranges the generator does not deliver. Sparse evidence is not padded.
5. **Meaning and organization.** Total group staffing cannot be rewritten as that many additional colleagues alongside the candidate. A skills section no longer repeats identical credentials already displayed in the credential section.
6. **Download/copy behavior.** Copied letters now include the same date and subject prefix as DOCX/PDF. Preliminary letter filenames retain `cover-letter`, distinguishing them from résumés. Clipboard failures cannot be reported as success. Download messages accurately say the download started; the browser controls the final save.
7. **Session recovery.** Authenticated document requests retry one explicit 401 after recovering the same user's session. They do not retry generation failures, timeouts, 403s, cancelled requests, or requests whose account changed. Privacy settings remain `no-store` and same-origin.
8. **Review clarity.** The related-evidence explanation is shown only when the assessment actually contains related evidence.

## Design assessment

Essential, Field Ready, and Studio Editorial produced legible single-column PDFs with consistent spacing, restrained rules, and usable hierarchy. Résumé and letter styling for the explicitly selected Studio Editorial pair agreed. Short source résumés naturally leave white space; expanding generic prose to fill it would reduce quality. Missing bullets and duplicated credential sections made that space more conspicuous and were content failures, not pagination failures.

The files are materially cleaner than the old screenshots with editor annotations inside the letter. Passing layout checks still does not mean the writing is persuasive. The baseline letters repeatedly explained their own relevance instead of letting concrete evidence carry the argument.

## Verification limits and release follow-up

The downloadable DOCX files were opened structurally and their complete paragraph text matched their PDF counterparts. **Native Word/LibreOffice pagination is not yet verified.** The bundled runtime has no Word-compatible renderer. Using the installed desktop LibreOffice requires a user override of the documents skill's explicit restriction; that question is pending. XML/text checks and PDF rendering must not be described as native Word verification.

All ten baseline letter clipboard captures exposed the missing date/subject-prefix discrepancy. The L01 résumé clipboard capture was empty because the test read the clipboard before the asynchronous copy completed; later cases waited for the success notice. That harness error is recorded separately from product defects.

Release verification includes the full regression suite, the production build, the 16-template résumé export matrix, final/preliminary letter export checks, and targeted new live generations after deployment. Deployment and retest evidence is recorded separately with the deployed commit, so this baseline report does not claim unperformed production checks.

## Production retests completed

The functional fixes were committed as `1b7a726dcd9694d299362414fbd155040dae8fd3` and deployed in `dpl_AWnaP3a9fAQdZJtUY5YLQEkJS2M6`. The production aliases were verified against that exact SHA. Five unchanged inputs were then regenerated through the live authenticated service; these are additional generations, not a reclassification of the baseline files.

| Case | Observed result after deployment | Letter words, before → after |
|---|---|---|
| L04 Dental receptionist | All three current-role bullets and the older retail bullet now appear. Saturday availability remains unconfirmed; both documents remain preliminary. | 111 → 76 |
| L08 Freelance translator | Portfolio URL appears in both résumé and letter. Translation direction, 8,000 source words/month, agreed deadlines, and selected Studio Editorial style survive. | 75 → 65 |
| L10 Junior data analyst | Volunteer bullet and portfolio restored. SQL and data cleaning receive direct evidence; the assessment still distinguishes partially supported communication work. Internship, supervision, and the sample project's non-production status remain intact. | 136 → 110 |
| L06 Early childhood educator | Original room headcount retained, all role bullets present, and credentials no longer duplicated in Core Skills. Letter uses distinct credential and classroom examples. | 104 → 71 |
| L01 Bookkeeper | Both roles and the four-account/120-invoice facts retained. The letter removes the explicit posting-match commentary. Clipboard capture now waits for confirmed completion and matches the saved file. | 91 → 69 |

These five packages produced **20 more actual downloads**, bringing the live review to **60 files and 30 PDF pages**. All ten retest documents passed DOCX/PDF paragraph parity, copied-text parity, page-bound checks, and editor-text exclusion. Every retest PDF page was rendered and visually inspected. Preliminary letter filenames now include `cover-letter`, distinguishing them from preliminary résumés. The count refers to distinct saved files, not button clicks.

No visible request failed during the five retests. Server logs show that four letters passed the first integrity check and the educator letter required an internal repair before its successful response. The final writing checker reported no issues in all five; human review remains stricter than that automated result.

The full regression suite passed **793 tests**. The production build passed, the 16-template export matrix passed (48 controlled files, 29 PDF pages), and final/preliminary letter export checks passed. These controlled fixtures are separate from the 60 live downloads. The production dependency audit reported **zero known vulnerabilities**. A final small UI correction changes “1 short questions” to “1 short question”; its seven affected tests also passed. Production smoke checks verified public pages and authentication/no-store behavior for private generation endpoints.

The original user's résumé was restored through the UI and compared with the original string: **exact match, 10,984 characters**. No application was submitted. The original résumé backup is excluded from shareable evidence.

## Remaining editorial work and limits

The letters are cleaner, but they are not yet exceptional. Several still open with “I am applying” and close with “I welcome the opportunity.” The analyst opening inventories examples that the body then develops. Some résumé summaries repeat experience bullets, and the bookkeeper summary substitutes “high-volume” for a more useful explicit quantity. The educator summary's “activities for 16 children and two educators” is less precise than the original “a room with 16 children and two educators,” although the experience bullet and letter preserve the original relationship. These are remaining editorial findings, not silently counted as fixed by a passing automated checker.

The short documents leave considerable lower-page whitespace. That is acceptable for sparse input, but richer candidate histories are needed to assess information density and pagination under pressure. This run visually reviewed desktop previews and downloaded PDFs; it did not complete a separate narrow-mobile viewport pass. Native Word-compatible pagination remains unverified for the renderer restriction documented above. No finite set of live generations proves that future AI outputs will always preserve every fact.
