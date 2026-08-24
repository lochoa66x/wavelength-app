# Canonical résumé architecture

Updated: 2026-08-24

## Scope

P2.1 Phase A establishes one versioned résumé-content pipeline for browser preview, DOCX, direct PDF, and plain text. Phase B1 adds Technical / Software and Admin / Customer Operations. Phase B2 replaces the hidden legacy trades presentation with the canonical Skilled Trades / Field Services family. All seven selectable families share one factual content plan, render manifest, persistence boundary, and export-authorization path.

## Contract

`ResumePackage` is created by `src/resumeModel.js` and has four deliberately separate concerns:

- `document`: user-visible candidate facts and target context.
- `evidence`: private source references, relevance, verified metric references, normalization warnings, and posting-completeness evidence.
- `classification`: occupation family, immutable career strategy, fit level, verified family evidence, SAP functional/technical distinction, recommendation reason code/strength, and deterministic trace.
- `presentation`: recommended and selected template IDs, human-readable reason, internal reason code/strength, page target, locale, and presentation version.

The package uses `schemaVersion: 2`. New code must not pass raw AI output to an exporter.

The visible document supports candidate identity/contact/links, target title/company, headline, summary, grouped verified skills, experience, projects, education, certifications, training, languages, safety content retained for compatibility, and strictly shaped additional sections. Export-visible nested values are never arbitrary objects.

## Pipeline

1. `createResumePackage` validates and adapts a legacy tailored result without mutating it.
2. `buildResumeContentPlan` determines the factual sections and stable item order once.
3. `buildResumeRenderPlan` applies a selected registry template to the content plan.
4. `createResumeContentManifest` records the exact visible values, stable IDs, headings, and order.
5. Browser preview, DOCX, PDF, and plain text consume the same frozen render plan.
6. Export verification compares each generated format to the manifest.

Template switching can change safe headings, section placement, typography, spacing, and grouping. It cannot change the factual content hash, selected item IDs, evidence classification, occupation family, career strategy, or export readiness. It never invokes AI.

## Validation and legacy adaptation

- Scalar fields accept only strings, numbers, and bigints after control-character cleanup.
- Known legacy objects are read through field-specific allowlists.
- Unknown structured values are omitted with warnings; they are never passed through `String(value)` or visible JSON serialization.
- Cycles are detected by the serializer/normalizer and cannot leak into visible output.
- Professional links accept only HTTP(S) URLs.
- Legacy IDs are generated deterministically from the field path and visible content when no source ID exists.
- Legacy records are adapted on read. This phase performs no destructive persisted-data or database backfill.
- Unknown future schema versions must be handled as invalid rather than silently downgraded.

## Classification and recommendation

Classification uses normalized target context, the validated tailored résumé, and the ATS/evidence review. It is deterministic and produces an internal trace.

Recommendation precedence is fixed so later families cannot bypass earlier trust decisions:

1. A trade or field-service target without verified hands-on evidence recommends Career Transition; a listing category alone never establishes trade experience.
2. A major transition recommends Career Transition.
3. A trade or field-service target with verified physical installation, repair, diagnostic, maintenance, construction, landscaping, service-call, or recognized-title evidence recommends Skilled Trades / Field Services. Missing required credentials cap the recommendation at moderate strength and remain outside the résumé.
4. A leadership/delivery target with verified ownership evidence recommends Project Leadership.
5. A functional SAP target with verified SAP functional lifecycle evidence recommends SAP Functional.
6. A software, web/application, cloud, data, DevOps/SRE, security, infrastructure, or technical-QA target with direct or adjacent verified technical evidence recommends Technical / Software.
7. A non-leadership administration, customer-support/success, scheduling, dispatch, data-entry, or service-operations target with direct or adjacent verified service evidence recommends Admin / Customer Operations.
8. Ambiguous targets and evidence gaps use ATS Core.

Programming-heavy SAP targets are technical. Explicit ABAP development or implementation evidence can qualify for Technical / Software; merely collaborating with an ABAP team cannot. A functional SAP candidate targeting a developer role without coding evidence is treated as a material transition rather than upgraded into a technical profile. A generic SAP keyword never establishes functional consulting by itself.

Admin/customer-operations matching excludes sales, marketing/communications, finance/accounting, and director/executive targets. Coordination language remains coordination unless verified ownership evidence independently supports leadership.

Skilled-trades matching excludes SAP Plant Maintenance, software/application maintenance, IT/service-desk work, maintenance planning, asset-management systems, and management targets. Those signals may remain adjacent evidence, but they cannot prove physical field work. The classifier distinguishes regulated-trade professionals, experienced field-service professionals, apprentices/helpers, general maintenance profiles, adjacent pivots, and significant career changes. A posting's licence or safety requirement never counts as candidate evidence; only explicit candidate credentials or verified candidate-side evidence can satisfy it.

An adjacent SAP module pivot may use SAP Functional when verified functional lifecycle evidence exists. Missing target modules remain missing and are never inserted into skills or history.

The user may override the recommended template, but not classification or career strategy. Safe section headings are based on both the selected presentation and the verified classification, so a visual override cannot create an unsupported SAP, leadership, or transition claim.

## Template registry

The registry stores stable ID/version, display metadata, ATS safety level, page target, supported sections, section order, preview metadata, compatibility notes, and shared visual tokens.

Selectable IDs:

- `ats-core-v1`
- `sap-functional-v1`
- `project-leadership-v1`
- `career-transition-v1`
- `technical-software-v1`
- `admin-customer-operations-v1`
- `skilled-trades-field-services-v1`

Legacy `trades`, `skilled-trades`, and `trades-legacy-v1` stored values resolve to `skilled-trades-field-services-v1` on read. No second trades family or persisted-data backfill is created.

The B2 render plan is compact, single-column, and credential-aware. It deterministically moves verified licences, safety training, apprenticeship/training, capabilities, experience, and projects according to the classified trade profile. Short apprentice/helper evidence targets one page; experienced trade and field-service evidence may use two pages. Missing or unverified credentials are review-only gaps and never become résumé content.

To add a template:

1. Add a versioned registry entry with ATS-safe tokens and a complete section order.
2. Keep all canonical sections supported through the generic renderer.
3. Add a deterministic recommendation predicate without changing higher-priority trust rules.
4. Add recommendation, override, manifest-parity, persistence, PDF extraction, DOCX, and visual fixtures.
5. Update the release checklist and product pipeline.

Do not put content generation, evidence interpretation, or exporter-specific section selection inside a template.

## Persistence

Template choice uses a versioned account-and-target-scoped local-storage key. Raw target text is hashed for custom targets; public listing IDs are allowlisted. Invalid/deleted template IDs fall back to the current recommendation. A selection cannot cross accounts or target postings.

## Export trust

The existing candidate-identity, verified-posting, fit, integrity, writing, and export-readiness checks remain authoritative.

The UI creates a fresh `ExportAuthorization` for each action. It is bound to:

- schema version
- canonical factual-content hash
- candidate-identity hash
- posting/readiness hash
- exact render-plan/manifest hash
- final/preliminary mode
- short expiration time

Download functions validate the context before generating a file. A stored readiness boolean, mutated posting state, mismatched document, expired context, or missing/placeholder identity fails closed. Template changes rebuild the render plan but retain the factual-content hash.

Preliminary files use the same package and template. They retain the existing visible warning and preliminary filename treatment and do not imply application readiness.

## Format parity

Semantic parity requires the same visible identity, values, selected item IDs, selected-template section order, bullet order, headings, and preliminary/final treatment. Line wrapping, document XML, and format-specific pagination may differ.

The browser preview and direct PDF share Letter geometry, margins, typography/spacing tokens, section order, and page-break intent. PDF uses selectable text, not a screenshot. DOCX uses simple paragraphs and real list numbering without layout tables. Plain text uses parser-safe headings and ASCII separators.

Exact DOCX pagination is not expected to match the PDF because Word-compatible layout engines use different font metrics. Content-manifest parity is mandatory in every format.

## Manual QA

1. Run the focused résumé/template/export tests documented in `docs/release-verification.md`.
2. Run `npm run verify:exports -- --keep`.
3. Render every direct PDF page to PNG and inspect it at full size.
4. Convert every DOCX fixture with LibreOffice when installed, render every converted PDF page, and inspect it.
5. Extract text independently from direct and converted PDFs and confirm identity, headings, section order, bullet order, labels, and artifact absence.
6. Run desktop and 390 × 844 browser checks. Change every template, verify immediate rerender, content-hash stability, keyboard focus, `aria-pressed` state, and mobile touch targets.
7. Test verified, partial, stale-readiness, and missing-identity cases.
8. Remove `tmp/export-verification` and all screenshots/renders before staging.

## Current limitations

- Microsoft Word and Google Docs compatibility must be reported as unverified when those applications are unavailable; LibreOffice is the automated local compatibility engine.
- Browser and direct PDF share layout tokens but unrelated browsers may produce small font-metric differences.
- Skilled-trades classification uses deterministic title, action, physical-context, and credential vocabularies. Jurisdiction-specific credential aliases may require future vocabulary additions, but unknown credentials always fail conservatively.
- Marketing/communications and creative/design remain later work.
