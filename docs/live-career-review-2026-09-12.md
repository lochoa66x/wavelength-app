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
