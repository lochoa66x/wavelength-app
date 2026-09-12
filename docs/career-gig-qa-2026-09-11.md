# Ten more careers and gigs — adversarial document review

Reviewed September 11, 2026, against application commit `5c4e2618bf267315080f7fc81f5f5b07852aa8ef`.

**Verdict: the layouts are usable, but the evidence checks still accept consequential false claims and sometimes reject truthful work. Fix those failures before spending another pass on visual polish.**

## What was actually tested

Ten new fictional profiles and complete fictional postings cover healthcare, electrical work, HVAC, delivery, cleaning, cooking, tutoring, photography, pet care, and landscaping. They include employed, contract, freelance, part-time, seasonal, supervised, and unpaid experience. None are recycled accountant/plumber/carpenter cases.

The run used the real local résumé and cover-letter API handlers, evidence assessment, repair/fallback logic, saved-draft readiness, manual-edit validation, and PDF/DOCX exporters. Provider responses and authentication were controlled fixtures. No local AI provider credentials are configured, so **these are not fresh live AI generations and do not measure the production model's error rate**. The supplied letters are deliberately short, human-authored controls; criticism of those sentences must not be presented as a discovery about live AI prose.

The browser harness used the real document workspace and résumé preview components, with fictional drafts and a local authentication stub. It did not exercise production login, job ingestion, billing, or submission. Its initial missing-AuthProvider error was a harness setup problem, corrected before the final browser run.

## Results

| Check | Result |
| --- | --- |
| Truthful résumé handler responses | 9/10 returned 200; HVAC returned 422 |
| Truthful cover-letter handler responses | 9/10 returned 200; nursing returned 422 |
| Complete baseline document pairs | 8/10 |
| Actual baseline exports | 9 résumés and 8 letters, each in PDF and DOCX: 17 PDFs + 17 DOCX |
| Baseline PDF layout | All 17 pages rendered and visually inspected; no clipping or broken glyphs observed |
| Baseline identity | Names retained in selectable PDF text and DOCX text in all 17 available documents, including Zoë and Léa |
| Primary false-claim variants | 20, exercised through generation, editing, restored-plan export, and résumé generation/repair |
| False cover-letter generation variants that reached PDF export | 8/20 |
| False restored-plan variants that reached PDF export | 9/20 |
| False résumé variants that reached both PDF and DOCX export | 5/20, all marked application-ready |
| Initial manual-edit variants | All 20 rejected; this did not establish that equivalent edits were safe |
| Two supplemental edits using existing source vocabulary | Both accepted and exported with false meaning |
| Browser previews | 10 desktop + 10 mobile checks; no page/article horizontal overflow or Vite overlays; fresh-session page-error list empty |
| Actual editor reproduction | Pet-sitter negation reversal accepted by Save & recheck; false preview retained application-ready status and enabled downloads |
| Existing regression suite | 736 passed, 0 failed |

These counts describe overlapping routes for the same crafted attacks, not separate users or independent failure probabilities. The restored-plan checks construct source-bound plans through the app's normal model function; they are not demonstrations that arbitrary corrupt localStorage bypasses hash checks. Native Word pagination and browser-to-disk download completion were not verified. The actual exporter files were generated and inspected separately.

The HVAC failed résumé review is carried forward to its letter checks. It blocks matching-letter export even when the letter API accepts false claims. An early harness version used an independent fallback review for that case; it is preserved under `tmp/career-gig-qa-2026-09-11` but is **not** the authoritative result. Use `tmp/career-gig-final-2026-09-11` and the counts above.

## Case-by-case review

| Case | Résumé review | Cover-letter review and adversarial result |
| --- | --- | --- |
| G01 — Registered nurse | Truthful résumé exports. A change from **six patients per shift to six wards per shift** also exports in PDF/DOCX as application-ready. Registration is below experience and education, despite being a central qualification. | Truthful wording about **supervised clinical placements** is misread as claiming leadership and returns 422. Removing only that truthful paragraph produces 200 in the positive control. The false sole-credit team result is correctly blocked. The baseline letter failure masks the patient-unit attack on the letter route; do not count that as a successful semantic defense. |
| G02 — Electrical apprentice seeking journeyperson contract | Appropriately preliminary. Supervised work and active apprentice registration are preserved. Unfinished journeyperson exam preparation is placed near the top, while the held registration sits near the bottom: poor priority. | False journeyperson licence and independent inspection claims are blocked. The truthful letter repeats the same apprentice/conduit point in the opening and evidence paragraph. This control shows mechanical coherence, not persuasive positioning for the stretch role. |
| G03 — HVAC technician | **Truthful source title is blocked** after the credential gap changes fit positioning. The title matches the existing role, but the transferable-path rule treats target-title reuse as unsupported. A credential gap should not erase a real job title. | API accepts a claim that both refrigerant handling and First Aid credentials are current, even though refrigerant handling is explicitly expired. A direct credential-check control also misses it. The actual failed résumé review blocks export of this matching letter. The same masking occurs for five visits/day changed to five visits/hour. |
| G04 — Weekend delivery courier | **24 deliveries per shift becomes 24 per hour** and survives repair into PDF/DOCX. The missing required weekend availability remains a material gap, yet the output is application-ready. A source note that availability is “not established” is retained in employer-facing résumé text. | Changed delivery rate and invented weekend/immediate-start availability both pass generation and PDF export. The factual control keeps weekday work explicit. The final readiness label needs to draw attention to the unanswered scheduling condition. |
| G05 — Independent home cleaner | Self-employment and client work are retained without inventing an employer. Résumé repair removes both tested false rewrites. The role is readable, but the generic skills section adds little beyond the first bullets. | Eight recurring households becomes **eight offices every day** and exports. Invented liability insurance and a current background check also export. A cited access/key-handling procedure does not establish either assurance. |
| G06 — Temporary event cook | Meals, team participation, food-safety work, and employment history survive. False résumé variants are repaired. The mandatory held food-handler credential sits after experience instead of near the qualification summary. | **80 meals during a shift as part of a team becomes 80 meals/hour independently** and exports. The combined allergy/zero-incident guarantee is blocked because of the invented zero; this does not demonstrate that every guarantee is understood. The control letter is mostly a restatement of work duties. |
| G07 — Freelance mathematics tutor | Part-time and unpaid history stay labeled. **30 sessions per month becomes 30 students** in an application-ready PDF/DOCX. Session count is not unique-student count. | The original 30-student attack is rejected by generation but exports as a restored plan. A result guarantee also exports. A supplemental manual edit claiming 30 sessions **for 30 students** is accepted and exported. Accented identity is preserved. |
| G08 — Freelance event photographer | Portfolio URL and accented name survive. **Seven business days becomes seven hours** in PDF/DOCX. The bullet about event volume is placed after permissions, weakening the immediate evidence of event experience. | Turnaround inflation passes generation and PDF export. The explicit unlimited-rights/ownership claim is blocked. The letter header drops the supplied portfolio URL, although the résumé retains it; a profession-aware contact policy should preserve an explicitly supplied relevant portfolio. |
| G09 — Pet sitter / dog walker | Gig and unpaid rescue experience remain distinct. **Did not administer medication becomes administered medication** in an application-ready PDF/DOCX. This directly contradicts source evidence. | The reversal also passes generation and PDF export. The shorter edit **“I did administer medication.”** passes actual UI Save & recheck and keeps application-ready status. A ten-dog group-walk claim is correctly blocked. This is the strongest proof that a shared word set does not preserve meaning. |
| G10 — Seasonal landscape crew member | Seasonal history and crew contribution are retained; source repair removes false licence and management claims. Missing pesticide licensing is preferred in this fictional posting, so treating it as a preference is appropriate. | Both false licence and crew-ownership claims are blocked. The letter is readable but generic. For a seasonal gig, a compact work-focused message may fit better than a full corporate letter; availability should only be included when supplied. |

## Fixes in priority order

### 1. Preserve the meaning of quantities and negative evidence

**Priority P1.** Numbers currently match while the thing being counted or the time period changes. Explicit negative statements can reverse polarity. The shared checks need to retain the source fact's quantity, unit, rate denominator, actor, and negative/positive meaning. A limited list of recognized units cannot cover arbitrary professions.

Reproductions: G01 patient/ward; G04 shift/hour; G07 sessions/students; G08 business-days/hours; G09 medication negation. Relevant code: `src/candidateClaims.js` (`quantityUnits`, `candidateClaimIssues`) and `src/documentIntegrity.js` (`claimMeaningIssues`).

Acceptance: every reproduced false variant must fail generation, editing, restored-draft readiness and export, or be repaired back to the factual source before résumé export. Truthful rewrites must still pass. Confirm the exported text, not just the handler status. Do not replace this with a rule that bans all numbers or all first-person sentences.

### 2. Validate every credential in a compound claim

**Priority P1.** A recognized credential such as First Aid can cause the generic credential in the same claim to be ignored. G03 establishes this with a held First Aid certificate and expired refrigerant certificate.

Relevant code: `src/candidateClaims.js` (`credentialKeys`, `credentialEvidenceIssues`). Acceptance: AND requires each credential in its own stated status; OR permits a supported alternative. Mix known and previously unseen credential names, reversed clause order, held/expired/in-progress states, and positive controls. The unrelated HVAC title block must not count as passing this test.

### 3. Use equivalent claim checks on every document route

**Priority P1.** Generation accepts invented insurance, screening, availability and guarantees that the manual editor rejects. Restored-plan validation also differs from generation. Reusing the same helper is insufficient if routes apply additional, inconsistent rules.

Relevant code: `api/cover-letter.js`, `src/coverLetterModel.js` (`validateCoverLetterEdit`, `getCoverLetterReadiness`, `validateCoverLetterExportContext`) and the shared integrity modules. Acceptance: run the same matrix through initial generation, paragraph regeneration, edit/save, restored-plan review, copy authorization, PDF and DOCX. Test equivalent phrases composed entirely of existing source words. A lexical whitelist should not be treated as semantic validation.

### 4. Stop rejecting truthful roles and supervised experience

**Priority P1.** G01 falsely treats being supervised as supervising. G03 blocks an existing, source-supported title because fit is weak for a different reason.

Relevant code: the leadership expressions in `src/candidateClaims.js`; the transferable/career-change title condition in `api/_lib/tailoringEvidence.js` around line 1257. Acceptance: retain true historical titles independently of target-role eligibility. Distinguish “completed supervised placements” from “supervised the placement team.” Missing credentials should remain visible in fit guidance while truthful draft content remains usable under the appropriate readiness policy.

### 5. Make readiness useful for actual gigs

**Priority P2.** G04's required weekend condition is unanswered, but a strong green application-ready statement remains. Document integrity and suitability for a particular shift are different facts that need separate, visible labels.

Acceptance: show a specific pending-availability action beside the document status, and do not generate a start date or availability claim. Keep source notes such as “availability is not established” in candidate guidance unless the candidate intentionally chooses that employer-facing wording. Preserve the distinction between mandatory and preferred requirements demonstrated by G10.

### 6. Replace profession-biased writing advice and improve hierarchy

**Priority P2.** The run produces **29 résumé opener warnings**, including “photographed,” “diagnosed,” “walked,” “washed,” “watered,” “recorded,” “assisted,” and “observed.” These are valid, often precise verbs for the supplied work. Replacing “assisted” or “observed” with “installed” or “inspected” could strengthen responsibility without evidence. Nine of ten deliberately fragmentary profession openings also escape the letter fragment detector.

Relevant code: résumé writing review in `api/_lib/atsValidation.js` and its writing helpers; `src/coverLetterWriting.js`; presentation ordering in the résumé model/presentation modules.

Acceptance: stop warning solely because an action verb is absent from a profession list. Preserve contribution levels in every suggestion. Test novel occupations and complete-sentence/fragment positive controls. Bring relevant held credentials forward across professions, keep unfinished preparation separate, and preserve supplied portfolios in matching creative letters. Keep advice advisory; do not force short gig messages to fill a page.

## Design and editorial assessment

The current templates have consistent alignment, restrained orange accents, readable section labels, and usable one-column layouts. Matching letter/résumé alignment works in the inspected pairs. The large colored banner from the earlier screenshots is absent in these selected styles. Normal previews keep paragraph explanations and editing controls outside the document; the exported pages look like finished documents.

The hierarchy is still too generic. Registration, food-handler certification, active apprentice status, and a photographer's portfolio are more useful scanning anchors than a repeated “core skills” inventory. Seven available résumés use Essential and two use Field Ready; this run is not coverage of every style. Most controls are short and leave substantial whitespace. That is preferable to filler, but mobile previews retain a tall paper-like blank area that separates content from download controls. A compact preview or earlier export actions would reduce scrolling.

The 88–102-word successful control letters read cleanly but mostly repeat résumé facts, open with a job-description summary, and share the same closing. This is a weakness of the supplied controls, not proof of current model behavior. A live editorial evaluation should assess whether the app selects a distinct, useful example for the employer, explains the contribution naturally, preserves the candidate's scope, and avoids generic relevance claims. It should include concise gig proposals as well as conventional letters.

## Evidence and reproduction

- Reusable corpus: `tests/fixtures/careerGigCorpus.mjs`.
- Reusable runner: `scripts/verifyCareerGigs.mjs`.
- Run: `npm run verify:career-gigs`. Override `CAREER_GIG_QA_OUTPUT` to keep a separate run. The audit intentionally exits **1** while reproduced defects remain; it does not change expected results to report success.
- Authoritative evidence: `tmp/career-gig-final-2026-09-11/`, including inputs, API responses, baseline and DIAGNOSTIC exports, extracted PDF/DOCX text, rendered pages, browser snapshots, `summary.json`, `supplemental-probes.json`, and `focused-checks.json`.
- Regression log: `tmp/career-gig-regression.log`.

DIAGNOSTIC files intentionally contain false claims and must never be submitted as applications. This pass added QA material and an npm audit command; it did not change or redeploy application behavior.
