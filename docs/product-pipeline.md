# Gigscapes product pipeline

Updated: 2026-08-23

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

## Priority 1 — Let the user supply missing evidence precisely

### P1.1 Evidence follow-up and comments

Turn the existing “Questions that could strengthen this version” into an evidence form:

- Each question supports **Yes**, **No**, and **Not sure**.
- A Yes answer asks for context: skill or action, project/employer, approximate date, and result. Numbers remain optional and must be user supplied.
- The user chooses whether confirmed evidence applies only to this application or may update the master resume/profile.
- Show a preview before saving; rerun truth, history, number, and tense validation after every change.
- Never convert a vague user statement into a credential, employer, title, project, technology, or metric the user did not confirm.

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

### P1.4 Guest-first browsing with account-required workspaces

- Allow landing page, onboarding preferences, searching, filtering, and listing details without sign-in.
- Keep anonymous preferences locally.
- Ask for email authentication when the user saves jobs, stores a resume, tailors, exports, or syncs across devices.
- Maintain Supabase RLS: public listing reads can be anonymous; resumes, answers, saved jobs, and tailored outputs stay user-owned.
- Evaluate email OTP code entry as the future alternative to magic links; do not remove the working magic-link path until OTP is tested end to end.

## Priority 2 — Resume families and product presentation

### P2.1 Canonical resume model plus job-family renderers

Keep one canonical evidence model and vary section order, density, language emphasis, and visual treatment. Start with:

1. ATS Core / general professional
2. SAP functional and enterprise consulting lead
3. Project, operations, and transformation leadership
4. Career transition / adjacent pivot
5. Skilled trades and field services
6. Administration and customer operations
7. Marketing and communications
8. Creative and design portfolio

Every family needs a screen renderer, DOCX renderer, plain-text export, and automated parseability check. The user may override the recommendation. Creative styling must never be the only export; retain a conservative ATS-safe version.

### P2.2 Landing page

- Lead with the two product paths: **Find opportunities** and **Tailor a job I found**.
- Demonstrate evidence-first tailoring, truthful career changes, posting import, and private resume handling.
- Use a lighter, faster brand presentation than traditional resume-builder sites.
- Use restrained glass effects only for navigation or small controls. Do not use heavy translucency in forms, search results, or resume documents; readability, contrast, mobile performance, and ATS exports take priority.

### P2.3 Search and feed quality

- Continue source-health monitoring, deduplication, freshness, canonical links, and location normalization.
- Rank title/domain relevance before pagination and explain zero-result states.
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
4. P1.1 evidence follow-up comments
5. P1.2 ATS writing feedback and P1.3 resume focus
6. P1.4 guest-first access and OTP experiment
7. P2.1 resume families
8. P2.2 landing page
9. P2.3 ongoing source/feed work
10. P3 native mobile and evaluation expansion

## Source constraints behind P0.1

- Jooble REST results document a job-description **snippet** plus a posting link, not a guaranteed full description: <https://help.jooble.org/en/support/solutions/articles/60001448238-rest-api-documentation>
- A job detail page may expose the complete description through `JobPosting.description` structured data: <https://developers.google.com/search/docs/appearance/structured-data/job-posting>
- Therefore, original-page enrichment is feasible but not guaranteed. It must be on demand, validated, cached, terms-aware, and backed by paste/screenshot intake.
