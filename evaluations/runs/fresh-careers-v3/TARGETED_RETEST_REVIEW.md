# Three known-case retests — kept separate from the first ten

F03, F07 and F08 were rerun with unchanged inputs on **8082792aedb8468fc4a71bca125a83b6c45eef9d**, contract **6**. These are selected regressions, not a fresh holdout or proof of general improvement. The original 3/10 accepted-pair result is unchanged.

| Case | First résumé validation | Letter validation | Downloads | Evidence R / L | Writing R / L | Pair accepted |
|---|---|---|---|---|---|---|
| F03 Production Baker | Pass; one draft | First draft passed | 4/4 | Pass / pass | 15 / 17 | Yes |
| F07 Veterinary Receptionist | Pass; one draft | First draft passed | 4/4 | Pass / pass | 13 / 17 | No |
| F08 Bicycle Mechanic | Pass; one draft | Automatic repair required | 4/4 | Pass / pass | 17 / 17 | Yes |

All six delivered documents were compared to the unchanged candidate source. No unsupported claim was found in these delivered retests. This is a limited observed result, not a claim that the validator catches all false statements. The veterinary profile no longer invents companion-animal clientele; the mechanic profile no longer derives five years from year-only dates. The baker preserves shared oven output.

All 12 actual downloads passed identity, preview/content parity, DOCX/PDF paragraph and PDF boundary checks. Six PDF pages were rendered and visually reviewed, with no observed clipping, overlapping content or editor-control leaks. Native Word pagination and independent clipboard readback remain unverified. Both production and downloaded previews used the same current contract for these tests.

## Another first-draft failure preserved

The mechanic's first letter said “from 2021 to 2026” and cited “Bicycle Mechanic | Example Commuter Cycles | 2021 - 2026”. The validator recognized the opening year as a calendar year but treated the ending year through the ordinary lexical relevance filter, which selected the work-detail sentence instead of the employment header. It incorrectly rejected the date. Automatic repair removed the dates; the final letter passed.

The raw failed draft is preserved in `tmp/useful-writing-v4-live-2026-09-13/targeted-contract6/F08-letter-report.json`. A subsequent shared-contract fix recognizes both endpoints of an explicit date range and requires the full pair in a single cited fact with the appropriate employer. Regression tests accept the captured wording and “between 2021 and 2026”; they reject changed endpoints, a derived five-year claim, dates stitched from different jobs, and another employer's range. This final narrow fix is contract **7**. Its verification uses the captured regression and full test/build checks; it was not silently substituted into the three contract-6 live attempts or claimed as another live retest.

## Agent rubric scores and excerpts

Same five dimensions, in this order: relevance, useful detail, document purpose, selection, natural writing. Threshold remains at least 15/20, every dimension at least 2, and passing evidence. These are agent judgments, not recruiter-calibrated ratings.

### F03 — Production Baker

Résumé **4, 4, 2, 2, 3 = 15/20**:

- Relevance 4: “Production Baker | Sourdough Bread” identifies the precise supported specialty.
- Useful detail 4: “120 loaves per shift with another baker as part of the combined oven output” preserves quantity, rate and shared attribution; written proofing limits also remain.
- Purpose 2: “sourdough dough preparation experience working within head-baker formulas and written proofing limits” gives a focused introduction, but still draws heavily from the duties.
- Selection 2: “batch records” and “Fermentation batch recordkeeping” overlap; the skills list grew unnecessarily.
- Natural writing 3: “when recorded dough temperature changed” is a concrete, readable condition; the overall text avoids inflated achievements.

Letter **4, 4, 3, 3, 3 = 17/20**:

- Relevance 4: “prepared sourdough dough from the head baker's formula” addresses the central bread-production need.
- Useful detail 4: “When recorded dough temperature changed” introduces a useful condition and the permitted response.
- Purpose 3: “adjusted proofing time within the head baker's written limits” develops a focused process rather than just naming baking skills.
- Selection 3: “kept labelled allergen containers separate” adds a distinct food-handling contribution in the second paragraph.
- Natural writing 3: “I also completed a Food Handling course in 2024” is plain and appropriately limited; the close adds no unnecessary recap.

### F07 — Veterinary Receptionist

Résumé **4, 3, 1, 3, 2 = 13/20**:

- Relevance 4: “Veterinary Receptionist | Client Service” appropriately positions the experience.
- Useful detail 3: “with the clinical team determining urgency and advice” preserves the clinical responsibility limit.
- Purpose 1: “scheduling visits, checking client and animal identification details, and maintaining appropriate boundaries” is a three-duty list repeated in experience. Removing the unsupported setting did not produce a good introduction.
- Selection 3: “Clinician-approved paperwork preparation” retains relevant evidence in four skill entries; the previous near-duplicate paperwork labels are gone.
- Natural writing 2: “Clinical question escalation within defined boundaries” remains an awkward noun pile.

Letter **4, 4, 3, 3, 3 = 17/20**:

- Relevance 4: “booked appointments using the clinic's visit-type guide” selects direct reception evidence.
- Useful detail 4: “without interpreting them, leaving urgency and advice to the clinical team” preserves the important constraint.
- Purpose 3: “passed clients' symptom descriptions to the veterinary nurse” explains how reception hands information to the appropriate decision-maker.
- Selection 3: “discharge paperwork from clinician-approved notes” supports the same relevant handoff process; unrelated retail detail is omitted.
- Natural writing 3: “confirmed that clients received the medication instructions provided by the clinician” is readable and appropriately limited.

### F08 — Bicycle Mechanic

Résumé **4, 4, 3, 3, 3 = 17/20**:

- Relevance 4: “Bicycle Mechanic | Brake Service” establishes the supported specialty.
- Useful detail 4: “after customer approval” and “documented final inspection” preserve authorization and verification.
- Purpose 3: “experience in commuter-bicycle repair, focused on repair estimates and brake service” provides a compact introduction without an invented tenure or full duty recap.
- Selection 3: “Recorded remaining wheel damage on handover sheets” keeps useful handoff information alongside the stronger repair evidence.
- Natural writing 3: “referred frame-alignment concerns to the senior mechanic” gives a clear responsibility limit without inflated language.

Letter **4, 4, 3, 3, 3 = 17/20**:

- Relevance 4: “inspected commuter bicycles for brake wear” directly supports the posting.
- Useful detail 4: “After customer approval, I replaced brake pads and cables” preserves the work sequence.
- Purpose 3: “before preparing a written repair estimate” connects inspection, estimate, repair and handover into a focused process.
- Selection 3: “remaining wheel damage on handover sheets” distinguishes completed work from unresolved concerns.
- Natural writing 3: “checked brake engagement during the workshop's documented final inspection” is specific, complete prose.

## User state

The original résumé was restored and read back from the editor after saving. Exact equality was verified for **10,984 characters**. The restoration record contains only timestamp, equality result and length; the private résumé text is excluded from the report and artifact bundle.
