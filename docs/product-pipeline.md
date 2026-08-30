# Gigscapes product pipeline

Updated: 2026-08-29

This roadmap orders work by the value of the product's core promise: produce a truthful, role-specific, ATS-readable resume from enough candidate and job-posting evidence. Search volume and presentation work follow that foundation.

## Priority 0 — Make every tailoring run evidence-complete

### P0.1 Enrich aggregator snippets from the original posting

**Status:** Implemented on 2026-08-23. Database deployment and production verification are tracked with the corresponding release commit.

**Problem:** Jooble exposes a `snippet` and a posting `link`, not a complete description. A 44-word snippet cannot support a reliable requirement analysis, fit rating, or application-ready resume.

**Approach:** Reuse the existing guarded URL importer in `api/job-intake.js` for a listing selected for tailoring. Do not crawl every listing in advance.

1. When the user selects **Tailor resume & apply**, assess the saved description before tailoring.
2. If it is `partial` or `insufficient`, resolve the listing URL and extract the employer/ATS page.
3. Extraction order:
   - `JobPosting` JSON-LD `description`, title, employer, location, qualifications, and responsibilities;
   - readable main job-description content;
   - current provider snippet only as the final fallback.
4. Confirm that the resolved title and employer are compatible with the selected listing before using the text.
5. Present the extracted brief for review when confidence is not high or the page appears expired, unrelated, or incomplete.
6. If the site blocks automated access, show **Paste full posting**, **Upload screenshots**, and **Continue with preliminary version**. Never bypass authentication, CAPTCHAs, robots restrictions, or publisher terms.

**Persistence and provenance:**

- Preserve the provider snippet separately from enriched content.
- Store `description_source` (`provider_snippet`, `employer_jsonld`, `employer_html`, `user_link`, `user_paste`, or `user_screenshot`).
- Store `description_status` (`insufficient`, `partial`, or `complete`), canonical/source URL, retrieval time, content hash, and last extraction error.
- Never overwrite a reviewed complete description with a shorter provider refresh.
- Keep user-provided posting content private and user-owned; expose only public listing data through anonymous reads and protect saved/tailored artifacts with RLS.

**Security and reliability:** Keep the current HTTPS-only, DNS/IP, redirect, response-size, content-type, and timeout protections. Add structured-data parsing tests, title/employer validation tests, expired-page handling, and a cache so repeated tailoring does not repeatedly fetch the publisher.

**Acceptance criteria:**

- A partial Jooble listing automatically attempts enrichment when tailoring starts.
- A successful employer-page import changes the posting status to `complete` and identifies its source in the UI.
- A blocked or unreadable page produces an actionable fallback, not a failed tailoring run.
- The original snippet and original resume remain unchanged.

### P0.2 Gate fit and resume claims on posting completeness

- Do not label a candidate `Strong match` or `Significant gap` from a short aggregator snippet.
- Use `Needs full posting` until responsibilities and qualifications are present.
- Separate **listing relevance** from **candidate fit**. Title/keyword relevance may rank search results, but candidate evidence must determine the fit label.
- Require a reviewed full posting before calling an export application-ready. A preliminary draft may still be generated and clearly labeled.
- Show which requirements are direct, adjacent, transferable, or missing, with evidence citations from the base resume.

### P0.3 Make tailoring resilient

- Cache posting analysis by posting hash and candidate-evidence hash.
- Split analysis and document generation into recoverable stages so a timeout can resume rather than restart.
- Keep the safe deterministic fallback, but label it clearly and retain the user's progress.
- Add production telemetry for URL-import status, analysis duration, generation duration, repair attempts, timeouts, and model/provider errors without logging resume text.
- Add regression fixtures for direct, adjacent, and career-change candidates, including SAP functional versus SAP development roles.

### P0.4 Make multi-page intake and exported files trustworthy

**Status:** Implemented and locally regression-tested on 2026-08-23; production deployment and production verification remain release steps.

- Accept up to eight posting screenshots in one intake flow, show page count and filenames, and let the user remove or replace individual pages.
- Compress images in the browser and extract them in bounded batches of four so a long posting does not exceed one serverless request's image or execution budget.
- Merge repeated OCR content deterministically, preserve the page-set provenance, and surface conflicting title or company values instead of silently letting a later page overwrite an earlier page.
- Require the user to confirm that the final responsibilities and qualifications page was included. Unconfirmed page sets and unresolved source conflicts remain preliminary and cannot produce a fit label or application-ready export.
- Preserve later screenshot batches that legitimately omit the repeated title so they can be merged with the first page.
- Normalize only approved résumé fields before DOCX/PDF rendering. Structured values and cycles are handled without JavaScript object coercion, and unrelated metadata is never exposed as visible document text. Regression tests inspect the generated DOCX XML for `[object Object]`, placeholder, and metadata artifacts.
- Generate the primary ATS-safe PDF directly as a Letter-sized, single-column text document whose content and section order match the selected browser template. Text stays selectable/searchable; browser printing of the preview remains the fallback if direct generation fails.
- Carry the canonical posting-readiness decision into both formats. A missing identity blocks export, while an incomplete/unverified posting permits only a visibly labeled preliminary DOCX/PDF; stale ready flags cannot override the canonical gate.
- Run `npm run verify:exports` before release and follow `docs/release-verification.md` for LibreOffice, visual, extraction, build, Git, origin, and production checks.

## Priority 1 — Let the user supply missing evidence precisely

### P1.1 Evidence follow-up and comments

**Status:** Implemented on 2026-08-23; production deployment and hands-on UX verification remain in the release checklist.

Turn the existing “Questions that could strengthen this version” into an evidence form:

- Each question supports **Yes**, **No**, and **Not sure**.
- A Yes answer asks for context: skill or action, project/employer, approximate date, and result. Numbers remain optional and must be user supplied.
- The user chooses whether confirmed evidence applies only to this application or may update the master resume/profile.
- Reusable evidence stays in this browser/device, is not synced, and is eligible for later requests only when it is an explicit, non-declined, candidate-confirmed Yes answer with non-empty evidence. Legacy local records are filtered by the same rule when loaded.
- Show a preview before saving; rerun truth, history, number, and tense validation after every change.
- Never convert a vague user statement into a credential, employer, title, project, technology, or metric the user did not confirm.
- Place a comments/answers panel beside the tailored draft so the user can respond to the exact missing-evidence questions, preview the resulting bullet, and decide whether the evidence is application-only or reusable.
- Recalculate direct, adjacent, transferable, and missing coverage after every confirmed answer; do not upgrade a fit label merely because the user opened or skipped a question.

### P1.2 Improve ATS writing and editing feedback

**Status: implemented.** The API now returns occupation-aware, bullet-level writing reviews with evidence-linked suggestions and contribution-level safety checks.

- Replace the small generic verb whitelist with occupation-aware action-verb groups.
- Validate tense by employment status: present tense for current duties, past tense for completed work and previous roles.
- Prefer precise verbs such as `configured`, `implemented`, `facilitated`, `analyzed`, `tested`, `documented`, `coordinated`, and `supported` when the evidence supports them.
- Flag weak constructions such as “worked on,” “helped with,” and “responsible for,” but do not reject accurate domain verbs such as `served`, `participated`, or `acted` automatically.
- Show the exact bullet, reason, and suggested revision for every writing issue instead of only an issue count.
- Keep keyword matching literal and truthful; ATS readability is not a promise of ranking or an interview.

### P1.3 Focus the resume before styling it

**Status: implemented.** Tailored drafts now deterministically prioritize relevant recent evidence, remove near-duplicates, and report all condensation decisions while leaving the canonical résumé untouched.

- Prioritize the most relevant recent experience and reduce repetitive legacy bullets.
- Target roughly two pages for experienced candidates unless the user explicitly chooses an extended CV.
- Preserve exact employers, titles, dates, credentials, and user-supplied metrics.
- Add a final review step for identity/contact details, target positioning, evidence gaps, and export readiness.
- Do not describe a long established career as a generic "full career" or present an unverified target module as an accomplished specialization. For a new SAP module, state the verified source modules and the transferable delivery lifecycle explicitly, while leaving MM/SD configuration as a gap until the candidate confirms it.
- Prefer a role-specific headline over a vague one such as `Solution Architect | Career Transition`; for this fixture, honest positioning is closer to `Senior SAP Functional Consultant | S/4HANA Integration & Delivery` with a separate, plain-language transition note.
- Separate verified domain expertise, delivery methods, tools, and target-role keywords. Do not mix unsupported MM/SD terms into the skills section merely to improve keyword density.
- Keep recent, high-signal roles detailed and compress older experience. Preserve relevant leadership, requirements, functional specifications, configuration, integration, UAT, cutover, go-live, and support evidence; remove repetitive lifecycle bullets.
- Require candidate review of contact details, education/certifications, current-role status, and any metrics before final export. Never infer missing education or an end date.

### P1.4 Guest-first browsing with account-required workspaces

**Status:** Released and production-verified on 2026-08-24. The checked-in Supabase migration was applied, anonymous `public_listings` returned valid rows, all four privilege checks passed, and the guest/authenticated smoke gate was reported complete.

- `/app` now renders the same discovery shell for guests and signed-in users without waiting for session initialization. Search, country/province/city filters, workplace filters, pagination, summaries, attribution, and original provider links remain public.
- Anonymous preferences use a versioned, allowlisted `localStorage` record. Résumé text, posting content, evidence, email, tokens, and account records are excluded.
- One centralized account-action gate covers saved jobs, résumé editing, posting URL/paste/screenshots, tailoring/evidence, saved workspace access, DOCX/PDF downloads, and copied tailored text. Its dialog explains the attempted action and is keyboard/escape accessible on mobile and desktop.
- Pending actions use a versioned 15-minute `sessionStorage` record, strict action/path/listing validation, and consume-once behavior. A magic-link callback may also carry only the allowlisted action, timestamp, safe internal path, and public listing ID so email clients opening a new tab can restore it. Sensitive content is never placed in the URL.
- Magic link remains the only production-default sign-in method. UI requests have a local cooldown, generic account-neutral success copy, sanitized errors, and safe invalid/expired-link recovery. Email OTP/code entry was not added or enabled.
- Public discovery requests only an explicit listing projection. `20260824015935_expose_public_listing_discovery.sql` creates a `security_invoker` view, explicit grants, public-listing RLS, and same-user profile SELECT/UPDATE policies. Until that migration is applied, code falls back to the same explicit fields on the existing anonymous-readable table—never `select("*")`.
- Protected server endpoints still validate the caller JWT before reading private input or creating a privileged server-only database client. Browser code has no service-role/secret-key path.
- Trusted DOCX/PDF readiness, identity, deterministic serialization, evidence scoping, direct selectable Letter PDF, and lazy export chunks remain mandatory regressions.

**Release record:** The migration and production smoke conditions are complete. Preserve the P1.4 production configuration while implementing P2.1; do not reapply the migration or mix unrelated Auth/database changes into résumé-template work.

## Priority 2 — Resume families and product presentation

### P2.1 Canonical resume model plus job-family renderers

**Phase A status:** Released to production on 2026-08-24. Feature SHA `6ccaaf27ea0a12a16f5e9fbe23892b6840ed9c13` is on `origin/main` and is `READY`/`PROMOTED` at <https://gigscapes.com>. Automated, export-parity, LibreOffice, direct-PDF, signed-out desktop/mobile, and production-log gates passed. A fresh authenticated production template-switch/export run remains explicitly pending action-time approval; see `docs/release-checklist.md` for the complete evidence record.

Phase A now uses a versioned `ResumePackage` that separates visible facts, private evidence, derived occupation/career strategy, presentation choice, and fresh export authorization. A deterministic `ResumeContentPlan` selects factual items once; browser, DOCX, direct PDF, plain text, and export verification consume one frozen `ResumeRenderPlan` and compare against a normalized content manifest.

The initial registry provides:

1. ATS Core (`ats-core-v1`)
2. SAP Functional (`sap-functional-v1`)
3. Project Leadership (`project-leadership-v1`)
4. Career Transition (`career-transition-v1`)
5. Technical / Software (`technical-software-v1`)
6. Admin / Customer Operations (`admin-customer-operations-v1`)
7. Skilled Trades / Field Services (`skilled-trades-field-services-v1`)
8. Marketing & Communications (`marketing-communications-v1`)
9. Creative & Design (`creative-design-v1`)

The universal design expansion adds five selectable visual styles that inherit the correct occupation-aware content structure without changing facts:

1. Classic Ledger (`classic-ledger-v1`) — application-safe, serif-led, traditional.
2. Modern Signal (`modern-signal-v1`) — application-safe, crisp accent hierarchy.
3. Compact Focus (`compact-focus-v1`) — application-safe, higher evidence density.
4. Bold Impact (`bold-impact-v1`) — networking-forward, confident accent band.
5. Studio Editorial (`studio-editorial-v1`) — networking-forward, expressive editorial typography.

All five remain single-column and searchable with no photos, skill ratings, sidebars, layout tables, or essential header/footer-only content. Cross-career fixtures cover healthcare, education, finance, logistics, hospitality, community services, engineering, and skilled trades so this layer is not tuned only to the SAP reference résumé.

**Phase B1 status:** Implemented and verified on 2026-08-24. Commit `4e278ff1ebd2cb42561c8eb4b7ad74ba9aa47ac2` is present on `origin/main`. The two families use the same selector in feed and bring-your-own-job flows, preserve account/target-scoped overrides, and rerender without AI or a network request. Technical and admin recommendations require a matching target plus verified direct/adjacent family evidence. Programming-heavy SAP roles require real development evidence, and service coordination is never promoted into management ownership.

**Phase B2 status:** Implemented and committed as `4431e27e3803a908da912d6f6fa51af39f9d2fc5`, which is present on `origin/main`. Skilled Trades / Field Services replaces the hidden legacy trades registry entry through an on-read alias. Recommendation requires a matching target and verified physical hands-on evidence. Regulated credentials must be explicit candidate evidence; a posting requirement cannot satisfy itself, and a required credential gap blocks strong positioning. SAP Plant Maintenance, software maintenance, IT support, and maintenance-planning language are excluded from direct trade matching. Production deployment was not re-verified during the local B3 pass.

**Phase B3 status:** Released and production-verified on 2026-08-24. Feature SHA `63f1ea7b4d467394e2378cad1031d9cb7e2bac8d` is on `origin/main` and is `READY` at <https://gigscapes.com> through the Git-triggered Vercel deployment recorded in `docs/release-checklist.md`. Marketing & Communications and Creative & Design are canonical families with direct, adjacent, transition, evidence-gap, and explicit incomplete-posting outcomes. Job-posting metrics, platforms, tools, portfolio claims, and leadership language cannot satisfy candidate evidence. False-positive precedence protects product management, business growth, telecommunications, digital transformation, technical-design occupations, process design, and category-only matches.

Template selection cannot alter factual item IDs, evidence classification, immutable career strategy, readiness, or the canonical content hash. Recommendation precedence protects trade/B3 evidence gaps and major transitions before verified skilled-trades, marketing, creative, project-leadership, SAP-functional, technical, and admin/customer-operations matches, then ATS Core.

Final/preliminary exporters validate a short-lived authorization bound to the document, identity, posting state, schema, and mode. Stored readiness booleans cannot authorize a mismatched export. See `docs/resume-architecture.md` for the contract and extension procedure.

Keep one canonical evidence model and vary section order, density, language emphasis, and visual treatment. Start with:

1. ATS Core / general professional
2. SAP functional and enterprise consulting lead
3. Project, operations, and transformation leadership
4. Career transition / adjacent pivot
5. Skilled trades and field services
6. Administration and customer operations
7. Marketing and communications
8. Creative and design portfolio

Technical / Software and Administration / Customer Operations are complete in Phase B1. Skilled Trades / Field Services is complete in Phase B2. Marketing & Communications and Creative & Design are released in Phase B3. The next pipeline step is P2.2 landing-page work unless product priorities change.

Every family needs a screen renderer, DOCX renderer, plain-text export, and automated parseability check. The user may override the recommendation. Creative styling must never be the only export; retain a conservative ATS-safe version.

For the SAP functional family, use a restrained two-page ATS-safe layout: identity and role-specific headline, concise summary, grouped functional/delivery skills, then selected experience. Avoid visual skill bars, icons inside document text, sidebars, or decorative tables. Provide a compact one-page networking version separately rather than deleting material from the application version.

### P2.2 Landing page

**Status:** Released and production-verified on 2026-08-25. Feature SHA `5ba2a10d30ec203209c2c31df29281d01468a49f` is on `origin/main` and `READY` at <https://gigscapes.com> through Vercel deployment `dpl_9fBCYHFm8u32WRXNjuJYvaXrEVz3`.

- `/` is the public marketing surface and `/app` remains the anonymously browseable workspace. Existing sign-in, callback, deep-link fallback, and account-gate behavior is preserved.
- The two primary paths are **Browse jobs & gigs** and **Tailor a posting I found**. URL, screenshot, and pasted-text intake reuse the existing allowlisted account actions through React Router history state; no sensitive posting or résumé content is placed in a URL.
- The page explains evidence-first tailoring, verified/missing evidence boundaries, preliminary versus application-ready output, selectable DOCX/PDF exports, Canada-first discovery, source variability, and private-work controls without fabricated outcomes or counts.
- The landing gallery exposes the seven canonical visual designs with realistic generic document thumbnails. Switching the sample preview is local, immediate, and network-free; content strategy is explained separately and remains evidence-driven.
- Landing and workspace UI are separate lazy route chunks. DOCX, PDF, `docx`, and `jspdf` remain reachable only from the workspace/export path.
- SEO includes truthful title/description, canonical URL, robots metadata, Open Graph/Twitter metadata, a lightweight 1200×630 brand asset, favicon, and basic `WebSite` JSON-LD.
- Accessibility includes semantic landmarks and headings, one H1, visible focus, approximately 44-pixel primary touch targets, reduced-motion CSS, modal mobile navigation with a focus loop/Escape/restoration, descriptive controls, and AA key-color contrast.
- Local browser QA covers the complete page at 390×844, 360×800, 768×1024, and 1440×900 with no horizontal overflow. Signed-out production verification covered `/`, `/app`, all four CTA paths, metadata, the social asset, public listings, mobile navigation, console diagnostics, runtime errors, and 5xx responses. A fresh authenticated export request remains intentionally deferred rather than sending private production data solely for release verification.

### P2.3 Search and feed quality

**Phase A status:** Implemented and locally verified on 2026-08-25. The feature SHA is the commit containing this status; production release evidence is recorded separately after the Git-triggered deployment.

- Recognized searches collect a bounded initial candidate window before rendering and rank eligible results by relevance, valid freshness, and stable database identity. Stronger title matches outrank public-description-snippet-only matches.
- Public description snippets are discovery signals only. They may make a listing searchable but never become a verified complete posting, candidate evidence, or final-export authorization.
- Conservative client-side clustering deduplicates stable row IDs and canonically equivalent public URLs while preserving original outbound links, source attribution, and existing card state during later-page merges. Similar jobs with distinct URLs remain distinct.
- Search copy distinguishes relevant matches, deduplicated candidates, rendered cards, and source rows returned by the database query. Zero-result diagnostics remain grounded in observed inventory, work-type, and location stages.
- Scheduled import summaries now whitelist operational metrics, categorize failures without raw upstream text, report success/partial/failure/skipped states, and keep credentials and ingestion internals server-only. Existing empty-batch, safe-upsert, freshness, pruning, attribution, and complete-description safeguards remain intact.
- Phase A requires no Supabase schema, RLS, grant, credential, dependency, or additional Vercel cron change. `public_listings` remains the explicit security-invoker discovery surface.
- Expand Canadian feeds only where API/feed terms permit redistribution and direct linking.
- Treat a Job Bank feed as an external dependency until business and access requirements are met.
- Make **Paste job link**, **Paste text**, and **Screenshots** permanent first-class alternatives to thin feeds.

**Phase B status:** Implemented and release-verified on 2026-08-25. The feature SHA is the commit containing this status; the normal GitHub-to-Vercel production record is reported with that SHA.

- Bring-your-own-posting state is scoped to an explicit source session. Switching between screenshots, URL, and pasted text aborts and invalidates the previous request so a late response cannot restore an earlier posting or screenshot-only review gate.
- **Change source** and **Tailor another posting** start a clean job-specific session while preserving the account-scoped base résumé and reusable candidate evidence.
- Export status is explicit before the résumé preview: application-ready, preliminary because the posting is incomplete, preliminary because evidence review is incomplete, or blocked because candidate identity is missing. Guidance stays outside browser, DOCX, and PDF résumé content.
- DOCX failures use actionable, content-safe categories for stale exporter chunks, authorization/content mismatches, browser-download failures, serialization failures, and unknown failures. The draft remains available after an error.
- The public mobile drawer is a viewport-level opaque, scrollable layer rather than a descendant of the filtered sticky header. The `/app` wordmark is a flat 44-pixel home link instead of an oversized glass pill.
- The release gate covers 130 focused tests, the full 340-test suite, all 26 persistent DOCX/PDF fixtures, visual inspection of 18 LibreOffice-converted pages and 18 direct-PDF pages, selectable text/artifact checks, desktop/mobile browser checks, and the production sourcemapped build.
- Microsoft Word, Google Docs, a fresh authenticated production two-posting run, and live production downloads remain explicitly unclaimed when no approved authenticated test session or local application is available.

**Phase C status:** Implemented locally on 2026-08-25; release evidence belongs to the commit containing this record.

- Active and configurable importers now share a reviewed, allowlisted source-policy boundary. A server-only `JOB_SOURCE_DISABLED` control can stop a known importer without requesting it or disrupting successful companion sources; arbitrary source IDs fail configuration generically.
- Scheduled responses reduce policy/configuration skips to bounded categories and continue to exclude upstream bodies, raw exception messages, credentials, board configuration, and posting content.
- `npm run audit:sources` queries only `public.public_listings` with the publishable client and emits a redacted aggregate report covering provider counts, HTTPS validity, canonical duplicates, freshness, and snippet presence. It emits no listing title, employer, raw URL, description, résumé, user, or Auth value.
- Discovery copy now refers to available sources and possible providers instead of claiming an unconfigured feed is actively being scanned.
- The dated first-party eligibility matrix and operator obligations live in `docs/job-source-expansion.md`. No new provider, employer board, Supabase object, cron schedule, dependency, client tracker, or secret is introduced.
- The anonymous production audit covered 3,270 rows: all 3,270 had valid HTTPS URLs, no canonical duplicates or materially future dates were found, 24 WWR rows were older than 60 days, and 1,038 rows lacked a public snippet. Stale dated rows are excluded from discovery without destructive deletion; active-source snippets are populated by normal scheduled refreshes.
- Phase C passed 159 focused tests and the full 351-test suite, produced 26 verified export files with 18 native-PDF pages, matched all 18 LibreOffice-rendered DOCX pages, passed the production build, and passed signed-out desktop/mobile browser checks with no application warning/error or horizontal overflow.

## Priority 3 — Native mobile and growth work

### P3.1 Cross-device private document foundation, then iOS and Android

**Phase A status:** Released to Production on 2026-08-29. The production migration, aggregate metadata verifier, synthetic two-account/anonymous isolation soak, new-device restore, explicit conflict choices, stop-on-device behavior, offline pending/retry, remote deletion, desktop/mobile Preview checks, and post-deploy production smoke all passed.

- The release is fail-closed behind `VITE_RESUME_SYNC_ENABLED`; an unset or non-`true` value preserves the current browser-only UI and makes no vault request.
- Browser-only résumé storage remains the default. A signed-in person must explicitly enable one account-synced base-résumé document; no existing local résumé is uploaded automatically.
- The private vault uses an indexed ownership key, authenticated-only grants, separate own-user RLS policies for SELECT/INSERT/UPDATE/DELETE, bounded versioned JSON, content hashes, and monotonic revisions.
- Phase A2 rejects over-limit content without slicing or sending it, maps thrown transport failures into recoverable states, and verifies insert/update/delete ownership plus compare-and-swap behavior with deterministic client doubles. A checked-in read-only SQL verifier reports only RLS/grant/policy/index/trigger/function metadata.
- New-device restore occurs only after the device has opted in before or the person chooses the available synced copy. Divergent browser and account copies require an explicit keep-local/use-synced decision; no last-write-wins overwrite is permitted.
- Offline edits remain safe locally and are marked pending. Stopping sync on one browser preserves the account copy. Local cleanup and remote deletion remain separate two-step boundaries.
- Phase A syncs only the canonical base résumé. Cover letters, evidence, presentation choices, tailored outputs, and export history remain browser-local until their own schemas, retention, and conflict policies are approved.
- Phase B can reuse this contract for iOS and Android, storing device drafts with platform-secure storage and requiring authentication only for cloud save, tailoring, export history, and multi-device sync.
- Phase A3 release evidence: the aggregate SQL verifier returned the expected RLS, grants, policies, indexes, trigger, and security-invoker function; 18 focused checks and the full 510-test suite passed; export/privacy gates and the zero-vulnerability audit passed; and the build transformed 2,447 modules.
- Two disposable accounts and synthetic text proved anonymous and cross-account denial, own-account CRUD, monotonic revisions, stale-write/delete conflicts, both visible conflict choices, explicit new-device restore, stop-on-device, offline pending/retry, and remote deletion. Preview and production smokes passed without browser or Vercel errors. Production deployment `dpl_8DX6GX6TrfiTV7pnq4WyHx91o5HW` released commit `92348241cba81b94ba33ae4337bfc62d47a66c9f` with the fail-closed flag enabled.

### P3.2 Evaluation and analytics

- **Phase A implemented and locally verified on 2026-08-25:** a deterministic, synthetic, redacted regression corpus now covers five job families, direct/adjacent/transferable/career-transition/apprentice/credential-gap paths, complete and incomplete postings, and unsupported-number rejection.
- The evaluator reuses the production tailoring, readiness, integrity, and template contracts. It fails closed unless every expected contract, export-readiness result, evidence-integrity result, template selection, and privacy gate passes.
- Reports contain only safe case IDs, enums, booleans, counts, durations, token totals, and cost estimates. Candidate text, contact details, résumé content, posting content, prompts, model responses, evidence excerpts, and export bytes are prohibited.
- Posting completeness, requirement coverage, correction rate, user edits, export completion, retry rate, latency, token use, and estimated cost are aggregated from synthetic fixture inputs only. These values are evaluation signals, not production-user telemetry.
- Provider/model comparisons must use this same versioned corpus and thresholds before any provider change. Phase A intentionally deferred production analytics, persisted event schemas, consent/retention policy, and user feedback until the Phase B1 privacy contract below defined them.
- **Phase B1 implemented and locally verified on 2026-08-25; production migration applied, release gates remain:** quality sharing is explicitly opt-in and off by default; the browser and server share one exact enum-only contract; the API omits credentials and validates origin, type, marker, shape, values, and size; and Supabase stores only service-role daily aggregates in `gigscapes_private` with 180-day retention. The publishable production client was denied access to the private schema and the RPC with PostgreSQL `42501`, without writing a synthetic row.
- No raw production-event store, identifiers, free text, résumé/posting content, client database privilege, or third-party analytics SDK was added. Optional fit/export feedback is structured and stays outside résumé previews and exports. Local reports suppress cohorts below 10.

### P3.3 Trust, explainability, and application-risk calibration

**Phase A status:** Implemented, locally verified, and release-authorized on 2026-08-26. The feature SHA is the commit containing this record; GitHub/Vercel binding and production smoke belong to the release handoff.

- One canonical readiness state now controls the review UI, DOCX/PDF labels, and fresh export authorization. A reviewed posting with zero or inconsistent atomic requirements can no longer become application-ready, and the authorization hash is bound to the complete assessment snapshot.
- Missing requirements are classified as verified blockers, material gaps, development gaps, or preferences. Regulated credentials, work authorization, security clearance, and other explicit mandatory conditions cannot be softened into a generic percentage.
- The résumé review includes an evidence-linked change ledger. Users can compare verified original and tailored wording, see why the wording changed, keep the tailored version, or restore the verified original without mutating the saved base résumé. A wording veto makes the current export preliminary until the tailored wording is restored or the document is rechecked.
- URL-import failures reduce low-level DNS/IP, redirect, publisher-block, timeout, and unsafe-URL failures to calm actionable categories. Both custom-posting and public-listing flows expose explicit cancellation, abort the active request, preserve the current input or earlier completed result, and discard late responses.
- SAP discovery expands common ECC, FICO, FI-CA/FICA, IS-U/ISU, S/4HANA Utilities, and FSCM aliases. Conservative content-level clustering may merge an identical same-day employer/title posting across location URLs while retaining every location and source; materially different descriptions remain separate.
- Landing copy now states the current pricing fact, local-only browser/device résumé storage boundary, lack of multi-device sync, and no automatic application, employer contact, or job submission.
- The narrow-phone landing hierarchy now caps the hero title at 40 px (34 px on very narrow screens), balances its wrap, restores the high-contrast orange brand phrase and primary action, and keeps the product preview in the first scroll without horizontal overflow.
- The release contract covers SAP, software, administration, marketing, creative work, electricians, plumbers, and other regulated/skilled work rather than tuning readiness rules to one reference résumé.
- Local release evidence: 409/409 tests passed. Export verification passed for 36 files, 14 templates, 23 direct-PDF pages, 667 selectable PDF text items, manifest parity, final gating, and stale-ready rejection. The sourcemapped build transformed 1,987 modules and kept DOCX/PDF/jsPDF in lazy chunks. Signed-out browser smoke returned 57 SAP matches, showed a useful zero-result recovery, enforced the private tailoring gate, and passed 390×844 and 320×700 mobile layout checks with no horizontal overflow; the 390 px hero measured 145 px high and the automated WCAG A/AA scan reported no violation.
- Dependency baseline: 0 critical, 1 high Vite, and 1 moderate esbuild advisory. Both affect the existing development toolchain; npm's offered remediation is a Vite 8 major upgrade and is intentionally separated from this trust release.

### P3.4 Visual résumé gallery and strategy/design separation

**Status:** Implemented, locally verified, and release-authorized on 2026-08-26. The feature SHA is the commit containing this record; GitHub/Vercel binding and production smoke belong to the release handoff.

- Nine evidence-aware content strategies and seven independently selectable visual designs now have separate canonical IDs. Strategy controls evidence emphasis, headings, section order, and content focus; design controls typography, spacing, rules, accents, and header treatment.
- Legacy version-1 template selections migrate deterministically into a strategy/design pair without crossing the existing account-and-target storage boundary. Old role-template values retain their strategy; old visual-template values retain their design.
- The private selector recommends and explains the content strategy, then lets the user choose among seven real document-style previews. The public gallery presents those seven designs as visual choices instead of implying that occupation strategies are decorative skins.
- Browser preview, DOCX, direct PDF, export authorization, persistence, and render hashes all consume the same strategy/design pair. Design-only switching preserves canonical facts, evidence IDs, content manifests, requirement coverage, and readiness authorization.
- Local release evidence: 415/415 tests passed. Export verification produced 40 files for 16 strategy/design combinations, reported 25 native-PDF verification pages and 715 selectable PDF text items, and passed manifest/final/stale-readiness gates. The 19 persistent native exports and 19 DOCX exports each rasterized to 24 pages; all 48 pages passed visual inspection. Structural extraction found exact per-file pagination parity and no object, undefined/null, or résumé-embedded warning artifacts. The sourcemapped production build transformed 1,987 modules and preserved lazy DOCX/PDF/jsPDF chunks.
- Signed-out browser QA passed the complete landing gallery on desktop and at 390×844 with no horizontal overflow, selectable design previews, Escape/focus restoration in mobile navigation, no page errors, and 57 relevant SAP matches from 63 deduplicated candidates in `/app`.
- Production dependencies have zero known vulnerabilities. The existing Vite/esbuild development-only advisories require a Vite 8 major upgrade and remain a separately scoped maintenance item.

### P3.5 Evidence Map, application outlook, and decision clarity

**Status:** Implemented, locally verified, and release-authorized on 2026-08-26. The feature SHA is the commit containing this record; GitHub/Vercel binding and production smoke belong to the release handoff.

- The tailoring review now opens with a deterministic application outlook instead of a generic match score. It distinguishes strong verified alignment, viable applications with manageable gaps, viable transitions with material gaps, high-risk applications, likely screening blockers, and incomplete assessments.
- Document truth/readiness and employer-facing application risk are separate axes. A résumé can pass evidence, identity, structure, and writing checks while remaining a preliminary export because an explicit candidate-fit blocker or material gap still exists.
- The Evidence Map preserves every atomic requirement and classifies its posting origin, importance, assessment confidence, evidence class, gap severity, explanation, exact candidate citation, unproven boundary, application impact, evidence-safe language, and next action.
- Mandatory credentials, eligibility, schedule/location constraints, and language requirements retain explicit labels. Missing posting requirements never become candidate evidence, and incomplete posting data remains unknown instead of being counted as a candidate gap.
- Progressive disclosure and filters make blockers and material gaps visible first while retaining direct, adjacent, transferable, preference, and needs-review views. Labels and counts carry meaning independently of colour; no opaque match percentage is introduced.
- The presentation model accepts legacy requirement payloads conservatively, so older saved results receive safe fallback explanations without changing their evidence classification or export authority.
- Cross-career regression coverage includes technical, administration, marketing, creative, skilled trades, regulated credentials, incomplete postings, direct/adjacent/transferable evidence, and truthful weak-fit preliminary exports. The implementation is not tuned to the SAP reference résumé.
- No Supabase schema, RLS/grant, Auth, analytics, payment, model-provider, cron, feed, dependency, résumé renderer, or export-file content change is included.
- Local release evidence: 422/422 tests passed. The privacy-safe quality evaluator passed 11/11 cases at 100% contract/readiness/export/integrity/template accuracy with zero privacy violations. Export verification passed for 40 files, 16 strategy/design combinations, 25 PDF pages, 715 selectable text items, canonical manifest parity, final gating, and stale-ready rejection. Vite transformed 1,989 modules while retaining lazy DOCX/PDF/jsPDF chunks.
- Real-browser component QA used a regulated-electrician fixture at desktop and 390×844. Filtering, progressive disclosure, exact citation/boundary text, mobile wrapping, zero horizontal overflow, and absence of `[object Object]` passed. The scoped automated WCAG A/AA audit reported 16 passes, zero violations, and zero incomplete checks after a contrast correction.

### P3.6 Privacy and data-transparency foundation

**Status:** Released and production-verified on 2026-08-27. Production and Preview use the verified operator facts: Voynich Tech, `hello@voynichtech.com`, Canada, and minimum age 16. Runtime SHA `132f8d0cbecb0e188ff902e8e637a9a2968a7fa6` is on `origin/main` and `READY` at <https://gigscapes.com> through Git-triggered Vercel deployment `dpl_2f23ACnmAaJqCXhY7s4sNLyUCE4D`.

- A public `/privacy` notice documents browser-local résumé storage, Supabase account-workspace data, Anthropic job-intake and tailoring processing, Vercel hosting/analytics, retention, deletion boundaries, user choices, and the absence of automatic employer submission.
- Separate, versioned just-in-time acknowledgements precede posting extraction and résumé tailoring. Each notice names the data being sent, purpose, processor, cancellation behavior, and privacy notice; cancellation preserves the person's current input.
- The current account can clear its résumé, confirmed evidence, presentation choices, and processing acknowledgement from the current browser through a two-step control. The deletion allowlist cannot clear another account, the authentication session, saved jobs, search preferences, Supabase records, or the entire storage origin.
- Vercel Web Analytics is configured through the official React package with a `beforeSend` boundary that strips query strings and fragments and suppresses the authentication callback. The only market-search event dimensions are selected country and results/empty/failed outcome; no search term, city, résumé, posting, candidate, email, employer, or free-form field is added.
- Private API responses use `no-store`/`no-cache`, no-referrer, and MIME-sniffing protections. Application logs contain coarse stage, outcome, and count metadata instead of résumé text, posting text, credentials, AI response bodies, or upstream error bodies.
- Internal artifacts cover the data map, privacy impact assessment, retention register, subprocessors, and incident response. Checked-in Supabase migrations retain RLS, own-user policies, security-invoker access, service-role-only quality aggregation, and 180-day aggregate cleanup; live advisors require a connector authorized for the Gigscapes production project.
- Local release evidence: 447/447 tests passed; the focused privacy/intake/tailoring/API suite passed 60/60; export verification passed 40 files, 16 templates, 25 direct-PDF pages, 715 selectable text items, manifest parity, final gating, and stale-ready rejection; the production build passed with export libraries lazy. Desktop and 390×844 privacy/app/sign-in browser checks reported zero automated accessibility violations and no application page errors.
- Production release evidence: the first Git-triggered deployment exposed a direct-navigation 404 at `/privacy`; release smoke caught it before closure. An explicit SPA route and regression test were added in `132f8d0`, then the corrected deployment reached `READY` with the `gigscapes.com`, `www.gigscapes.com`, and `main` aliases. Direct privacy navigation rendered the verified operator facts on desktop and mobile without overflow or placeholder copy. Landing, signed-out app, sign-in, and result-to-tailoring dialog checks passed with empty browser error/console output. Private API probes returned the expected 401 while preserving `no-store`, `no-cache`, `no-referrer`, and `nosniff` headers; deployment error and 5xx log queries returned no entries.
- The production dependency tree has zero known vulnerabilities. One high and one moderate advisory remain confined to the Vite/esbuild development server and require a separately scoped Vite 8 major upgrade.

### P3.7 Evidence-first cover letters and application packages

**Status:** Released and production-verified on 2026-08-27. Feature SHA `e674700f47be12d332fc89194774bbb188e846c0` is on `origin/main` and reached `READY` at <https://gigscapes.com> through Git-triggered Vercel deployment `dpl_HrAU1ptbDkp1VQqFXM1hAvkMV5ZC`; exact binding and smoke evidence are recorded in the release checklist.

**Product goal:** Extend the verified tailoring workflow into a natural, specific cover letter without turning Gigscapes into a generic AI-writing tool. “Humanized” means candidate-controlled, voice-aware, and grounded in real evidence—not written to evade AI-detection systems.

- Generate a cover letter only from the reviewed posting, canonical résumé facts, confirmed candidate evidence, and the same application-risk assessment used by the tailored résumé. A missing requirement remains missing and cannot become motivation, experience, or a claimed strength.
- Reuse the posting-readiness and identity gates. Incomplete postings may produce only a clearly labeled preliminary letter; missing identity, unresolved evidence-integrity failures, or invalid source data block export.
- Offer a deliberately small voice system—Direct, Warm, and Confident—and short or standard length. Tone may change phrasing, but never facts, contribution level, employment history, metrics, credentials, availability, relationships, or enthusiasm the candidate did not confirm.
- Structure the letter around the real opportunity: a posting-specific opening, two or three evidence-backed value paragraphs, an honest transition/gap boundary when applicable, and a restrained closing. Never infer a hiring-manager name, pronouns, referral, employer relationship, compensation expectation, work authorization, relocation intent, or start date.
- Show why each paragraph exists. Link claims to exact candidate evidence and posting requirements; let the user keep, edit, regenerate, or remove a paragraph. A user edit becomes unverified until rechecked against the same evidence contract.
- Keep the base résumé immutable. Cover-letter edits and generation state are target-scoped and cannot silently rewrite the canonical résumé, Evidence Map, application outlook, template selection, or export authorization.
- Export plain text, DOCX, and selectable/searchable PDF from one canonical letter plan. Optionally package the approved résumé and letter together while retaining separate files, independent readiness labels, and exact content hashes.
- Extend the private-processing disclosure before cover-letter generation. State exactly which résumé, posting, evidence, and existing draft fields will be sent to Anthropic; preserve cancellation, focus restoration, input retention, no-cache responses, sanitized logs, and the promise that Gigscapes does not submit applications.
- Add cross-career fixtures for technology, administration, marketing, creative work, skilled trades, regulated credentials, career transitions, weak fit, and incomplete postings. Tests must reject generic flattery, invented company knowledge, unsupported motivations, fabricated metrics, skills, licences, contacts, and “directly transferable” equivalence claims.
- Define quality through evidence coverage, specificity, natural sentence variation, factual consistency, editability, accessibility, and export parity—not unverifiable “human-written” or AI-detector scores.

**MVP acceptance criteria:**

- One approved résumé and one reviewed posting can produce a candidate-controlled letter with paragraph-level evidence explanations.
- The letter and résumé agree on every identity, employer, date, responsibility, metric, skill, credential, and application-risk boundary.
- Direct/Warm/Confident and short/standard choices are deterministic presentation controls that do not alter factual authorization.
- Preliminary versus application-ready status is consistent across browser preview, DOCX, PDF, copied text, and an optional application package.
- No letter content, résumé content, posting text, or free-form user edit enters analytics or operational logs.
- Desktop and mobile keyboard/screen-reader flows, cancellation, regeneration, paragraph veto, export, and stale-authorization rejection have focused tests and real-browser verification.

### P3.8 Position-independent résumé presentation system

**Status:** Implementation complete on 2026-08-28; exact local and production release evidence is recorded in `docs/release-checklist.md` after the release gate.

- Content approach and visual presentation are separate product choices. The evidence-aware strategy continues to control safe emphasis, headings, and section order; presentation controls cannot create, remove, reclassify, or rewrite evidence.
- Seven position-independent résumé styles—Essential, Ledger, Contour, Compact Focus, Bold Impact, Studio Editorial, and Field Ready—work across technology, administration, marketing, creative work, skilled trades, healthcare, education, finance, logistics, hospitality, and community services. Usage copy is a mild suggestion, never an occupation lock.
- Four accessible palettes—Gigscapes Orange, Forest, Slate Blue, and Monochrome—compose with Comfortable or Compact density, style-default/left/center header alignment, and Auto/one-page/two-page target length. Target length changes geometry only and never silently deletes evidence.
- The complete account-and-target-scoped selection persists in the browser with deterministic migration from version-1 role/visual selections and version-2 strategy/style pairs. Invalid or removed options fail safely to canonical defaults.
- Browser preview, editable DOCX, selectable/searchable direct PDF, render hashes, and export authorization consume the same composed tokens. Switching any presentation control is local and immediate, makes no AI/network request, and preserves the canonical content hash, item IDs, Evidence Map, requirement coverage, fit assessment, and readiness decision.
- Automated coverage includes the 7 × 4 × 2 style/palette/density matrix, every modifier group, accessible colour contrast, persistence migration, stale authorization, and four representative cross-format export combinations. Real-file QA covers both LibreOffice-rendered DOCX and direct PDF pages.

### P3.9 Decision tightening and candidate-controlled Evidence Coach

**Phase A status:** Implemented and locally verified on 2026-08-29; commit and production release evidence remain.

- Application outlook now uses one core-requirement inventory. Adjacent or transferable evidence alone cannot soften unsupported mandatory capabilities into a “viable” label; a viable material-gap outcome requires direct core evidence to outweigh the remaining material gaps.
- Legacy saved analyses are recalibrated conservatively in the presentation layer, so an older optimistic model label cannot override a stricter deterministic client result.
- Core fit and the complete requirement inventory are shown as separate, named quantities. The review no longer mixes core requirements with preferred/contextual items or calls every inventory item “atomic” without explaining the denominator.
- Candidate-facing fit risk remains in the private review. Missing requirements, gap language, unsupported-capability warnings, and application-risk labels are removed from employer-facing résumé profile content and explicitly prohibited in future generated document fields.
- Zero-effect safety messages are hidden. Quality checks, missing-evidence inventories, and lower-level audit detail use progressive disclosure, while the application decision, blockers, and core evidence remain visible.
- The explained-change ledger puts repositioned and condensed lines before straightforward rephrases so the candidate reviews the highest-judgment edits first.

**Phase B — next implementation: Candidate Evidence Coach**

**Status:** Implemented and locally verified on 2026-08-29; commit and production release evidence remain.

- Let a person answer a missing-evidence question in ordinary factual sentences. AI may clarify and organize only the facts the person supplied; it must ask a follow-up rather than guess an employer, date, tool, credential, contribution level, outcome, or metric.
- Show four things before acceptance: the person’s source words, the proposed evidence statement, the exact facts used, and unresolved details. Offer **Approve**, **Edit**, **Reject**, and **Answer follow-up**.
- Approval does not legalize an invention. Every proposal still passes exact history, title/employer/date, semantic-evidence, credential, metric, and contribution-level validation before it can affect tailoring.
- Keep application-only and reusable evidence separate. Reusable evidence remains browser-local until the P3.1 sync schema, retention, consent, conflict, and deletion contract is deliberately extended.
- Re-run core fit, Evidence Map, explained changes, résumé shaping, and export authorization after accepted evidence. Never mutate the canonical base résumé silently.
- Make the flow useful across software, SAP, administration, marketing, creative work, healthcare, education, logistics, hospitality, electricians, plumbers, other skilled trades, regulated credentials, and deliberately weak-fit applications.

Implementation closure includes a dedicated authenticated, no-store clarification endpoint; provider-neutral candidate copy; minimized one-answer requests; exact source-fact citations; deterministic metric, credential, regulated-action, named-term, and contribution-level checks; stable evidence hashes; explicit Approve/Edit/Reject/Answer-follow-up controls; cancellation and late-response protection; sanitized aggregate telemetry; and a second provenance validation before accepted evidence can reach tailoring. AI output remains a proposal until candidate approval, candidate edits return to the ordinary confirmation path, and the base résumé remains immutable.

### Recorded pipeline after P3.9

- **P3.1 release closure — complete:** the synthetic two-account, anonymous-denial, revision-conflict, new-device adoption, stop-on-device, offline-retry, and remote-delete gates passed; résumé sync is enabled in Production behind the unchanged fail-closed flag boundary.
- **P4.1 résumé intake expansion — released:** PDF/DOCX upload and camera/photo capture now use bounded files, explicit private-processing disclosure, local extraction where possible, OCR review for scanned inputs, and no silent overwrite. The responsive web app and cross-device vault remain the canonical foundation before native apps.
- **P4.2 native readiness:** stabilize authenticated sync and document intake on responsive web, then evaluate a PWA and native iOS/Android shells with secure device storage, camera/file permissions, deep links, accessibility, offline behavior, and app-store privacy disclosures.
- **P4.3 geography and source expansion — P4.3A market capability and P4.3B public exposure gate implemented locally; production enablement pending:** Canada remains the fail-closed default while a canonical market registry supports explicit U.S. country/state/city selection, all 50 states plus DC, market-scoped provider routing, collision-safe U.S. external IDs, independent source/market emergency stops, and failure-isolated imports through the two unchanged cron routes. The separate `VITE_US_MARKET_ENABLED` build flag prevents staged U.S., blank, unsupported, or old saved all-country criteria from exposing U.S. rows before release; dormant visitors retain Canada-only copy and choices without destroying a saved U.S. preference. When enabled, the app labels U.S. coverage as a pilot, explains remote/work-authorization/sponsorship uncertainty without inferring those facts, uses privacy-safe country/outcome analytics, and retains Canadian source IDs, scopes, links, and behavior. Salary remains deliberately deferred until provenance can be carried without estimation. Production still requires approved U.S. provider terms, a separate Jooble U.S. key, a dormant Preview import with `JOB_MARKETS=CA,US`, aggregate data audit, enabled Preview smoke, rollback drill, and only then Production promotion; no database migration is required.
- **P4.4 listing freshness — released and production-verified:** source-run provenance and board-scoped idempotency replace physical pruning; only authoritative, complete source snapshots move unseen jobs through uncertain → closed after repeated misses. Ranked, sampled, capped, partial, failed, and empty observations cannot create false closures. Authenticated on-demand checks reuse the guarded public-page reader, 404/410 and expired structured data are strong closure evidence, blocked/rate-limited/unreadable pages remain uncertain, richer reviewed posting text is preserved, and the app explains checked/uncertain/closed states without deleting saved history or prior tailored work. The production schema, grants, public-view boundary, service-only RPC, anonymous denial, Git-triggered Vercel release, public desktop/mobile smoke, and a complete scheduled source refresh are verified. The refresh exposed and closed a live Himalayas Unix-seconds compatibility gap without changing the conservative observation-only lifecycle boundary. Authenticated state-transition smoke remains a hands-on release-checklist item.
- **P4.H1 exporter deployment-skew resilience — implemented and locally verified; release pending:** the four résumé/cover-letter DOCX/PDF paths now share cached retryable lazy loaders, warm their real `docx`/`jspdf` dependencies only after private output exists, classify failures without leaking hashed asset URLs, and provide explicit draft-aware refresh recovery. A stale résumé tells the candidate to copy tailored wording before refresh; a target-specific cover-letter draft remains browser-saved. Automatic reload, weakened export authorization, eager landing imports, raw error logging, schema changes, and provider changes remain excluded. All 554 tests, 48 résumé export files, both cover-letter states/formats, the production build, and desktop/mobile public browser smoke passed. Commit, deployment, and an authenticated stale-tab release exercise remain pending. The complete execution contract is in `docs/p4-exporter-reliability-hotfix.md`.
- **P4.5 evidence-led résumé and cover-letter presentation research:** conduct a dated, cited web study of leading résumé and cover-letter products, recruiter scanning and information hierarchy, typography and Gestalt principles, accessibility, ATS/parser behavior, DOCX/PDF interoperability, and culturally appropriate US/Canadian document conventions. Separate observed competitor patterns from verified machine-readable requirements and from design hypotheses. Produce an original design matrix and prototypes rather than copying proprietary templates. Score each concept for hierarchy, density, legibility, mobile preview, print behavior, selectable reading order, ATS risk, browser/DOCX/PDF parity, and suitability for résumé versus matching cover-letter use. Implement successful concepts only through the existing position-independent token system; content, evidence hashes, readiness decisions, and canonical résumé facts must remain unchanged. Every new family needs a coordinated cover-letter treatment, a conservative application-safe variant, representative short/long-career fixtures, accessibility checks, visual regression evidence, and parser-oriented text-order verification.
- **P4.6 application workspace:** after the evidence workflow is stable, consider a lightweight saved → applied → interviewing → offer tracker and evidence-first cover-letter packages. Do not add automatic application submission.

## Recommended execution order

1. P0.1 posting enrichment and provenance
2. P0.2 completeness/readiness gating and fit-label correction
3. P0.3 caching, staged recovery, telemetry, and regression fixtures
4. P0.4 multi-page intake, provenance, and export-integrity verification
5. P1.1 evidence follow-up comments
6. P1.2 ATS writing feedback and P1.3 resume focus
7. P1.4 guest-first access and action-gated magic links
8. P2.1 resume families plus DOCX/PDF compatibility
9. P2.2 landing page — released and production-verified
10. P2.3 Phase A discovery integrity and source-health release, then terms-approved feed expansion
11. P3.2 Phase A redacted evaluation gate — implemented and locally verified
12. P3.2 Phase B1 opt-in aggregate signals and structured feedback — migration applied and anonymous denial verified; service-role/RLS evidence and release remain
13. P3.3 trust, explainability, and application-risk calibration — implemented, locally verified, and release-authorized
14. P3.4 visual résumé gallery and strategy/design separation — implemented, locally verified, and release-authorized
15. P3.5 Evidence Map and application decision clarity — implemented, locally verified, and release-authorized
16. P3.6 privacy and data-transparency foundation — configured, release-verified, and authorized for Git-triggered production promotion
17. P3.7 evidence-first cover letters and application packages — approved after the privacy release
18. P3.8 position-independent résumé presentation system — implementation complete; release evidence recorded with the feature SHA
19. P3.1 Phase A opt-in web résumé sync and production RLS verification, then native mobile after the web contract remains stable
20. P3.9 Phase A decision tightening, then Phase B candidate-controlled Evidence Coach
21. P4.1 PDF/DOCX/photo résumé intake, followed by P4.2 native readiness
22. P4.4 listing freshness production migration and release verification
23. P4.H1 exporter deployment-skew resilience and authenticated stale-tab verification
24. P4.3 terms-approved geography/source expansion, followed by P4.2 native readiness
25. P4.5 evidence-led résumé and cover-letter design research, followed by a small original prototype set and measured tester validation

## Source constraints behind P0.1

- Jooble REST results document a job-description **snippet** plus a posting link, not a guaranteed full description: <https://help.jooble.org/en/support/solutions/articles/60001448238-rest-api-documentation>
- A job detail page may expose the complete description through `JobPosting.description` structured data: <https://developers.google.com/search/docs/appearance/structured-data/job-posting>
- Therefore, original-page enrichment is feasible but not guaranteed. It must be on demand, validated, cached, terms-aware, and backed by paste/screenshot intake.
