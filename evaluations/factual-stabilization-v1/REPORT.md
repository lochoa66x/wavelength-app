# Factual stabilization: outcome ownership and project classification

This cycle is limited to the two authorized factual defects. Templates, presentation controls, model/provider configuration and feature set remain frozen at c433385.

## What changed

The shared document contract is now version 10. It distinguishes a supported result from evidence that the candidate caused it. It checks implied résumé verbs, first-person sentences, joined actions, participial claims, team credit, and indirect claims such as “The revised checklist reduced…”. Personal achievement remains valid when the source actually establishes it. Matching ownership at another employer cannot authorize the claim.

A confidently recognized project heading is excluded from employment. “Month-end Improvement | Example Parts Distribution | 2025” becomes a project, retaining the same organization, year and source statements. Project Manager, Continuous Improvement Manager and genuine short engagements remain employment. Company-first project rows use an organization already established in the source. An employer whose name ends in Project does not make its employees projects.

Recovery restores complete source statements, including the diagnostic work, observed outcome and approval. A restored statement can replace an exactly contained shorter bullet so the repair does not introduce duplication. Missing protected outcome evidence is restored rather than treated as a success. Cover-letter generation records the rejected first draft before restoring evidence, and a later repair cannot pass by dropping the protected result or paragraph. Editing and export reject the ownership upgrade; stale version-9 assessments cannot authorize version-10 content.

## Before and after

| Case | Preserved defect | Corrected content |
| --- | --- | --- |
| C02 accounting | Month-end Improvement appeared as a job; “Reduced unresolved differences…” implied candidate ownership. | Two real jobs remain. The project contains the complete source: differences fell from 18 to 5; the controller approved final adjustments. |
| R07 hotel night audit | “Reduced unresolved exceptions…” implied candidate ownership. | The project keeps the batch diagnosis and checklist work, followed by the observed fall from nine to two and the manager's approval. |

Both corrected project examples retain the source result and approval. Neither is made valid by removing its result.

## Verification and denominators

- Baseline: six new regression groups, one passing and five failing. The original failures are retained in before-tests.log.
- Added controls cover indirect causality, qualitative results, source-employer scope, empty/stripped projects, company-first headings, date ranges, project-like employer names, normal handlers, manual edits, export authorization and later evidence deletion.
- Final full suite: 945 passed, 0 failed, 0 skipped.
- Build: passed. The existing bundle-size warning remains outside this cycle.
- Résumé export verification: passed; 48 generated files across 16 templates, with manifest parity and stale-authorization checks.
- Cover-letter export verification: passed; two DOCX and two PDF files with final/preliminary gate checks.

The deterministic replay uses the latest available 32 documents from the preceding preserved experiment. The two intended résumés were blocked before recovery and valid afterward. Only C02 and R07 résumé content changed. The other 30 documents remain unchanged. All 32 pass the current contract and export authorization after recovery.

Normal résumé-handler tests replay the captured provider outputs for C02 and R07 through the actual handler with a mocked provider. They use analysis plus draft only, with no model rebuild. A cover-letter handler test injects the unsupported ownership claim, verifies that the original failure remains captured, and confirms source restoration plus edit/export rejection.

There were **zero new live provider requests** in this cycle. This is regression/replay and integration evidence, not a new live-generation success rate, a human writing score, or a Microsoft Word visual review. Existing export scripts generated and inspected test files; no claim of new browser download or native Word testing is made.

## What testing caught during implementation

- The first project parser implementation split a date range incorrectly. The existing trades project-recovery test caught it; the parser was corrected.
- A project-like employer name initially risked classifying employees as projects. A new negative control caught it; organization/context handling was narrowed.
- Early outcome checks missed indirect causality and ownership borrowed from another employer. The failing controls and corrected results are preserved.
- Protection initially covered numeric observed outcomes but not shared or qualitative outcomes. The additional preservation test caught this and now passes.
- One older test explicitly allowed a project-owned result to become a candidate-owned bullet. Its expectation was updated to preserve “The project reduced…” and now also rejects the ownership upgrade. The separate projected-versus-realized metric checks remain. This is an intentional stricter contract, not a waived failure.
- Early shell edit-command quoting attempts failed before modifying files. These were tooling errors, not app failures.

## Boundaries and stopping point

Project recognition is deliberately conservative, using explicit sections, recognizable project headings and source context. The outcome checks cover the tested English constructions and source associations; they are not a universal semantic proof of causality.

This cycle does not improve general writing style, reduce repeated skills, change headlines, add templates, change model settings, or replace the pending human evaluation. Those items remain in BACKLOG.md.

The two scoped defects, evidence-preserving recovery, and their negative controls pass. This implementation cycle stops here.
