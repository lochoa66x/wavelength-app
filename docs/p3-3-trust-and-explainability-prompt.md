# P3.3 — Trust, explainability, and first-use reliability

Repository: `C:\Users\Luis\Documents\Codex\gigscapes-v7`

Baseline: clean `main` at `bfe072cacf9c337dee080e7b1169ffa6a6fe3f63`

## Mission

Ship the next production-quality Gigscapes release as a senior product engineer. Strengthen the evidence-first promise at the exact points where a first-time user can lose trust: contradictory readiness states, a reviewed posting producing no atomic requirements, unexplained résumé changes, unclear missing qualifications, thin technology searches, duplicate job cards, raw importer errors, and ambiguous pricing or browser-only storage copy.

Preserve every existing truth, privacy, Auth, source-policy, canonical résumé, DOCX, direct-PDF, and template-parity boundary. Do not reimplement fixes that are already present. Convert every previously reported regression into a permanent test.

## Non-negotiable constraints

1. Preserve all pre-existing work. Inspect Git before editing and do not discard, reset, overwrite, or silently reformat unrelated files.
2. Keep one canonical readiness decision across the review panel, preview, copied text, DOCX, PDF, filenames, telemetry enums, and export authorization.
3. A posting requirement is never candidate evidence. Search aliases, target keywords, job descriptions, and AI suggestions may not create candidate skills, employers, credentials, projects, metrics, licenses, languages, or history.
4. Do not describe a named ATS as verified unless a dated, repeatable, authorized compatibility test exists. Keep the claim to ATS-readable structure and verified text extraction.
5. Do not add autonomous application submission. Nothing is submitted automatically.
6. Keep résumé and posting text out of quality-signal payloads, logs, URLs, analytics, and public database surfaces.
7. Do not change Supabase schema, grants, RLS, Auth providers, cron schedules, dependencies, or deployment configuration unless a demonstrated blocker requires a separate reviewed change.
8. Keep the canonical base résumé unchanged when tailoring, switching templates, reviewing evidence, or explaining changes.
9. Preliminary guidance stays outside browser résumé paper, DOCX, PDF, and copied résumé text.
10. Do not commit, push, or deploy until all locally available required gates pass.

## Workstream A — Canonical readiness invariants

Create or extend a single deterministic readiness contract with these mutually exclusive user-facing states:

- `blocked_identity`
- `needs_posting_review`
- `needs_requirement_analysis`
- `needs_evidence_review`
- `preliminary`
- `application_ready`

Required invariants:

- A final/application-ready export requires reviewed posting completeness, at least one atomic requirement, candidate identity, evidence integrity, safe contribution language, chronological/parseable structure, and no canonical significant-gap blocker.
- A reviewed posting with responsibilities and qualifications but zero atomic requirements is an analysis failure, not a candidate gap and not application-ready.
- `application_ready`, `export_readiness`, `output_mode`, preview notice, DOCX/PDF labels, and authorization mode must never disagree.
- Stale booleans cannot override the derived canonical state.
- Missing identity blocks all files. Other incomplete states may allow a clearly named preliminary file when the existing product contract permits it.

## Workstream B — Atomic requirements and application risk

Use the reviewed structured posting as the deterministic requirement inventory. Preserve `required`, `responsibility`, and `preferred` provenance while splitting compound capabilities carefully and deduplicating OCR/model repetition.

Each sanitized requirement must include:

- stable ID;
- atomic requirement text;
- original parent requirement when split;
- priority/provenance;
- evidence classification (`direct`, `adjacent`, `transferable`, `missing`);
- exact evidence citation when supported;
- deterministic gap severity;
- concise application-impact explanation.

Severity vocabulary:

- `verified_blocker`: a missing explicitly mandatory licence, regulated credential, work authorization, security clearance, language requirement, or explicit non-negotiable work condition;
- `material_gap`: a missing required/core capability;
- `development_gap`: a missing responsibility that may be learnable but is not evidenced;
- `preference`: an unmet preferred qualification;
- `supported`: verified direct, adjacent, or transferable evidence exists.

Never tell the user that an employer will definitely reject them. Use application-risk language and state that employers may waive requirements. A verified blocker prevents a strong-fit/application-ready claim but does not prevent the user from reviewing or downloading an explicitly preliminary draft.

## Workstream C — Explainable tailoring

For each experience bullet that can be mapped to verified source evidence, expose a deterministic change record containing:

- original verified line;
- proposed tailored line;
- role and bullet index;
- change type (`retained`, `rephrased`, `condensed`, or `repositioned`);
- plain-language reason;
- matched posting requirement when available;
- exact evidence citation and source line when available.

Render the ledger before the résumé preview under a clear “Why this résumé changed” control. It must explain that the base résumé is unchanged. Do not fabricate a source mapping: omit an unexplained change record when no defensible source line exists and keep integrity validation authoritative.

This phase may provide `Keep tailored wording` and `Use verified original` controls only when the original source line is known. Replacing a tailored bullet with verified original evidence must not silently retain a final authorization based on the previous text; mark the adjusted document preliminary until it is rechecked. Arbitrary free-text editing is deferred unless a deterministic revalidation boundary is implemented in the same release.

## Workstream D — Intake reliability and safe errors

- Convert URL-import, screenshot, and tailoring failures into bounded user-facing categories. Never expose raw `undefined`, IP/DNS internals, upstream bodies, tokens, or stack traces.
- Preserve the entered URL or selected screenshots after failure.
- Keep Paste posting and Screenshots alternatives visible for blocked/unreadable URLs.
- Add a visible cancel action while URL/screenshot extraction or tailoring is active. Cancellation must abort the request and return the current source to an editable state.
- Late results from cancelled or previous source sessions must remain discarded.
- Keep retry actionable and source-specific.

## Workstream E — Thin searches and duplicate trust

- Expand SAP discovery aliases to common truthful listing terms such as FI/CO, FICO, FI-CA, FICA, IS-U, ISU, and S/4HANA for Utilities. These aliases are discovery-only.
- If a recognized search has no inventory, explain the observed stage and suggest concrete related searches or broader location/workplace filters. Never show unrelated cards as exact matches.
- Cluster exact duplicate postings by stable source ID or canonical URL.
- When normalized employer, title, posting day, and sufficiently detailed public snippet are identical across location-specific rows, show one representative with all observed locations rather than repeated cards. Preserve every original source URL/attribution and do not merge materially different content.
- Later pagination must preserve the displayed representative and saved/dismissed/tailored state.

## Workstream F — Public product clarity

State the current commercial and storage boundaries plainly:

- The current beta experience does not request payment-card details.
- Future paid features, if introduced, will be disclosed before a paid action.
- The base résumé is saved only in the signed-in account's current browser/device, is not cloud-synchronized, and may be lost if browser data is cleared.
- Tailoring sends only the current private request to the existing provider boundary.
- Nothing is submitted automatically.

Do not publish invented future plan names, prices, limits, outcome claims, customer counts, or testimonials.

## Permanent regressions

Retain and rerun coverage for:

- second-posting source reset;
- screenshot conflict/confirmation reset;
- URL-to-paste and screenshot-to-paste late-response rejection;
- DOCX creation and categorized failures;
- `[object Object]`, `undefined`, `null`, placeholders, and metadata exclusion;
- selectable direct PDFs matching canonical content and section order;
- preliminary guidance outside every résumé format;
- mobile drawer containment and flat app wordmark;
- all occupation families and all 14 selector choices;
- no search alias or target requirement becoming candidate evidence.

## Cross-career fixtures

Exercise at minimum:

- SAP functional/enterprise software;
- software engineering;
- project/program leadership;
- administration/customer operations;
- electrician or regulated skilled trade;
- plumber or field service;
- apprentice/credential gap;
- healthcare;
- education;
- finance;
- marketing;
- creative/design;
- career transition.

## Required verification

1. Focused tests for readiness, tailoring evidence, ATS validation, intake, search diagnostics/query/identity, landing copy, storage, custom-job sessions, and the new explainability contract.
2. `npm run verify:exports` with no visible preliminary guidance or serialization artifacts.
3. `npm test` with exact pass/fail counts recorded.
4. `npm run build -- --sourcemap`; confirm DOCX/PDF libraries remain lazy chunks and inspect bundle growth.
5. `npm audit --json`; do not force-upgrade dependencies inside this release.
6. `git diff --check`, diff review, status review, and preservation of unrelated work.
7. Local signed-out browser flow for landing, search, zero/thin results, duplicate location display, account gates, URL failure fallback, and mobile width.
8. Authenticated/private tailoring verification only when an approved existing session is available; do not create private production data solely to satisfy a release checklist.
9. No commit, push, or production deployment until verification passes and the release action is authorized.

## Deliverable

Report the implemented behavior, files changed, exact focused/full/export/build results, remaining environment-dependent checks, Git state, commit SHA if created, and deployment state. Name every unverified claim explicitly rather than reporting it as passed.
