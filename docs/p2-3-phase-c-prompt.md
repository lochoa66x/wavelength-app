# P2.3 Phase C — source eligibility, operational control, and production acceptance

Work in `C:\Users\Luis\Documents\Codex\gigscapes-v7` as a senior product engineer, security reviewer, QA owner, and release manager. Preserve every existing user change. Inspect `git status`, the current branch, recent commits, and repository instructions before editing. Do not reset, discard, or overwrite unrelated work.

## Objective

Complete the web discovery-quality cycle without weakening guest access, Supabase boundaries, posting readiness, multi-posting isolation, résumé truthfulness, or export integrity. Establish an enforceable source-eligibility boundary, a privacy-safe quality audit, truthful source copy, and a production acceptance record. Integrate no provider whose official terms, access model, attribution requirement, or production configuration is unresolved.

## Required behavior

1. Maintain a server-only, allowlisted source-policy contract for Jooble, Jobicy, Himalayas, Adzuna, Greenhouse, Lever, and Ashby.
2. Add an emergency `JOB_SOURCE_DISABLED` control that accepts only known comma-separated source IDs. Unknown values must fail configuration generically without echoing the value. A disabled source must not be requested or written during that cron run.
3. Keep Jooble, Jobicy, Himalayas, Adzuna, and employer-board failures isolated. One source failure or policy stop must not erase existing rows or fail successful companion imports.
4. Expose only bounded operational metrics and safe skip/error categories. Never return upstream bodies, exception messages, credentials, board configuration, posting content, or environment values.
5. Preserve canonical provider links and visible attribution. Do not infer that an API key alone proves a commercial licence. Record the official documentation basis and any operator-verification requirement.
6. Do not invent employer boards. Greenhouse, Lever, and Ashby run only from the existing server-only `ATS_JOB_BOARDS` configuration.
7. Add a redacted aggregate audit for the anonymous `public.public_listings` surface. It may report bounded source counts, HTTPS URL validity, canonical duplicate counts, dated/undated/stale/future-dated totals, and snippet presence. It must never emit titles, companies, raw URLs, descriptions, résumé data, user IDs, or authentication data.
8. Remove UI claims that inactive or unconfigured sources are currently being scanned. Use accurate “available sources” and “may include” language.
9. Do not add client analytics, cookies, fingerprinting, a new database table, migration, RLS/grant change, cron schedule, dependency, or secret.
10. Preserve public `/app` discovery and all existing private action gates.

## Official-source eligibility review

Use only current first-party documentation. Record the review date and direct documentation URLs for each active connector. At minimum verify:

- Jobicy permits normal integrations, requires original-source attribution and the canonical URL, and asks clients to cache and poll no more than hourly.
- Himalayas permits powering another remote job board with an original-source mention and Himalayas link, and prohibits resubmission to named third-party aggregators.
- Jooble uses a regional Canadian endpoint/key and returns snippets rather than guaranteed complete postings.
- Adzuna permits publishing listings but has branding, rate-limit, trial/licensing, and termination obligations that require operator confirmation beyond code.
- Employer ATS connectors retrieve only published/listed public-board content and preserve employer-hosted links.

## Verification gates

Run focused source-policy, cron, search, auth, multi-posting, and export-readiness tests; then run the complete test suite. Run the persistent nine-template DOCX/PDF verifier and inspect generated documents proportionately to the export-code risk. Run the redacted audit contract tests, a sourcemapped production build, `git diff --check`, dependency audit, secret/private-content scans, desktop/mobile browser checks, public Supabase query smoke, production HTTP checks, Vercel build/runtime logs, and a 5xx scan.

If an already-authorized production session exists, tailor two different postings consecutively and download/open DOCX and PDF without issuing an unnecessary AI request. If no authorized session exists, do not manufacture credentials or transmit private data merely for verification; report that specific gap.

## Release boundary

Do not commit while a required check fails. If all required checks pass, commit the complete bounded change, push `main`, allow the Git-triggered Vercel production deployment, verify the deployment is bound to the exact commit, and smoke-test `https://gigscapes.com`. Report the detailed prompt, files changed, tests/build/audit results, deployed SHA and deployment ID, source-policy decisions, and every remaining external or manual blocker.
