# Job source expansion

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
- Do not add another Vercel Hobby cron entry for these companion feeds.
