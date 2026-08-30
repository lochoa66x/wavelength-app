# P4.3A — controlled United States market pilot

**Implementation status (2026-08-30):** P4.3A and the P4.3B public exposure gate
are complete and verified. The dormant Canada-only release protocol is defined
in P4.3C; provider approval, U.S. import execution, aggregate data audit, and
public U.S. enablement remain separate future gates.

## Release boundary

Canada is the established market and remains the only scheduled market unless
the server-only `JOB_MARKETS` allowlist explicitly contains `US`. Even when
U.S. inventory is staged, visitors see only Canada unless the independent
build-time `VITE_US_MARKET_ENABLED` flag is exactly `true`. The pilot does
not add a Vercel schedule, database relation, public privilege, browser secret,
location inference, salary estimate, citizenship inference, work-authorization
decision, sponsorship decision, or automatic application behavior.

The existing `country_code` discovery field and `public_listings` security-
invoker view are sufficient for single-market rows. Canada retains its legacy
provider external IDs and source scopes. United States rows use market-scoped
external IDs and source scopes so a provider identifier observed in both
markets cannot overwrite the Canadian row or participate in the Canadian
freshness lifecycle.

## Canonical market contract

- Supported discovery markets are `CA` and `US`; `CA` is always included in a
  scheduled run even if an operator supplies only `US`.
- U.S. geography uses all 50 USPS state names/abbreviations plus the District
  of Columbia. Territories are not part of this first pilot.
- `CA` remains context-sensitive: `San Francisco, CA` is California, while
  `Toronto, ON, CA` is Canada because the preceding province disambiguates it.
- No IP address, browser locale, résumé address, citizenship, protected trait,
  or inferred immigration status selects a market.
- Remote means remote within the listing's declared eligibility, not worldwide.

## Approved provider routing

| Source | Canada | United States | Isolation rule |
| --- | --- | --- | --- |
| Adzuna | `/jobs/ca/...` | `/jobs/us/...` | Existing credentials; `US` requires explicit `JOB_MARKETS` opt-in and operator publishing-terms approval |
| Jooble | `ca.jooble.org` + `JOOBLE_API_KEY` | `jooble.org` + separate `JOOBLE_US_API_KEY` | A regional key is never reused across domains |
| Jobicy | `geo=canada` | `geo=usa` | Public feed; source link and hourly-rate ceiling retained |
| Himalayas | `country=CA` | `country=US` | Public search API; Himalayas attribution and source link retained |
| Employer ATS | board entry defaults to `CA` | board entry explicitly sets `"market":"US"` | A board is imported only when its configured market is enabled |

Every source/market import is failure-isolated. `JOB_SOURCE_DISABLED=adzuna`
stops both markets; `JOB_SOURCE_DISABLED=adzuna:us` stops only the U.S. route.
The two existing daily Vercel schedules remain unchanged.

## Product truth and privacy

The country selector labels the United States as a pilot. The results surface
warns that inventory varies and that remote eligibility, state requirements,
work authorization, and sponsorship must be confirmed with the employer.
Gigscapes does not infer those facts from résumé evidence.

The only new analytics event is `market_search` with two allowlisted fields:
`market` (`ca` or `us`) and `outcome` (`results`, `empty`, or `failed`). It never
contains a keyword, city, state, listing, URL, source credential, user ID,
résumé, posting, authorization answer, or free text.

Salary is deliberately absent from this pilot. A later release may display
provider-supplied compensation only when amount, currency, period, location,
and provenance survive normalization without estimation.

## Local verification evidence

- 550 Node tests passed, including focused market, exposure-gate, source, cron, location,
  analytics, privacy, and app-copy coverage.
- Vite production builds completed in both dormant and enabled configurations
  with 2,451 modules; only the existing large-chunk advisory remains.
- A real Chrome session exercised Canada → United States → Canada. The U.S.
  selector exposed all 50 states plus District of Columbia, the pilot notice
  appeared only for the U.S., and source links changed between the matching
  Adzuna, Jooble, and Craigslist country destinations.
- The dormant browser restored a saved U.S. preference without deleting it but
  queried and displayed Canada, offered no unscoped country choice, and rendered
  Canadian provider links. The enabled browser restored the same preference,
  offered Any/Canada/U.S., and exposed 50 states plus DC.
- Desktop and 390×844 checks in both configurations found meaningful content,
  no page errors, and no horizontal overflow. The public privacy route showed
  the exact country/outcome analytics boundary at mobile width.

## Production configuration and verification

1. Create `VITE_US_MARKET_ENABLED=false` as non-secret Vercel Config in Preview
   and Production, then redeploy so the dormant boundary is embedded.
2. Confirm Adzuna U.S. publishing terms and branding in writing.
3. Obtain a distinct Jooble key from `jooble.org`; never copy the Canadian key.
4. Set `JOOBLE_US_API_KEY` as a server-only Preview secret.
5. Change Preview `JOB_MARKETS` from `CA` to `CA,US` while the public exposure
   flag remains false. Redeploy; do not add or modify Vercel cron schedules.
6. Trigger each existing Preview cron once with authorization and verify Canada succeeds
   even if a U.S. source is skipped or fails.
7. Run the aggregate public-source audit and confirm U.S. rows have `US`, HTTPS
   outbound links, current timestamps, source attribution, and no cross-market
   external-ID collision.
8. Set the Preview public exposure flag to true, redeploy, and smoke-test Canada
   and United States searches on desktop and a narrow phone,
   including California, Washington state, Washington DC, remote eligibility,
   empty results, source links, saved jobs, tailoring, and back navigation.
9. Confirm Vercel Analytics shows only the coarse `market_search` dimensions.
10. Only after Preview passes, repeat the server secret, `JOB_MARKETS=CA,US`, and
    public-flag configuration in Production and redeploy. Confirm Canada first.
11. If any provider or location mapping is questionable, disable only that
    source/market route and keep Canada live.

## Rollback

Set `VITE_US_MARKET_ENABLED=false` and redeploy first. This immediately removes
public U.S. entry points without deleting inventory or user data. Then set
`JOB_MARKETS=CA` and redeploy to stop new U.S. scheduled imports. If a single U.S.
connector is at fault, add its scoped token (for example `jooble:us`) to
`JOB_SOURCE_DISABLED`. Stored U.S. rows remain available for explicit review;
removal or closure is a separate, deliberate data operation.
