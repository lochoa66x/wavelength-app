# Document validation and quality review — 13 September 2026

The shared validation contract and source-history handling are stronger. Writing improved unevenly. The latest full ten-career pass produced nine complete packages, but only two packages met the chosen content bar for both documents. That is not a satisfactory general quality result.

These are Codex editorial assessments using the frozen rubric, not independent human/recruiter ratings, hiring predictions, or ATS scores. No score was assigned to a missing document. The model's internal review scores were not used as the published assessment.

## What shipped

- One pure application-document contract is used for generation, whole-document letter edits/regeneration, saved-draft readiness, and export authorization. Letter structure, contribution level, citations, limits, and known factual issues have the same rules at those boundaries.
- Résumé reviews bind the canonical content hash and validation version. Changed content, old rules, and legacy reviews require a recheck; preliminary naming cannot bypass known integrity failures.
- Structured job rows no longer depend on an occupation whitelist. Empty roles restore statements only from their own source range. The laboratory assistant and fundraising assistant examples now retain their evidence.
- Academic dates no longer invent “completing” or “pursuing” status. Factual letter closings require candidate citations. Qualifications have one section owner while distinct renewals and providers remain separate.
- Portfolio addresses in a labelled source section reach the header. The final narrow fix also removes an identical trailing inline address without deleting its descriptive sentence or a different sample URL.
- A bounded editorial review runs separately from mechanical checks when the time budget permits. It can improve only the résumé profile or merge redundant letter paragraphs; any revision still passes the shared factual contract.
- Source-ID revision 248c46c adds server-resolved editorial source IDs, rejects unknown/conflicting references, fixes generic credential issuer/prose matching, and keeps semicolon status annotations attached to the credential. It is a bounded validator, not a general semantic fact checker.

Contract details: [document-validation-contract.md](../../../docs/document-validation-contract.md).
Frozen rubric: [QUALITY_RUBRIC.md](../../QUALITY_RUBRIC.md).

## Evaluation method and preserved failures

Ten fictional careers were frozen before the first live request on this iteration. Inputs were not changed after failures. The corpus hash was verified again after the third pass.

- Corpus SHA-256: a71eb3d33a73b90baa41d1a51fb52a3f8105b767b780b79f3a3679e293c065d7
- Rubric SHA-256: 31b081525a7ee569f48df6211d95c7929a54955a8997fac73efb734fd5bc30af
- Frozen at: 2026-09-13T03:54:01.325Z.
- First full pass: e126ec73dfda2f68eb5264db9ece9ee78d6d43d6.
- Second full pass: f41114ee2093ec8136607ba355895e12b10390bc.
- Third full pass: 27c97970bdb167d28c191f13801ba1298408e087.
- Two targeted checks on the final narrow fixes are recorded separately below. They do not replace earlier failures or count as another unseen cohort.

This is a development holdout authored by the same agent that implemented the changes. It was new to this iteration's implementation examples, but it is not an independently authored blind benchmark. After inspection it became a regression set. Another untouched cohort and independent human scoring are required for broader quality claims.

One application attempt means one intake, one résumé request, and one letter request where reachable. Built-in provider repair/editorial calls are part of that request; a manual retry is a new numbered attempt. Returned documents, errors, revisions, inputs, artifact hashes, and attempt numbers are preserved. Provider drafts rejected inside a server repair were not retained in full; their available issue counts/statuses are separate from the returned document. Thus “package completion” is not first-provider-draft accuracy.

## Results

The release content target is at least 15/20 per document, no dimension below 2, a passing evidence review, and no export integrity defect. The five dimensions are relevance, useful detail, document purpose, selection/organization, and natural professional writing.

| Full pass | Completed packages / 10 | Available documents / 20 | Mean résumé | Mean letter | Documents meeting bar | Packages with both meeting bar |
|---|---:|---:|---:|---:|---:|---:|
| First | 9 | 19 | 13.2 (n=10) | 12.4 (n=9) | 4/19 | 0/10 |
| Second | 9 | 18 | 14.7 (n=9) | 12.8 (n=9) | 6/18 | 1/10 |
| Third | 9 | 19 | 14.7 (n=10) | 13.9 (n=9) | 7/19 | 2/10 |

The eight letters available in both first and third passes improved from 12.5 to 14.0 on average. Résumé means compare the same ten cases. These small, subjective comparisons are descriptive; randomness, source sparsity, and same-agent evaluation prevent a causal or statistically calibrated quality claim. The table below exposes regressions hidden by the averages.

Each cell is résumé / letter, out of 20. “—” means no output.

| Career | First | Second | Third |
|---|---:|---:|---:|
| F01 Commercial baker | 16 / 12 | 14 / 15 | 14 / 13 |
| F02 Veterinary assistant | 13 / 12 | 13 / 10 | 14 / — |
| F03 Junior GIS technician | 17 / 12 | 18 / 13 | 17 / 17 |
| F04 Water quality laboratory technician | 11 / 14 | 14 / 13 | 15 / 14 |
| F05 Upholsterer | 12 / 12 | — / — | 14 / 14 |
| F06 Grant writer | 6 / 11 | 16 / 10 | 16 / 13 |
| F07 Museum collections assistant | 17 / 12 | 14 / 13 | 14 / 14 |
| F08 Transit dispatcher | 16 / 14 | 13 / 12 | 13 / 10 |
| F09 Landscape crew leader | 12 / — | 15 / 16 | 15 / 13 |
| F10 Freelance podcast audio editor | 12 / 13 | 15 / 13 | 15 / 17 |

Failure accounting:

- First F09: résumé returned, cover letter rejected with HTTP 422. The logs cited credential/status evidence. Full current First Aid source text passes the local check; the failed provider draft/citations were unavailable, so the exact failure mechanism remains unconfirmed.
- Second F05: session-expiry error before either document. No generation retry was made within that attempt. A fresh app tab recovered the existing session and the remaining cases continued. Root cause is unconfirmed; do not describe the auth problem as fixed.
- Third F02: résumé returned, cover letter rejected with HTTP 422. The credential/citation error was preserved. Separate local examples demonstrated a genuine prose/issuer parsing false rejection and a semicolon status bug, but they do not prove the exact unseen provider draft had those forms.
- First F03 letter incorrectly said the candidate was “completing” a qualification whose source only listed a degree and year. It failed the evidence gate. The later output preserves the listed qualification without that invented ongoing status.
- Second F04/F08 letters were flagged for review because “then” added chronology between separately listed tasks. The third pass removed those constructions.
- Third F08 remains a writing failure: the passenger-delay update is repeated in consecutive paragraphs. It scored 10/20 despite passing mechanical checks.

Detailed scores and originals: [first-review.json](first-review.json), [second review](retest-2/review.json), [third review](retest-3/review.json). First-attempt files remain in [first-attempts](first-attempts).

## Third-pass career review

### F01 — Commercial baker

**Résumé 14/20.** Bread-production priorities and both roles survive; team output stays attributed to the four-person team; the profile offers a setting but repeats bullet actions; the allergen evidence is easy to find; prose is clear but familiar.

**Letter 13/20.** Relevant production and allergen evidence; proofing method and team quantity are concrete; the opening makes a modest focused example; the isolated second paragraph adds little development; natural but plain source-like prose.

Example: “I also recorded allergen changeovers”

### F02 — Veterinary assistant

**Résumé 14/20.** Relevant clinical responsibilities; supervision and approved instructions remain explicit; summary retells the current role; both jobs, certificate and languages are retained cleanly; readable professional wording.

**Letter unavailable.** The letter request returned 422 after credential/citation validation. No returned letter or files to score; the rejected provider draft was unavailable.

### F03 — Junior GIS technician

**Résumé 17/20.** The junior GIS focus fits the posting; public-data project and review authority remain clear; profile establishes academic professional context; two roles and qualification are organized coherently; concise and natural.

**Letter 17/20.** Selects the principal mapping need; gives method, data limitations and reviewer scope; develops one coherent academic project; removes the earlier generic bridge and orphan degree paragraph; direct readable wording.

Example: “documented missing coordinates, and compared address points with satellite imagery”

### F04 — Water quality laboratory technician

**Résumé 15/20.** Water-testing focus matches the role; holding times and senior release review survive; compact profile combines setting and training though it still echoes tasks; previously empty assistant job is complete; wording is clear.

**Letter 14/20.** Relevant intake and testing evidence; meaningful quality-control and authority constraints; remains mainly a condensed inventory; diploma inserted into the first paragraph is weakly connected but no orphan paragraph; natural prose without the earlier invented then sequence.

Example: “a senior analyst reviewed the analytical results before client release”

### F05 — Upholsterer

**Résumé 14/20.** Direct upholstery priorities; customer approval and patterned fabric process remain specific; profile repeats role duties; helper history and workshop have one sensible location; readable but generic Experienced in phrasing.

**Letter 14/20.** Posting priorities are covered; dimensions, pattern matching and approval give useful constraints; mainly rearranges three source bullets; two substantive paragraphs are coherent but do not sharpen a single main case; restrained and readable.

Example: “recorded customer approval before cutting customer-supplied material”

### F06 — Grant writer

**Résumé 16/20.** Role and community arts domain match; proposed budget and director submission boundaries survive; profile now gives a professional focus; all current-role bullets are restored and qualification retained; clear wording.

**Letter 13/20.** Relevant proposal evidence; three proposals, finance collaboration and final-review authority are intact; the quoted sentence restates the preceding sentence; budget phrasing is defensive and paragraph selection remains inventory-like; otherwise clear.

Example: “I used programme evidence to support the proposals’ stated needs.”

### F07 — Museum collections assistant

**Résumé 14/20.** Museum and archive priorities fit; draft records and curator approvals are preserved; summary repeats tasks from both roles; complete role and qualification sections; clean readable prose.

**Letter 14/20.** Relevant documentation and handling evidence; uncertainty and final approval are useful constraints; two paragraphs still list most of the resume inventory; organization is coherent with distinct record and handling examples; natural restrained language.

Example: “referred uncertain ownership details to the curator”

### F08 — Transit dispatcher

**Résumé 13/20.** Accessible-transport setting is relevant; approval and dispatch evidence remain accurate; profile restates duties; languages repeat their dedicated section; prose is readable.

**Letter 10/20.** Relevant transit work; supervisor authority is retained; the same passenger-delay update appears in consecutive paragraphs; duplication wastes the opening/body distinction; mechanical repetition makes the letter weak.

Example: “I updated passengers when vehicle delays changed pickup estimates”

### F09 — Landscape crew leader

**Résumé 15/20.** Crew leadership and the required credential are prominent; the total crew includes the candidate in the role evidence; profile also repeats task details; the certificate has one record owner and both roles survive; clear but familiar Experienced in wording.

**Letter 13/20.** Relevant crew-lead example; work-order checks and team denominator are accurate; opening offers a modest focused example; the supporting paragraph is thin and omits the useful current First Aid evidence included in the previous letter; plain professional prose.

Example: “I recorded plant replacements and equipment defects for the owner to review.”

### F10 — Freelance podcast audio editor

**Résumé 15/20.** Portfolio and audio focus fit the posting; episode count and client review constraints survive; profile gives domain and diploma context; the URL still repeats the header when embedded in a sentence; readable prose.

**Letter 17/20.** Focuses on interview audio delivery; eight episodes, supplied cues, file formats and one consolidated client review are concrete; develops a coherent editing-to-review example; the portfolio address now appears only in the header; clear natural prose.

Example: “For revisions, I kept notes against timestamps”

## What the logs show

On the third full pass, seven of ten profile editorial revisions were rejected for source-quote mismatch, two profiles were kept, and one was revised. This was a pipeline limitation as well as a writing problem. The final source-ID change addresses that particular fragile interface; a valid ID still cannot authorize an unsupported rewrite.

Nine of ten résumé requests needed a second provider draft, with unsupported-skill findings recorded in their initial drafts. The repair kept the delivered documents usable, but the repair burden is high. It must not be reported as ten flawless first model outputs.

The nine returned third-pass letters reported zero mechanical writing issues. Manual editorial assessment still found thin supporting paragraphs, repetition, and uneven evidence selection. A “checks passed” status therefore is not a quality grade. In particular, the editorial model marked the repetitive transit letter as revised; self-review can still misjudge usefulness.

## Files, layout, and editing

Across the three full passes, 56 available documents produced 112 actual browser-downloaded files and 56 PDF pages. All 56 DOCX/PDF pairs matched their visible preview text, and all 56 PDF pages were visually inspected. No clipping, missing text, broken page breaks, or editor/diagnostic text leaks were found in these artifacts.

The single-column layouts have clear identity, section rules, readable role hierarchy, and restrained accents. Typography and section hierarchy are restrained across both document types. Several letters occupy little of the page because they contain little developed content. Enlarging fonts or padding paragraphs would hide that weakness rather than improve the case. The landscape “Training & Apprenticeship” heading is broader than its sole First Aid record and remains a minor template-label issue.

A live edit from eight podcast episodes to eighty was rejected with “A number or duration is not supported by this claim’s cited candidate evidence.” The saved preview remained unchanged, and the edit was cancelled.

Clipboard actions were exercised, but clipboard byte readback was unavailable. Parity is against the visible preview, not independently recovered clipboard bytes. The second-pass F01 copy success toast was not observed before its immediate snapshot; that is recorded as unconfirmed.

Native Microsoft Word pagination was not verified. DOCX text/XML checks and PDF rendering do not establish Word layout. No claim of native Word verification is made.

## Automated verification

Final code validation: 865 tests passed, zero failed/skipped/cancelled; production build passed. The résumé exporter check covers 48 files, 16 templates and 29 PDF pages, content-manifest parity, final authorization, and stale-ready rejection. The letter exporter check covers two DOCX/PDF pairs and final/preliminary gates. The existing large PDF dependency chunk advisory remains.

Public-route smoke checks confirmed the tested deployment's entry asset on /, /app, /privacy and /sign-in. Unauthenticated generation/intake endpoints returned 401 with no-store caching. Exact deployment checks for the final revision are recorded with the targeted results.

## Targeted verification of the final fixes

Two separate follow-ups ran on 248c46c2e7c0e979e483cda8f9b7a9f96f7e4e4a (deployment dpl_7eaBqjtv5Yw2osJkSTGaWZZXEyYL). Both packages completed, producing eight files and four PDF pages. These are additional results, not replacements for F02's rejected third attempt.

- **F02:** the letter now includes “Veterinary Assistant certificate from Example Community College” and passes generation. The profile editorial review passed the source-reference stage but was rejected by later validation, so the checked original remained. That original still joins bilingual fluency to a particular clinical task; this requires evidence review. Scores: résumé 13/20 (evidence review), letter 13/20.
- **F10:** the profile editorial revision applied successfully using source IDs. Its wording no longer repeats the URL. The generator instead created a bare Portfolio project containing the same header URL. A subsequent canonical normalization fix removes only such empty duplicates; descriptions, dates, named projects, and different sample addresses survive. That final small change has regression and export coverage, not another complete live cohort. Scores for the preserved pre-normalization files: résumé 15/20, letter 15/20.
- No source-quote mismatch occurred in either targeted profile review. Two selected cases do not establish a new ten-career success rate.
- All four targeted DOCX/PDF pairs matched their visible previews, and all four PDF pages were visually inspected. Total across all recorded runs: **60 documents, 120 downloaded files, 60 inspected PDF pages**.
- The original saved résumé was restored and verified exactly: **10,984 characters**. The private backup is excluded from the report and delivery archive.

Targeted evidence: [review.json](targeted-4/review.json), [download checks](targeted-4/download-inspection.json), [runtime statuses](targeted-4/editorial-logs.txt), [restore verification](targeted-4/restore-after-evaluation.json), [deployment smoke check](targeted-4/production-smoke.json).

## Remaining work and release judgement

The reliability changes are worth deploying. The evidence does not support saying all careers now produce consistently strong applications.

1. Calibrate editorial decisions against independent human reviews of complete documents. Repeated duties and thin supporting paragraphs still receive overly generous model assessments. Validate claim relationships too: language fluency does not establish that a particular clinical task was performed in both languages.
2. Use an additional untouched cohort for the next generalization claim. Keep this corpus as regression coverage; do not relabel its retests as unseen.
3. Reduce unnecessary first-draft repair by diagnosing unsupported-skill additions, with exact claim-level, privacy-safe diagnostic codes.
4. Preserve rejection diagnostics without retaining user résumé text in production logs. The current generic credential error cannot explain exactly what the unavailable draft asserted.
5. Complete native Word and clipboard-byte verification in a supported environment. Investigate session expiry if it recurs with identifiable request metadata.

The original user résumé was restored and verified exactly. Restoration metadata is recorded with the targeted checks.
