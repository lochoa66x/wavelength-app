# Job source expansion

## Eligibility contract — reviewed 2026-08-25

Only first-party documentation can authorize an active connector. The review is
an engineering eligibility record, not a claim that possession of a credential
proves a commercial agreement.

| Source | Access and use basis | Required product behavior | Operator check |
| --- | --- | --- | --- |
| Jobicy | Public API for job-discovery products: <https://jobicy.com/jobs-rss-feed> | Keep Jobicy attribution and canonical URL; cache; never poll more than hourly | Recheck fair-use changes before increasing volume |
| Himalayas | Public API may power other remote job boards: <https://himalayas.app/api> | Mention Himalayas, retain its URL, and do not resubmit to prohibited third-party aggregators | Recheck rate limits and attribution language |
| Jooble | Regional-key REST API: <https://help.jooble.org/en/support/solutions/articles/60001448238-rest-api-documentation> | Use the Canadian endpoint/key, preserve Jooble attribution/link, and treat `snippet` as incomplete | Confirm the production key remains valid for `ca.jooble.org` and within quota |
| Adzuna | Publishing terms: <https://developer.adzuna.com/docs/terms_of_service> | Preserve required “Jobs by Adzuna” attribution/link and current rate limits | Confirm current publishing licence/trial status and branding approval; an API key alone is not proof |
| Greenhouse | Public Job Board API: <https://developers.greenhouse.io/job-board.html> | Configured employer boards only; published jobs and employer-hosted links | Employer board slug must be deliberately configured |
| Lever | Public Postings API: <https://github.com/lever/postings-api> | Configured employer boards only; published jobs and employer-hosted links | Employer board slug must be deliberately configured |
| Ashby | Public Job Postings API: <https://developers.ashbyhq.com/docs/public-job-posting-api> | Configured employer boards only; listed jobs and employer-hosted links | Employer board slug must be deliberately configured |

`JOB_SOURCE_DISABLED` is an emergency server-only comma-separated stop control.
It accepts only reviewed source IDs. A disabled source is not requested or
written during that scheduled run, companion sources continue independently,
and the response exposes only `disabled_by_policy`. Removing already stored
rows remains an explicit database operation; the kill switch does not delete
inventory.

Gigscapes keeps the Vercel Hobby deployment at two daily cron schedules. The
existing Jooble schedule also refreshes Jobicy and Himalayas; the
existing Adzuna schedule can also refresh configured employer job boards.

## Public feeds

- **Himalayas**: Canada-eligible remote roles, fetched from the public API and
  linked back to Himalayas.

The connector rejects stale or off-domain records, preserves existing database
rows when the feed returns no valid batch, deduplicates by source ID, normalizes
location fields, and keeps the source attribution visible in the product.

## Employer-direct ATS boards

Set the server-only `ATS_JOB_BOARDS` environment variable to a JSON array. Each
entry requires a supported provider and that employer's public board slug:

```json
[
  { "provider": "greenhouse", "board": "company", "company": "Company" },
  { "provider": "lever", "board": "company", "company": "Company" },
  { "provider": "ashby", "board": "company", "company": "Company" }
]
```

Only Greenhouse, Lever, and Ashby are accepted. The importer keeps listings that
are Canadian, Canada-eligible, worldwide, North America-wide, or generically
remote; obvious US-only roles are discarded. A failed employer board does not
break the primary Adzuna import.

## User-supplied postings

The dashboard exposes all three existing intake paths directly:

1. Paste a public HTTPS job link.
2. Upload up to four screenshots.
3. Paste the posting text.

All paths still require the user to review the extracted job brief before resume
tailoring begins.

## Operations

- Keep `CRON_SECRET`, Supabase server credentials, and feed API keys server-only.
- Add or remove employer boards by editing `ATS_JOB_BOARDS`; no code change is
  required.
- Check the JSON response from each cron route for per-source saved, failed, and
  partial-success diagnostics.
- Run `npm run audit:sources` with the public Supabase URL and publishable key to
  print only aggregate source, URL, freshness, and snippet-quality counts. The
  report never prints listing titles, employers, raw URLs, or descriptions.
- Use `JOB_SOURCE_DISABLED=source-a,source-b` to stop a reviewed importer while
  terms, credentials, or upstream behavior are investigated. Invalid source IDs
  fail configuration without echoing the supplied value.
- Do not add another Vercel Hobby cron entry for these companion feeds.
