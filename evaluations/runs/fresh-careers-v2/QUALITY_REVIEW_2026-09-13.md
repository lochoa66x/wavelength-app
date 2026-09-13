# Ten fresh careers: production review — 13 September 2026

The résumé output is generally useful; cover-letter quality remains uneven. More seriously, a live edit reversed a supervisor-approval requirement and still passed validation and both exporters. The current checks are not a reliable guarantee against changed meaning.

Tested production revision: **d5c9fe60568fb34ade44b0d13167250d6d07d5f2**. All ten first attempts used this release. No application-code fixes were made during this review.

## Highest-priority findings

### 1. P1 — False approval claim accepted and exported

In the wardrobe letter, the source and generated first output said **“design alterations required the supervisor’s approval.”** A separate manual edit changed it to **“design alterations required no approval.”** Save & recheck accepted it, the UI displayed **Document checks passed**, and both actual DOCX and PDF downloads contained the false statement. This was a deliberate post-generation test, not a spontaneous failure in the ten first-generated packages. The original fictional letter was restored afterward.

The local reproducer also confirms that both validateCoverLetterEdit and validateApplicationDocument accept the reversed meaning. The source-word check in src/coverLetterModel.js:189–194 is not a semantic guarantee: vocabulary can remain familiar while negation changes a claim. The shared contract's current claim checks miss this case. A common entry point cannot compensate for an incomplete rule.

Evidence: approval-negation-edit-check.txt, approval-negation-observed.json, and edit-checks/approval-negation/F10-letter.docx and .pdf in the artifact bundle. Run the read-only reproducer with:

```sh
node evaluations/runs/fresh-careers-v2/reproduce-edit-policy-gap.mjs
```

It exits 1 while either observed policy gap remains. Expected behavior: reject a changed approval condition, preserve the previous valid draft, and prevent the false version from receiving verified/exportable status. Add this meaning-preservation case to generation, editing, regeneration, readiness and export tests; include positive paraphrases as well as negations.

### 2. P2 — A harmless closing edit is rejected

Adding **“Thank you for considering my application.”** before the existing closing failed with **“This edit adds wording that is not present in the verified sources.”** The saved preview remained unchanged. The shared contract accepts the same courtesy wording; the edit-only vocabulary guard rejects it before the contract is reached. The user still encounters different acceptance rules across paths.

Evidence: courtesy-edit-check.txt and edit-policy-reproduction.json. The responsible guard is in src/coverLetterModel.js:167–195. Distinguish non-factual courtesy/style edits from changes to factual claims. Adding isolated polite words to an allowlist would address one sentence, not the underlying distinction. Keep factual closings, new credentials, availability and quantities subject to evidence checks.

Positive controls: adding **“I prepared 50 costumes per performance.”** was correctly rejected, and downloads retained the previous valid letter. A punctuation-only change was accepted and appeared in both export formats. These controls do not negate the two failures above.

### 3. P2 — Floral cover-letter generation fails; the diagnosis is incomplete

F09 returned no cover letter. The server responded 422 with **“A number or duration is not supported by this claim’s cited candidate evidence.”** The résumé still downloaded. No manual retry was made, and the input was not revised.

The source contains a shared total of 12 arrangements and a separately dated project. The rejected provider text and its exact citations were not retained, so it is not possible to establish whether the model invented a number, dropped a denominator, or attached the wrong citation. Do not weaken numeric validation on this evidence. Capture the failing claim, source IDs, first draft and repair outcome in the synthetic evaluation harness so the failure can be diagnosed and repaired precisely. This is also a remaining limitation of preserving first-attempt failures: the failed request and error are preserved, but the rejected provider draft is unavailable.

### 4. P2 — Editorial review still accepts repetition and uninformative profiles

The claims profile reads **“Claims Administration Assistant with experience in motor-claim file administration.”** The floral profile reads **“Freelance floral designer with retail florist experience.”** Both mainly repeat role headings. Shorter wording has removed useful professional focus rather than improved it.

The bookbinder opening repeats signature sewing immediately after describing sewn text blocks. Travel and funeral letters add **“This work required…”** sentences that explain the duties they just listed. All nine returned letters use a three-paragraph structure and an **“I welcome the opportunity…”** closing; eight open with **“At [employer]…”** or **“As [role]…”**. None of these forms is inherently wrong, but the combined sameness and duty recitation produce generic applications. The body lengths are only 63–85 words even though every case used Standard; that is a diagnostic observation, not a reason to impose a minimum length.

The funeral letter also adds **“before visitors arrived”**, timing not stated in its source. It is plausible but unverified, so its evidence label is **review**, not a proven falsehood. The editorial reviewer kept this letter. Remove unnecessary factual implications while preserving useful source-supported process.

## Ten first-attempt results

Inputs and the existing rubric were frozen before live generation at **2026-09-13T17:50:10.328Z**. Corpus SHA-256: 3986edb855803398cc7b4d416e5c55430928319b0539b7bdd9fa5296aecd0273. Rubric SHA-256: 31b081525a7ee569f48df6211d95c7929a54955a8997fac73efb734fd5bc30af.

These are fictional cases authored and scored by Codex, using the same five-dimension rubric as the earlier review. This is a frozen development holdout, not an independently authored blind benchmark or recruiter/ATS study. Once inspected, it becomes a regression set. Scores are editorial judgements; model self-scores were not used as the published ratings.

- **9/10** attempts produced both documents: eight final packages and one correctly preliminary package (AV availability unconfirmed).
- **1/10** was partial: floral résumé available, letter unavailable.
- **19/20** documents returned; all 38 corresponding DOCX/PDF files were downloaded and inspected.
- **7/10** résumés and **3/9** available letters met the content bar; **3/10** packages met it for both.
- Mean scores: **16.1/20 résumé**, **14.3/20 letter**. Missing letters have no assigned score.
- First-returned document evidence review: **18 pass, 1 review, 0 confirmed false, 1 unavailable**. The separately injected false edit is an additional integrity failure and must not be hidden by these first-generation numbers.

The content bar is at least 15/20, every dimension at least 2, passing evidence review, and no export integrity defect. A total of 15 can still fail because one dimension scores 1. This bar is a review rule, not proof of hiring success.

| Career | Résumé /20 | Letter /20 | Both meet bar | First-attempt outcome |
|---|---:|---:|---|---|
| F01 CNC Machine Operator | 17 | 12 | No | Both downloaded |
| F02 Hand Bookbinder | 17 | 14 | No | Both downloaded |
| F03 Audiovisual Event Technician | 14 | 14 | No | Both downloaded; preliminary availability confirmation |
| F04 Travel Reservations Agent | 18 | 14 | No | Both downloaded |
| F05 Insurance Claims Assistant | 15 | 14 | No | Both downloaded |
| F06 Recycling Sort Line Operator | 18 | 16 | Yes | Both downloaded |
| F07 Funeral Service Assistant | 17 | 13 | No | Both downloaded |
| F08 Localization QA Tester | 16 | 16 | Yes | Both downloaded |
| F09 Freelance Floral Designer | 14 | — | No | Résumé only; letter 422 |
| F10 Theatre Wardrobe Assistant | 15 | 16 | Yes | Both downloaded |

The strongest overall packages were recycling, localization QA and wardrobe support. They retain concrete work constraints and contribution boundaries. The travel résumé also stands out for combining booking settings, education and languages without inventing task-specific language use. The AV case correctly flags availability outside the exported document and preserves expired training status. The floral résumé prints the portfolio URL once and retains its descriptive project, client, date, palette and sightline constraint.

The earlier v1 final full pass had 9/10 completed packages, mean scores 14.7/13.9 and 2/10 packages meeting the bar for both. This new cohort has different inputs and careers; the comparison is descriptive and cannot establish a causal improvement or statistically calibrated gain.

## What the runtime logs show

Eight of ten résumé requests needed a second provider draft, with first-draft flags for unsupported skills. Two used one provider draft. The summary editorial stage applied a revision in all ten cases; the earlier source-quote rejection pattern did not appear in this pass. This is a functional improvement, but the claims and floral profiles show that an applied revision is not necessarily a good one.

Four of nine returned letters received an editorial revision and five were kept. One returned letter also had a built-in repair. All nine returned letters report zero mechanical writing issues; only three meet the independent-of-those-checks editorial bar used here. The floral letter failed before a returned editorial result. Built-in repairs are part of a single application request, not hidden manual retries. There were no manual retries in the ten-case cohort.

Runtime timestamps and issue counts are preserved in runtime-summary.json and runtime-status-log.txt. The intentional unauthenticated smoke requests returned 401 and are excluded from generation outcomes.

## Download and template review

The baseline contains 19 DOCX/PDF pairs, each PDF one page. Three separate edit probes add six files and three PDF pages, for **44 inspected files and 22 visually inspected PDF pages**. The false-approval files are explicitly isolated under edit-checks/approval-negation as bug evidence, not approved application examples.

Every DOCX/PDF/visible-preview comparison matched the complete normalized alphanumeric text in order, in both directions. Normalization ignores punctuation, whitespace, case and formatting; this is not byte equality. The export inspector also found no missing paragraphs, out-of-page text or leaked editor instructions. The invalid numeric edit did not enter either downloaded file; the accepted punctuation edit and the incorrectly accepted approval edit did.

The default Essential/ATS Core presentation is legible and restrained: clear section headings, consistent alignment, modest colour, and matching name/header typography across résumé and letter. No clipped lines, orphaned headings, empty experience entries, duplicated qualification blocks or diagnostic text appeared in the inspected PDFs. This pass tests that default presentation, not every template, page size, browser or long-career pagination case.

The letters occupy roughly the upper half of the page and often less. Sparse sources do not justify filler. Improve the chosen example and the connections within it; do not enlarge fonts or invent achievements to hide empty space. Résumé skills should remain capabilities: the floral additions **“Flower lists”** and **“Spending limits”** read like extracted nouns. The AV résumé would be more selective without unrequested expired height training, while retaining its expired status wherever it is shown.

Native Microsoft Word pagination was **not verified**. DOCX text/XML inspection and PDF layout review do not establish Word rendering. Copy buttons reported success, but clipboard byte readback was **not independently verified**.

## Automated checks and state restoration

The current 865-test automated suite passed with zero failures. Four public routes returned 200 with the deployed entry asset, and the three generation/intake endpoints rejected unauthenticated requests with 401 and no-store. Production still points at the tested revision. The newly discovered policy-gap reproducer exposes two wrong outcomes despite that passing suite; it is stored separately and was not disguised as a passing test.

The original saved résumé was restored and read back with an exact **10,984-character** match. The fictional wardrobe letter was also restored after the edit probes. The private résumé backup is excluded from the review bundle.

## Recommended next work

1. Fix meaning-changing edits first. Preserve actor, action, object, approval/supervision condition, negation, quantity/unit and temporal status across every validation boundary. Test positive paraphrases alongside changes that reverse a requirement; do not mark the reversed version verified or exportable.
2. Remove the edit-only vocabulary mismatch as a proxy for truth. Accept harmless courtesy and style changes through the same content contract, while continuing to review factual additions. The two current reproductions must switch to their expected outcomes before calling the contract consistent.
3. Diagnose the floral 422 using preserved synthetic provider drafts and exact citation mappings. Keep the first failure intact, record a separate retest, and avoid simply deleting numbers until the error disappears.
4. Improve selection before shortening prose. Profiles need useful professional focus; letters need a focused source-supported example. Review both low-content revised profiles and repetitive kept letters. A model's keep/revise decision and zero mechanical issues are not release-quality evidence.

Use these cases as regression fixtures after fixes, then freeze another unseen cohort for release evaluation. A successful retest must remain separate from this first-attempt record.

## Per-document rubric evidence

Dimension order: relevance, useful detail, document purpose, selection/organization, natural professional writing. Each assessment below gives the score and the observed reason. A short letter can pass; avoiding factual errors alone earns no writing points.

### F01 — CNC Machine Operator

**Résumé: 17/20; evidence pass; meets the bar.**

- **relevance — 4/4:** The profile selects small-batch aluminium milling and dimensional inspection, directly matching the posting.

- **useful detail — 4/4:** The first-off inspection bullet preserves both the measuring tool and technician approval; 180 brackets remains a shared total.

- **document purpose — 3/4:** The two-sentence profile establishes trade and focus without reciting the whole experience inventory.

- **selection — 3/4:** Relevant inspection appears first; certificate is slightly repeated in profile and education.

- **natural writing — 3/4:** Clear occupational prose; 'in total across both operators' is faithful but clumsy.

**Cover letter: 12/20; evidence pass; does not meet the bar.**

- **relevance — 3/4:** The opening selects CNC milling and first-off measurement, matching the job, but makes no specific case for this employer.

- **useful detail — 3/4:** Digital calipers and technician approval are useful constraints retained from the source.

- **document purpose — 1/4:** 'At Example Alloy Works, I loaded aluminium blanks…' simply converts the résumé bullets to first person; the letter adds no interpretation.

- **selection — 2/4:** The second paragraph inventories deburring and labels; the available shared production context is unused, leaving a thin case.

- **natural writing — 3/4:** Plain readable sentences and an acceptable brief closing, but little personal voice.

### F02 — Hand Bookbinder

**Résumé: 17/20; evidence pass; meets the bar.**

- **relevance — 4/4:** 'Short-run journal production' is an appropriate focus for this small-edition job.

- **useful detail — 4/4:** The sample bullet retains cloth, endpaper, spine lettering and approval before production; defect checks retain owner referral.

- **document purpose — 3/4:** The concise assistant identity avoids claiming independent master-binder status, though 'including signature sewing and cloth-cover fitting' repeats tasks.

- **selection — 3/4:** Sample approval leads the experience; library volunteering remains correctly labelled.

- **natural writing — 3/4:** Specific and readable, with modest repetition in the profile and skill list.

**Cover letter: 14/20; evidence pass; does not meet the bar.**

- **relevance — 4/4:** The approved binding sample and finished-journal checks closely fit the small-edition posting.

- **useful detail — 3/4:** 'Approved cloth, endpaper, and spine lettering before production' supplies a concrete constraint and process.

- **document purpose — 2/4:** The sample-to-inspection paragraph gives some process context, although much remains a direct retelling of source duties.

- **selection — 2/4:** 'Sewed text blocks' is immediately followed by 'This hands-on work included both signature sewing and case binding', adding repetition rather than another reason to hire.

- **natural writing — 3/4:** Readable and professional, with a stock but acceptable closing; the redundant explanatory sentence weakens economy.

### F03 — Audiovisual Event Technician

Correctly marked preliminary for unconfirmed evening/weekend availability; no availability invented.

**Résumé: 14/20; evidence pass; does not meet the bar.**

- **relevance — 4/4:** 'Civic-event panel discussions' and lead-technician support appropriately position an assistant for the target role.

- **useful detail — 3/4:** Two meeting rooms, presenter rehearsals and backup-cable labels give concrete setting and process.

- **document purpose — 2/4:** 'Including room AV setup, rehearsal preparation and live sound support' largely repeats the bullets; the setting and supervision add some context.

- **selection — 2/4:** Supervised mixing leads the experience, but the retained 'expired June 2025' height training is not requested by this posting and distracts from relevant strengths.

- **natural writing — 3/4:** Readable overall, although 'with 2022–2026 experience' is awkward résumé prose.

**Cover letter: 14/20; evidence pass; does not meet the bar.**

- **relevance — 3/4:** The letter selects room setup, rehearsal checks and supervised live mixing; it does not claim missing evening/weekend availability.

- **useful detail — 3/4:** 'Two meeting rooms' and 'under the lead technician’s direction' retain useful scope and contribution limits.

- **document purpose — 2/4:** Rehearsal versus live-session context gives some structure, but the letter still mostly replays the same job bullets.

- **selection — 3/4:** One employer's setup and session work form a coherent short example; it appropriately leaves expired, unrequested training out.

- **natural writing — 3/4:** Plain, clear prose; 'logged equipment faults for the equipment team' is repetitive wording.

### F04 — Travel Reservations Agent

**Résumé: 18/20; evidence pass; meets the bar.**

- **relevance — 4/4:** 'Coach-tour and accommodation booking settings' synthesizes both roles into a useful professional focus.

- **useful detail — 4/4:** Supplier confirmation before promises and senior-agent review of exceptions preserve valuable judgement boundaries.

- **document purpose — 3/4:** The profile combines domain, diploma and languages instead of listing the reservation tasks again.

- **selection — 3/4:** The current job's three distinct responsibilities are easy to find; education/languages are repeated briefly in the profile but remain relevant.

- **natural writing — 4/4:** Clear, economical prose and conventional headings. 'Fluent English and Italian' is supported without inventing language use in past duties.

**Cover letter: 14/20; evidence pass; does not meet the bar.**

- **relevance — 4/4:** Reservations, cancellation exceptions and accessibility confirmation closely match the posting.

- **useful detail — 3/4:** 'Asked suppliers to confirm arrangements before promising them to customers' preserves an important judgement boundary.

- **document purpose — 2/4:** The exception/confirmation paragraph provides some relevant context, but is primarily a verbatim duty inventory.

- **selection — 2/4:** 'This work required accurate reservation records and clear communication with suppliers' restates the opening without strengthening the case.

- **natural writing — 3/4:** Readable, restrained language; the definitional sentence and standard invitation make it mechanical.

### F05 — Insurance Claims Assistant

**Résumé: 15/20; evidence pass; does not meet the bar.**

- **relevance — 4/4:** Motor-claim intake, missing information and adjuster escalation align closely with the job.

- **useful detail — 4/4:** 'Shared follow-up queue for approximately 45 active files as part of a three-person administration team' preserves scope without personalizing the team total.

- **document purpose — 1/4:** 'Claims Administration Assistant with experience in motor-claim file administration' is circular and adds almost nothing beyond the title; the source offers records experience and relevant ongoing study.

- **selection — 3/4:** Distinct intake, queue and decision-escalation bullets are easy to scan; ongoing study appears once with its exact status.

- **natural writing — 3/4:** Experience prose is clear; the tautological summary is flat rather than informative.

**Cover letter: 14/20; evidence pass; does not meet the bar.**

- **relevance — 4/4:** The selected motor-claim administration work directly matches the role.

- **useful detail — 4/4:** The adjuster's checklist, shared 45-file workload and three-person denominator are concrete and preserved.

- **document purpose — 1/4:** 'In my Claims Administration Assistant role… I opened motor-claim files' starts an almost line-for-line replay of all three résumé bullets.

- **selection — 2/4:** Intake, queue size and repair documents are listed without a focused explanation of the candidate's approach; relevant records background goes unused.

- **natural writing — 3/4:** Clear and accurate sentences, but mechanical first-person conversion rather than a developed application.

### F06 — Recycling Sort Line Operator

**Résumé: 18/20; evidence pass; meets the bar.**

- **relevance — 4/4:** 'Recovery depot' and material-identification/hazard-escalation focus match the role without padding the short source.

- **useful detail — 4/4:** The mixed-paper belt, contamination checklist and authorized-staff isolation retain important work constraints.

- **document purpose — 3/4:** A short profile gives setting and focus rather than recounting all three tasks; it is modest but informative.

- **selection — 3/4:** Hazard escalation is prominent, and no invented education or irrelevant empty sections are added.

- **natural writing — 4/4:** Direct, specific wording; 'after authorized staff isolated the line' clearly assigns authority to the right people.

**Cover letter: 16/20; evidence pass; meets the bar.**

- **relevance — 4/4:** Sorting against a material guide and escalating hazards address both required qualifications precisely.

- **useful detail — 4/4:** 'Did not handle unidentified hazardous items' and cleanup only after authorized isolation preserve essential limits.

- **document purpose — 2/4:** The hazard-to-escalation/cleanup paragraph makes an adequate focused safety example; it remains source-close and does not reach strong document-purpose quality.

- **selection — 3/4:** A concise material-sorting introduction supports one bounded safety example. The sparse source is used without invented credentials or filler.

- **natural writing — 3/4:** Plain credible prose with a conventional closing. Shortness itself earns no points; explicit authority and work constraints do.

### F07 — Funeral Service Assistant

**Résumé: 17/20; evidence pass; meets the bar.**

- **relevance — 4/4:** Memorial-service experience and bereavement communication training are relevant to sensitive service support.

- **useful detail — 4/4:** Family-approved photographs, the coordinator's final programme and approved collection instructions retain concrete approval boundaries.

- **document purpose — 3/4:** The profile combines work setting and training; 'service-room preparation and visitor and family support' provides modest focus without claiming counselling expertise.

- **selection — 3/4:** Preparation, personal-item records and visitor assistance are distinct; the earlier hospitality role supports continuity.

- **natural writing — 3/4:** Respectful and factual, although 'with…with a focus' and 'visitor and family support' make the profile slightly clumsy.

**Cover letter: 13/20; evidence review; does not meet the bar.**

Output adds 'before visitors arrived'. The source says 'Prepared seating, displayed family-approved photographs and checked printed service programmes against the coordinator’s final copy' and separately describes welcoming visitors; it does not establish this timing. Plausible, but inferred rather than verified; review, not a proven falsehood.

- **relevance — 4/4:** Service preparation, family instructions and keepsake records are well matched to the posting.

- **useful detail — 3/4:** Coordinator/family approval and keepsake collection are concrete, but no richer use is made of the relevant communication training.

- **document purpose — 1/4:** 'This work required careful preparation from approved instructions before visitors arrived' explains the preceding duty inventory rather than developing a distinct case.

- **selection — 2/4:** The two paragraphs largely replay the three current-role bullets; the definitional sentence adds repetition.

- **natural writing — 3/4:** Respectful and readable, with mechanical 'This work required…' wording and an unnecessary inferred timing clause.

### F08 — Localization QA Tester

**Résumé: 16/20; evidence pass; meets the bar.**

- **relevance — 4/4:** Pre-release game builds and Japanese interface text make the professional focus specific.

- **useful detail — 4/4:** Screenshots, build numbers, reproduction steps and lead-approved wording preserve concrete QA and authority details.

- **document purpose — 3/4:** The profile identifies language/domain and glossary focus without listing the full bug-report procedure.

- **selection — 2/4:** The role leads with retesting, then reporting, then initial testing; putting the primary testing/reporting contribution first would be easier to follow.

- **natural writing — 3/4:** Mostly clear. 'Native Japanese localization QA tester' should more explicitly say native Japanese speaker to avoid ambiguity; the source establishes language fluency, not nationality.

**Cover letter: 16/20; evidence pass; meets the bar.**

- **relevance — 4/4:** Japanese interface defects and reproducible reporting address the employer's central need.

- **useful detail — 4/4:** Jira, screenshots, build identifiers, reproduction steps and lead approval make the example specific.

- **document purpose — 3/4:** The report-to-retest paragraph develops the defect lifecycle using an explicitly supported sequence, rather than separate unrelated jobs.

- **selection — 2/4:** 'Displayed text…approved glossary' appears in both opening and second paragraph and could be consolidated.

- **natural writing — 3/4:** Readable professional prose; 'As a native Japanese speaker' correctly specifies language and is clearer than the résumé's wording.

### F09 — Freelance Floral Designer

Portfolio URL occurs once in résumé header; descriptive Courtyard Wedding project retained with client, date, sightline constraint and palette. Cover-letter generation failed; preserve first failure. Rejected provider text unavailable for direct factual review.

**Résumé: 14/20; evidence pass; does not meet the bar.**

- **relevance — 4/4:** Client-approved floral designs, substitutions and arrangements directly match the freelance brief.

- **useful detail — 4/4:** The shared 12-arrangement total and Courtyard Wedding sightline/palette example retain useful contribution and design constraints.

- **document purpose — 1/4:** 'Freelance floral designer with retail florist experience' repeats the role headings and fails to convey the available design focus.

- **selection — 2/4:** The actual project and a single header portfolio URL are preserved, but skills such as 'Flower lists' and 'Spending limits' are objects, not well-written capabilities.

- **natural writing — 3/4:** Experience and project prose are clear; the generic profile and noun-only skill additions weaken the professional presentation.

**Cover letter: unavailable; evidence unavailable; does not meet the bar.**

No letter returned. The UI reported: 'The draft could not be verified against your résumé and posting. Nothing was saved; try again.' No manual retry was made.

### F10 — Theatre Wardrobe Assistant

**Résumé: 15/20; evidence pass; meets the bar.**

- **relevance — 4/4:** Costume care, rehearsed quick changes and supervisor-directed work are closely relevant.

- **useful detail — 4/4:** Buttons, hems, costume plots, pre-performance fastenings and supervisor approval give concrete contribution boundaries.

- **document purpose — 2/4:** The diploma adds background, but 'Theatre wardrobe assistant with theatre-production experience' is repetitive and the rest retells duties.

- **selection — 2/4:** The order goes repairs, quick changes, preparation; leading with performance preparation would make the main contribution easier to scan.

- **natural writing — 3/4:** Experience prose is precise. 'Within wardrobe supervisor instructions' is awkward and should read 'following the wardrobe supervisor’s instructions'.

**Cover letter: 16/20; evidence pass; meets the bar.**

- **relevance — 4/4:** Performance preparation, quick changes and minor repairs answer the wardrobe brief directly.

- **useful detail — 4/4:** Rehearsed cues, post-show repair records and supervisor approval for alterations preserve useful process and limits.

- **document purpose — 2/4:** The performance/repair example has an adequate coherent purpose, although it stays close to the résumé wording.

- **selection — 3/4:** Preparation is followed by performance support and repairs; each paragraph contributes a distinct part of the same relevant work.

- **natural writing — 3/4:** Plain credible writing with a brief conventional closing; it avoids inflated design ownership and padding.
