# P3.2 Phase A — Privacy-safe résumé quality evaluation

You are continuing Gigscapes in:

`C:\Users\Luis\Documents\Codex\gigscapes-v7`

Work as a senior product engineer, résumé-quality analyst, privacy engineer, and release verifier. Implement a deterministic evaluation system that can measure whether Gigscapes preserves evidence, makes the correct readiness/export decisions, selects the correct résumé family, and produces safe artifacts across representative candidate paths.

## Mission

Create the first trustworthy P3.2 quality gate without introducing production surveillance. Use only synthetic or already-redacted test fixtures. The evaluator must exercise the same production contracts used by tailoring and export, produce only privacy-safe aggregate results, fail closed when a contract regresses, and remain useful for future provider/model comparisons.

This phase is an offline regression and release-quality system. It is not authorization to add production analytics, persist user events, collect résumé/posting text, change Supabase, or send data to a third party.

## Preservation and release boundaries

1. Inspect `git status`, the current branch, local/remote divergence, and the existing diff before editing.
2. Preserve every existing uncommitted user or interrupted change. Do not reset, restore, overwrite, or reformat unrelated files.
3. Treat the repository as the source of truth. Determine which P0–P2 contracts are already implemented before adding new logic.
4. Reuse existing canonical résumé, posting-readiness, evidence-integrity, template-selection, and export-readiness functions. Do not create a parallel product truth.
5. Do not change dependencies, Supabase schema/RLS/grants, Auth behavior, production model calls, pricing, or deployment configuration unless a demonstrated blocker makes a narrowly scoped change necessary.
6. Do not commit, push, or deploy unless the user separately authorizes that release action after verification passes.

## Evaluation corpus

Build a versioned synthetic/redacted corpus that is small enough to understand and broad enough to catch dangerous regressions. Include, at minimum:

- Technical / Software — direct fit.
- Admin / Customer Operations — direct fit.
- Skilled Trades / Field Services — verified regulated credential.
- Skilled Trades / Field Services — apprentice path without invented licence language.
- Skilled Trades / Field Services — required credential missing, forcing preliminary/non-application-ready output.
- Marketing / Communications — direct fit.
- Marketing / Communications — material career transition.
- Creative / Design — direct fit.
- Creative / Design — adjacent fit.
- Incomplete posting — posting-readiness gate remains preliminary.
- Unsupported metric or claim — evidence-integrity gate blocks unsafe content.

Each case must have a stable redacted ID, job family, candidate path, scenario, expected contract decisions, expected template, expected export mode, and synthetic numeric operational measurements. A case may be repeated under distinct model/provider variants, but IDs must remain unique within each variant.

The corpus must cover direct, adjacent, transferable, career-transition, apprenticeship, credential-gap, incomplete-posting, and integrity-blocked behavior. Do not weaken expectations to make a failing implementation pass.

## Required evaluator behavior

For every case, run the existing production résumé-package and export-readiness contracts and compare actual behavior with explicit expectations. Measure:

- Overall contract accuracy.
- Verified-posting/readiness accuracy.
- Final versus preliminary export authorization accuracy.
- Evidence-integrity accuracy.
- Recommended-template accuracy.
- Unexpected integrity issues in cases declared safe.
- Direct, adjacent, transferable, missing, covered, and total requirement counts.
- Aggregate coverage percentage.
- Synthetic attempts, retries, correction count, user edits, export completion, duration, input/output tokens, and estimated cost in integer micros.
- Results grouped by job family, candidate path, and model/provider variant.

The gate must fail if any expected contract decision is incorrect, a safe case acquires an integrity violation, a duplicate case ID exists within a variant, or the privacy validator finds prohibited content.

Initial release thresholds are intentionally strict:

- Contract accuracy: 100%.
- Posting/readiness accuracy: 100%.
- Export authorization accuracy: 100%.
- Integrity accuracy: 100%.
- Template accuracy: 100%.
- Unexpected safe-case integrity issues: 0.
- Privacy violations: 0.

## Privacy contract

The emitted report may contain only:

- Stable redacted case and variant IDs.
- Safe enums such as family, path, scenario, strategy, readiness, template, and status.
- Booleans.
- Integer/percentage measurements.
- Aggregate counts and gate results.

The report must never contain:

- Candidate names, emails, phone numbers, addresses, URLs, or account identifiers.
- Résumé, profile, bullet, job, company, posting, qualification, requirement, or evidence text.
- Evidence excerpts or source line contents.
- Prompts, model responses, error messages containing input, or raw provider payloads.
- Export bytes, document text, screenshots, OCR text, or filenames derived from private data.
- Tokens, credentials, cookies, secrets, or environment values.

Implement a recursive fail-closed privacy validator. It must reject sensitive field names, email/phone/URL patterns, and an explicit denylist of synthetic fixture identities. Validate the final report itself, not only the input fixtures.

## CLI and developer workflow

Add a repository script named `evaluate:quality` that:

1. Loads only the versioned synthetic/redacted corpus.
2. Runs the deterministic evaluator without network calls.
3. Prints formatted, privacy-validated JSON.
4. Exits with status 0 only when all release gates pass.
5. Exits nonzero on any quality or privacy failure.

Keep the evaluator independent of the browser UI and outside the production application import graph. The CLI must be suitable for local verification and future CI use.

## Focused tests

Add focused tests proving:

- The full redacted corpus passes all strict thresholds.
- Every required family and candidate path is represented.
- Reports expose only safe dimensions and numeric operational fields.
- A deliberately wrong expected template/decision fails the release gate.
- Sensitive keys, contact text, URLs, and forbidden identity terms are rejected.
- Duplicate IDs within one variant are rejected.
- The same redacted case can be compared across separate variants.

Also rerun the existing tailoring, readiness, template, DOCX, PDF, and export-integrity suites so this phase cannot conceal a regression in established behavior.

## Export-quality verification

Run the existing real-file export verifier and retain fixtures only for the duration of QA. Verify:

- All canonical template families.
- Final and preliminary authorization behavior.
- Fresh verified-posting requirements and stale-readiness rejection.
- DOCX creation without `[object Object]`, `undefined`, or `null`.
- ATS-safe native PDF generation with selectable text.
- No readiness/warning banner serialized into résumé content.
- LibreOffice conversion of every DOCX fixture.
- Native-PDF and DOCX-derived page-count agreement.
- Exact normalized token parity between each native PDF and its DOCX-derived PDF.
- No clipping, overlap, orphaned headings, missing glyphs, or blank trailing pages after visual rendering.

Microsoft Word, Google Docs, and an external ATS parser may be reported as unavailable; do not claim they were tested when they were not.

## Production build and bundle privacy

Run the full production build. Confirm that:

- The build succeeds without an application error.
- DOCX/PDF libraries remain lazy export chunks.
- Landing and app routes remain independently loaded.
- Test corpus identities, synthetic contact values, evaluator fixtures, and private résumé content are absent from `dist`.
- No generated QA artifact is tracked or staged.

## Documentation and handoff

Update the product pipeline and release checklist only after verification passes. Record:

- Exact corpus size and represented families/paths.
- Strict gate metrics.
- Coverage totals.
- Synthetic operational totals, explicitly labelled as fixtures rather than production telemetry.
- Focused and full test results.
- Real-file DOCX/PDF parity and visual results.
- Production build result.
- Privacy result.
- Known manual limitations.
- Current release state and whether a commit/push/deployment was authorized.

The final report must list every changed file, test/build/export results, the current HEAD, whether anything was committed or deployed, and any remaining blocker. If all local gates pass, identify the next pipeline phase as privacy design for optional aggregate production signals and feedback, followed by native mobile work after the web contracts remain stable.

## Definition of done

This phase is done only when the evaluator is deterministic, the report is demonstrably redacted, all strict gates pass, the full existing suite passes, all DOCX/PDF artifact checks pass, the production build succeeds, the bundle contains no corpus identity, the documentation is accurate, and no unauthorized commit or deployment has occurred.
