# Canonical résumé architecture

Updated: 2026-08-28

## Scope

P2.1 establishes one versioned résumé-content pipeline for browser preview, DOCX, direct PDF, and plain text. P3.4 separates its nine evidence-aware content strategies from seven independently selectable visual styles. P3.8 composes those styles with independent palette, density, header-alignment, and target-length controls. Every combination shares one factual content plan, semantic manifest, persistence boundary, and export-authorization path.

## Contract

`ResumePackage` is created by `src/resumeModel.js` and has four deliberately separate concerns:

- `document`: user-visible candidate facts and target context.
- `evidence`: private source references, relevance, verified metric references, normalization warnings, and posting-completeness evidence.
- `classification`: occupation family, immutable career strategy, fit level, verified family evidence, SAP functional/technical distinction, recommendation reason code/strength, and deterministic trace.
- `presentation`: recommended and selected `strategyId`/`designId`, `paletteId`, `densityId`, `headerAlignment`, and `lengthPreference`, plus legacy template aliases, human-readable reason, internal reason code/strength, page target, locale, and presentation version.

The package uses `schemaVersion: 2`. New code must not pass raw AI output to an exporter.

The visible document supports candidate identity/contact/links, target title/company, headline, summary, grouped verified skills, experience, projects, education, certifications, training, languages, safety content retained for compatibility, and strictly shaped additional sections. Export-visible nested values are never arbitrary objects.

## Pipeline

1. `createResumePackage` validates and adapts a legacy tailored result without mutating it.
2. `buildResumeContentPlan` determines the factual sections and stable item order once.
3. `buildResumeRenderPlan` applies content ordering/headings from the selected strategy and composed visual tokens from the independently selected style and presentation modifiers.
4. `createResumeContentManifest` records the exact visible values, stable IDs, headings, and order.
5. Browser preview, DOCX, PDF, and plain text consume the same frozen render plan.
6. Export verification compares each generated format to the manifest.

Strategy selection can change safe headings, section placement, and evidence emphasis. Style, palette, density, header-alignment, and target-length switching can change only presentation. Target length tightens or relaxes geometry; it never silently removes evidence. No presentation choice can change the factual content hash, selected item IDs, evidence classification, occupation family, immutable career path, requirement coverage, or export readiness. Switching never invokes AI or a network request.

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
2. A Marketing & Communications or Creative & Design target with neither direct nor adjacent candidate evidence recommends Career Transition conservatively.
3. A major transition recommends Career Transition.
4. A trade or field-service target with verified physical installation, repair, diagnostic, maintenance, construction, landscaping, service-call, or recognized-title evidence recommends Skilled Trades / Field Services. Missing required credentials cap the recommendation at moderate strength and remain outside the résumé.
5. A marketing/communications target with verified direct candidate evidence recommends Marketing & Communications strongly; verified adjacent communications evidence is capped at moderate. An explicitly incomplete posting caps even direct evidence at moderate.
6. A creative/design target with verified direct role, project, portfolio, production, or tool evidence recommends Creative & Design strongly; verified adjacent visual-production evidence is capped at moderate. An explicitly incomplete posting caps even direct evidence at moderate.
7. A leadership/delivery target with verified ownership evidence recommends Project Leadership.
8. A functional SAP target with verified SAP functional lifecycle evidence recommends SAP Functional.
9. A software, web/application, cloud, data, DevOps/SRE, security, infrastructure, or technical-QA target with direct or adjacent verified technical evidence recommends Technical / Software.
10. A non-leadership administration, customer-support/success, scheduling, dispatch, data-entry, or service-operations target with direct or adjacent verified service evidence recommends Admin / Customer Operations.
11. Ambiguous targets and evidence gaps use ATS Core.

Programming-heavy SAP targets are technical. Explicit ABAP development or implementation evidence can qualify for Technical / Software; merely collaborating with an ABAP team cannot. A functional SAP candidate targeting a developer role without coding evidence is treated as a material transition rather than upgraded into a technical profile. A generic SAP keyword never establishes functional consulting by itself.

Admin/customer-operations matching excludes sales, marketing/communications, finance/accounting, and director/executive targets. Coordination language remains coordination unless verified ownership evidence independently supports leadership.

Skilled-trades matching excludes SAP Plant Maintenance, software/application maintenance, IT/service-desk work, maintenance planning, asset-management systems, and management targets. Those signals may remain adjacent evidence, but they cannot prove physical field work. The classifier distinguishes regulated-trade professionals, experienced field-service professionals, apprentices/helpers, general maintenance profiles, adjacent pivots, and significant career changes. A posting's licence or safety requirement never counts as candidate evidence; only explicit candidate credentials or verified candidate-side evidence can satisfy it.

Marketing matching separates direct marketing/communications work from adjacent stakeholder communication, research, presentation, documentation, event, content-preparation, and coordination evidence. Posting metrics and platform requirements never enter candidate facts. Product management, generic business growth, telecommunications engineering, digital transformation, unrelated brand/team management, generic sales, and category-only signals cannot produce a strong Marketing & Communications recommendation.

Creative matching separates professional design, verified projects/tools, and explicitly labeled safe portfolio evidence from adjacent document, presentation, brand-support, layout, and visual-content production. A portfolio link must be candidate supplied, labeled as a portfolio, and use HTTP(S); a social profile is not promoted into a portfolio. Software, solution, systems, mechanical, architectural, database, SAP solution, design-engineering, process-design, posting-only tool, and category-only signals cannot produce a strong Creative & Design recommendation. Creative leadership is a separate candidate-side evidence gate.

An adjacent SAP module pivot may use SAP Functional when verified functional lifecycle evidence exists. Missing target modules remain missing and are never inserted into skills or history.

The product explains the deterministic recommended content strategy, while the user chooses a visual design. Safe section headings come from strategy plus verified classification; a design override cannot create an unsupported SAP, leadership, marketing, creative, trade, or transition claim.

## Strategy and presentation registries

The compatibility registry retains stable legacy IDs. `RESUME_STRATEGY_REGISTRY` owns evidence logic, safe headings, and section order. `RESUME_DESIGN_REGISTRY` owns ATS safety labels, preview metadata, base page geometry, typography, and rule treatment. Palette, density, header-alignment, and target-length registries compose controlled overrides onto that base style.

Content-strategy IDs:

- `ats-core-v1`
- `sap-functional-v1`
- `project-leadership-v1`
- `career-transition-v1`
- `technical-software-v1`
- `admin-customer-operations-v1`
- `skilled-trades-field-services-v1`
- `marketing-communications-v1`
- `creative-design-v1`

Visual-style IDs (stable IDs; current display names in parentheses):

- `essential-ats-v1` (Essential)
- `classic-ledger-v1` (Ledger)
- `modern-signal-v1` (Contour)
- `compact-focus-v1`
- `bold-impact-v1`
- `studio-editorial-v1`
- `field-ready-v1`

Palette IDs:

- `gigscapes-orange-v1`
- `forest-v1`
- `slate-blue-v1`
- `monochrome-v1`

Density IDs are `comfortable-v1` and `compact-v1`. Header alignment is `style-default`, `left`, or `center`. Target length is `auto`, `one-page`, or `two-pages`; it changes geometry and page target only.

Legacy `trades`, `skilled-trades`, and `trades-legacy-v1` stored values resolve to `skilled-trades-field-services-v1` on read. No second trades family or persisted-data backfill is created.

Unversioned `marketing-communications`/`marketing` and `creative-design`/`creative` aliases resolve to their versioned B3 IDs on read. Invalid IDs still fail deterministically to the current recommendation.

The B2 render plan is compact, single-column, and credential-aware. It deterministically moves verified licences, safety training, apprenticeship/training, capabilities, experience, and projects according to the classified trade profile. Short apprentice/helper evidence targets one page; experienced trade and field-service evidence may use two pages. Missing or unverified credentials are review-only gaps and never become résumé content.

The B3 Marketing plan uses a restrained editorial/business treatment and prioritizes verified capabilities, experience, and supported campaigns or communications projects. The Creative plan uses slightly more expressive but reproducible type/spacing tokens and prioritizes verified capabilities, experience, projects, tools, and visible safe professional links. Both remain single-column selectable text with no sidebars, text boxes, skill bars, charts, photos, canvas text, or essential header/footer-only facts.

The seven visual styles are presentation overlays, not evidence models. They inherit deterministic occupation-aware section order and headings from the selected strategy. Essential, Ledger, Contour, Compact Focus, and Field Ready are application-safe. Bold Impact and Studio Editorial are labeled networking-forward because their treatment is more expressive. All seven remain searchable, selectable, single-column, table-free, photo-free, and free of skill meters or essential header/footer-only content. All four palettes meet a 4.5:1 minimum for accent text on white and the corresponding soft surface.

To add a content strategy or visual design:

1. Add a versioned entry to exactly one registry: evidence/section logic belongs to strategy; visual tokens belong to design.
2. Keep all canonical sections supported through the generic renderer.
3. Add a deterministic recommendation predicate without changing higher-priority trust rules.
4. Add recommendation, override, manifest-parity, persistence, PDF extraction, DOCX, and visual fixtures.
5. Update the release checklist and product pipeline.

Do not put content generation, evidence interpretation, or exporter-specific section selection inside a design.

## Persistence

The complete presentation choice uses one version-3 account-and-target-scoped local-storage record. Raw target text is hashed for custom targets; public listing IDs are allowlisted. Version-1 role-template values migrate to that strategy plus its deterministic recommended style; version-1 visual-template values migrate to ATS Core plus the chosen style. Version-2 strategy/style pairs migrate with safe modifier defaults. Invalid/deleted IDs fail safely. A selection cannot cross accounts or target postings.

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

Download functions validate the context before generating a file. A stored readiness boolean, mutated posting state, mismatched document, expired context, or missing/placeholder identity fails closed. Strategy or presentation changes rebuild the render plan but retain the factual-content hash; authorization binds the strategy, style, palette, density, header alignment, and target-length choice independently.

Preliminary files use the same package, strategy, and presentation selection. They retain preliminary filename treatment and do not imply application readiness. The product displays the reason before the résumé preview and download actions; warning copy is UI-only and is never inserted into browser-preview, DOCX, PDF, or plain-text résumé content.

## Bring-your-own-posting session boundary

Each URL, screenshot set, or pasted posting starts an explicit source session with monotonically increasing source and request IDs. Beginning a new source, retrying, navigating away, or unmounting aborts the active request and invalidates any response that resolves later. This prevents a prior screenshot extraction or tailoring response from restoring stale job data or a screenshot-only confirmation gate.

Source reset clears only posting-specific state: source fields/files, extracted brief, conflicts and confirmation state, target-scoped evidence, tailored output, status, and errors. The account-scoped base résumé and eligible reusable candidate evidence remain intact. A completed output exposes **Tailor another posting** as the intentional new-session path.

## Format parity

Semantic parity requires the same visible identity, values, selected item IDs, selected-strategy section order, bullet order, headings, and preliminary/final treatment. Visual parity requires browser, DOCX, and PDF to consume the same composed style, palette, density, header-alignment, and length tokens. Line wrapping, document XML, and format-specific pagination may differ.

The browser preview and direct PDF share Letter geometry, margins, typography/spacing tokens, section order, and page-break intent. PDF uses selectable text, not a screenshot. DOCX uses simple paragraphs and real list numbering without layout tables. Plain text uses parser-safe headings and ASCII separators.

Exact DOCX pagination is not expected to match the PDF because Word-compatible layout engines use different font metrics. Content-manifest parity is mandatory in every format.

## Manual QA

1. Run the focused résumé/template/export tests documented in `docs/release-verification.md`.
2. Run `npm run verify:exports -- --keep`.
3. Render every direct PDF page to PNG and inspect it at full size.
4. Convert every DOCX fixture with LibreOffice when installed, render every converted PDF page, and inspect it.
5. Extract text independently from direct and converted PDFs and confirm identity, headings, section order, bullet order, labels, and artifact absence.
6. Run desktop and 390 × 844 browser checks. Change all seven visual styles and every modifier group, verify immediate rerender, strategy/content-hash stability, keyboard focus, `aria-pressed` state, mobile touch targets, and the application-safe/networking-forward labels.
7. Test verified, partial, stale-readiness, and missing-identity cases.
8. Remove `tmp/export-verification` and all screenshots/renders before staging.

## Current limitations

- Microsoft Word and Google Docs compatibility must be reported as unverified when those applications are unavailable; LibreOffice is the automated local compatibility engine.
- Browser and direct PDF share layout tokens but unrelated browsers may produce small font-metric differences.
- Skilled-trades classification uses deterministic title, action, physical-context, and credential vocabularies. Jurisdiction-specific credential aliases may require future vocabulary additions, but unknown credentials always fail conservatively.
- Marketing/communications and creative/design matching use deterministic vocabularies. Specialized role aliases may require later additions, but unknown or overlapping evidence always fails conservatively.
