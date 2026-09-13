# Document quality and validation: execution brief

Implement the failures recorded in `evaluations/runs/fresh-careers-v2/QUALITY_REVIEW_2026-09-13.md`, starting from release `d5c9fe6`. Preserve the frozen inputs, first outputs, scores, error records and downloaded files. Do not replace a failed first attempt with a successful retest.

## Objective

Make factual edits obey the same content rules as generation, regeneration, readiness and export, while allowing ordinary courtesy and stylistic changes. Improve how summaries and letters use supported evidence, without inventing facts or rewarding shorter text for its own sake.

## 1. Approval, supervision and negation

- Reproduce the wardrobe change from “design alterations required the supervisor’s approval” to “design alterations required no approval.” Reject the changed meaning through every application-document validation boundary, including a restored draft and a freshly constructed export context.
- Compare the relevant action/object and its approval or supervision condition. Cover negative requirements, optional approval, independent execution, missing material supervision and changes to the approving actor. A supervisor approving one task must not justify an unrelated approval claim.
- Preserve legitimate equivalents: “subject to the supervisor’s approval”, “the supervisor approved design changes”, and “under the supervisor’s direction” when the matching source establishes them. Preserve genuinely source-supported work without an approval requirement.
- Keep existing quantity/unit, team denominator, contribution, employer, credential and academic-status checks. Do not remove a material qualifier to get a draft through validation.
- These checks remain bounded language checks, not a claim of universal semantic accuracy. Add explicit positive and negative tests for each supported distinction.

## 2. Consistent treatment of edits

- Accept “Thank you for considering my application” and other non-factual professional closings without requiring those words in the résumé.
- Remove the edit-only vocabulary rule as a separate truth policy. Put shared factual-content rules at the common validation boundary and keep identity, source-citation and content-hash checks at their boundaries.
- Allow punctuation, courtesy and supported paraphrases. Continue rejecting new unsupported tools, credentials, quantities, ownership or availability.
- Failed saves preserve the previous valid document and the user's input. A changed validation version must invalidate stale résumé assessments and old letter validation state where applicable.

## 3. Numeric failure diagnosis and recovery

- Investigate the floral 422 using the unchanged v2 source. Do not assume the rejected number was fabricated; the previous provider text and exact citation mapping were not retained.
- Add explicit evaluation capture of first provider output, validation issues, cited source records, repair output and the accepted/blocked outcome. Production must not log full private résumés or raw prompts by default. Evaluation recording must be opt-in/injected and must not change acceptance behavior.
- Test combined claims containing a shared quantity and a separately dated project, incorrect units/rates, wrong citations and unsupported numbers. A relevant cited numerical fact must not disappear solely because a different cited sentence has more lexical overlap.
- Keep repairs bounded and validate the complete merged document. Preserve first failure records even when a later run succeeds.

## 4. Useful content

- Résumé profiles establish profession/level, relevant setting and a useful supported focus or background. Flag profiles that only repeat role headings. Preserve informative originals when a proposed revision removes their context.
- Cover letters select one employer need and develop a supported example around process, judgement, scope or constraints. Add another example only when it contributes different useful evidence.
- Treat “This work required…” restatements, duty inventories and repeated examples as editorial issues. Do not force minimum length, invented motivation, generic claims of relevance or decorative opening variation.
- Keep source qualifiers and source IDs intact through editorial revision. Do not silently accept a low-scored “keep” decision as proof of high quality. Surface honest review status when useful revision is unavailable.
- Keep editorial advice separate from factual/export blocking. A sound document may be exportable while still needing writing improvements.

## 5. Verification and delivery

- Promote the two policy-gap reproductions into permanent tests, with generation/edit/regeneration/readiness/export coverage and positive paraphrase controls.
- Run focused tests while implementing, then the complete suite, build, and appropriate résumé/letter export checks. Inspect actual edited/downloaded content where feasible.
- Compare fixes against preserved v2 cases and keep any retests in new attempt files. Do not call a reused cohort unseen or use model self-scores as independent quality ratings.
- Report exactly what was fixed, what failed, what was tested, and any unverified native Word/clipboard behavior. Keep the original user résumé intact after browser testing.
- Commit and deploy validated application changes using the existing project workflow and the user's standing authorization. Verify the deployed revision. Do not present unresolved writing quality or unrun fresh-cohort evaluation as complete.

## Acceptance criteria

1. The approval-reversal edit is blocked, legitimate approval paraphrases pass, and the old valid document remains intact after rejection.
2. Courtesy edits pass the common contract and editor; unsupported factual additions fail consistently.
3. Evaluation evidence distinguishes first draft, repair and final outcome without overwriting prior runs or enabling default private-content logging.
4. Numeric matching respects the number's object, unit, rate and attribution even when a paragraph cites multiple facts.
5. Title-only profiles and redundant letter prose receive actionable editorial review; meaningful content cannot be discarded merely to reduce words or mechanical warnings.
6. Tests, build, export verification and deployment results are reported with their actual limits.

## Evaluation recording

Both API handler factories accept an optional `recordEvaluationEvent` callback. Use it only in a deliberate evaluation harness, persist each event with an exclusive file write, and fail the evaluation report if any persistence failed. The callback receives a request id, sequence, stage and a detached snapshot. Résumé events retain first/rebuild provider drafts, validation with source citations, source restoration and outcome; letter events retain first draft with resolved catalogs, attempted repair and outcome. Production has no recorder by default. For authenticated browser evaluation, /app?evaluation=1 explicitly requests a detached cover-letter report in that same response; its download stays outside the employer-facing document and is never logged on the server. The normal application flow does not request a report. Recorder failures cannot authorize, reject or mutate a document. Keep generated fixtures separate from real candidate material.
