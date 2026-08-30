# P4.3B — U.S. market exposure gate, staged validation, and release closure

**Execution status (2026-08-30):** implemented and verified behind a fail-closed
public flag. P4.3C governs the dormant Canada-only production release. Provider
approval, a distinct Jooble U.S. key, staged imports, aggregate inventory review,
and public U.S. enablement remain outside this implementation pass.

## Detailed implementation prompt

Implement the release-control layer for Gigscapes' existing P4.3A U.S. market
capability. The goal is to let operators import and inspect U.S. inventory
without exposing it to visitors until the data, provider terms, user experience,
and rollback path have passed a controlled release gate.

Treat Canada as the established product and the United States as an explicitly
enabled pilot. The dormant state must be the safe default when a variable is
missing, blank, misspelled, set to `1`, or set to any value other than the word
`true` (case-insensitive). The public Vite variable is
`VITE_US_MARKET_ENABLED`; it is non-secret configuration embedded during the
client build and therefore requires a redeploy when changed. Server-side source
routing remains independently controlled by `JOB_MARKETS` and provider secrets.

### Required behavior when the public flag is off

1. Expose Canada as the only country choice. Do not offer an unscoped “Any
   country” choice because staged U.S. rows could satisfy that query.
2. Force every live search to `countryCode=CA`, including searches restored from
   old local storage with `US`, blank, unknown, or all-country criteria.
3. Clear an incompatible stored state/region and city from the live search copy
   when it is forced back to Canada, without destroying the original persisted
   preference. If the pilot is later enabled, that saved U.S. preference should
   become usable again.
4. Remove U.S.-pilot claims, U.S. provider links, state-selector entry points,
   and U.S.-specific source copy from the landing and application surfaces.
5. Preserve all Canadian search, save, tailoring, intake, privacy, analytics,
   source-attribution, and back-navigation behavior.

### Required behavior when the public flag is on

1. Offer Any country, Canada, and United States (pilot), and keep all 50 states
   plus the District of Columbia available under the U.S. choice.
2. Preserve explicit Canadian and U.S. geography in live criteria.
3. Show the pilot boundary and the existing warning that remote eligibility,
   state requirements, work authorization, and sponsorship must be confirmed
   with the employer. Never infer those facts from a résumé, location, browser,
   citizenship, name, or IP address.
4. Use regional source links and accurate Canada/U.S. discovery language.
5. Keep the existing coarse `market_search` analytics contract. It may contain
   only allowlisted market and outcome categories, never query text, location,
   listing details, URLs, identity, résumé data, or authorization answers.

### Architecture and security constraints

- Define one canonical parser and one canonical normalized-criteria boundary;
  do not scatter raw `import.meta.env` checks throughout components.
- Do not put Adzuna, Jooble, Supabase secret/service, or cron credentials in a
  `VITE_` variable or client bundle.
- Do not use a client feature flag as the server importer authorization. The
  client flag controls exposure; `JOB_MARKETS` and per-provider credentials
  control ingestion.
- Do not add a database migration, table, public privilege, cron schedule,
  provider, salary estimate, citizenship field, sponsorship field, automatic
  application behavior, or native-app behavior in this phase.
- Preserve the existing `country_code` data boundary, market-scoped source IDs,
  source attribution, and failure isolation from P4.3A.
- Keep résumé facts, evidence hashes, tailoring decisions, saved jobs, and base
  résumé storage unchanged.

### Test matrix and acceptance gates

Automate both configurations. With the flag absent or false, prove that the
selector contains Canada only; a saved U.S., blank, or unsupported criterion is
queried as Canada with incompatible geography cleared; no U.S. pilot copy or
U.S. provider link is rendered; and Canadian behavior remains intact. With the
flag true, prove that Any/Canada/United States are offered, valid U.S. geography
is preserved, the state list contains 50 states plus DC, the pilot warning is
visible, and regional provider links are used.

Run the complete Node suite and production builds with the flag off and on. In
a real browser, cover landing and app routes on desktop and a narrow phone,
including the country editor, restored preferences, search, pilot notice,
source links, no framework overlay, no console/page errors, and no horizontal
overflow. Do not release if either configuration breaks Canada.

### Operator release order

1. Create `VITE_US_MARKET_ENABLED=false` as Vercel **Config** in Preview and
   Production; redeploy so the dormant boundary is embedded.
2. Obtain written approval for Adzuna U.S. publishing/branding terms.
3. Obtain a separate `jooble.org` key and store `JOOBLE_US_API_KEY` as a
   server-only Secret. Never reuse the Canadian key.
4. Set Preview `JOB_MARKETS=CA,US` while the public flag remains false, redeploy,
   and run the existing imports. Do not add a cron.
5. Audit aggregate U.S. rows for `country_code=US`, valid HTTPS links, current
   timestamps, attribution, geography quality, duplicate rate, and cross-market
   ID isolation. Inspect content without exporting private résumé data.
6. Enable the public flag in Preview, redeploy, and run authenticated desktop
   and mobile smoke tests for California, Washington state, Washington DC,
   remote eligibility, empty results, source links, save, tailor, and back.
7. Review only the coarse market/outcome analytics. Resolve provider or
   location defects before promotion.
8. Repeat the same configuration in Production and redeploy only after Preview
   passes. Confirm Canada first, then the U.S. pilot.

### Rollback

Set `VITE_US_MARKET_ENABLED=false` and redeploy first; this immediately removes
all public U.S. entry points without deleting rows or user data. Then set
`JOB_MARKETS=CA` and redeploy to stop future U.S. imports. If only one connector
is unhealthy, add its market-scoped token (for example `jooble:us`) to
`JOB_SOURCE_DISABLED`. Deleting or closing imported U.S. rows is a separate,
deliberate data operation and is not part of an emergency exposure rollback.

## Implemented code boundary

- `src/marketExposure.js` parses the public flag, filters public options, and
  normalizes every live location criterion before search.
- `src/App.jsx` consumes only the filtered options and normalized live criteria.
- `src/landing/LandingPage.jsx` keeps market and provider claims aligned with the
  same canonical exposure flag.
- Focused regressions cover dormant and enabled behavior, including restored
  U.S., blank, and unsupported criteria.

## Local verification evidence

- All 550 Node tests passed.
- Production builds passed with the flag absent/off and explicitly enabled;
  each transformed 2,451 modules, with only the pre-existing chunk advisory.
- A real Chrome pass confirmed dormant landing copy and Canadian Adzuna/Jooble
  links, Canada-only live criteria, retention of the saved U.S. preference, and
  the absence of U.S. pilot entry points.
- A second real Chrome pass confirmed enabled landing/pilot copy, U.S. regional
  source links, restored San Francisco/California criteria, Any/Canada/U.S.
  options, and 50 states plus District of Columbia.
- Desktop and 390×844 checks in both states had no page errors or horizontal
  overflow. The mobile search-area controls remained readable and operable.

## External release gates still open

- Adzuna U.S. publishing/branding approval.
- Separate Jooble U.S. credential.
- Future U.S.-enabled Vercel Preview and Production configuration.
- Staged import and aggregate data audit.
- Authenticated Preview smoke and rollback drill.
- U.S.-enabled Production promotion authorization after the dormant release.
