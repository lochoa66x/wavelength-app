# Gigscapes product pipeline

Updated: 2026-08-24

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
- All nine template families come from the canonical résumé registry. Switching the generic sample preview is local, immediate, and network-free.
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

## Priority 3 — Native mobile and growth work

### P3.1 iOS and Android

- Reuse the guest-first onboarding and local preferences.
- Store local resume drafts using platform-secure storage and offer explicit account sync.
- Require authentication only for cloud save, tailoring, export history, and multi-device sync.
- Begin after the web tailoring contract, canonical resume schema, and job-family renderers stabilize.

### P3.2 Evaluation and analytics

- Build a redacted regression corpus by job family and candidate path.
- Track posting completeness, requirement coverage, correction rate, user edits, export completion, and retry rate.
- Compare model cost and quality using the same evidence fixtures before changing providers.
- Add user feedback on fit labels and suggested bullets without collecting unnecessary resume content.

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
11. P3 native mobile and evaluation expansion

## Source constraints behind P0.1

- Jooble REST results document a job-description **snippet** plus a posting link, not a guaranteed full description: <https://help.jooble.org/en/support/solutions/articles/60001448238-rest-api-documentation>
- A job detail page may expose the complete description through `JobPosting.description` structured data: <https://developers.google.com/search/docs/appearance/structured-data/job-posting>
- Therefore, original-page enrichment is feasible but not guaranteed. It must be on demand, validated, cached, terms-aware, and backed by paste/screenshot intake.
