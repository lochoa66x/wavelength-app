# P3.2 Phase B1 — Opt-in aggregate quality signals

Status: implemented and verified locally on 2026-08-25. The production Supabase SQL was applied successfully by the operator on 2026-08-25. A publishable-client check confirmed that the private schema is inaccessible and anonymous RPC execution is denied with PostgreSQL `42501`; no synthetic row was written. The endpoint is not released until the remaining database and deployment gates below are complete.

## Privacy contract

Quality sharing is off by default. Enabling it is an explicit browser-local choice and disabling it immediately aborts unsent in-memory requests. The product remains fully functional when sharing is disabled or storage/network access fails.

The browser may send only the exact versioned fields and enum values in `src/qualitySignalContract.js`. The same-origin API validates the same contract, caps the request at 4,096 UTF-8 bytes, rejects extra or nested fields, requires JSON and the expected request marker, checks the exact Origin, omits response echoing, and records only a sanitized operational status and duration.

Allowed dimensions describe a workflow category, never its content: event, app route, posting-source type, occupation family, candidate path, posting/export readiness, integrity status, template, export format/outcome, safe error category, coverage/duration band, and optional structured feedback.

The following are prohibited from the payload, application logs, database schema, evaluator output, and feedback UI:

- résumé, posting, evidence, search, prompt, or model-response text;
- names, email addresses, phone numbers, account/session IDs, listing IDs, employer names, titles, URLs, IP addresses, or stable device identifiers;
- raw errors, export bytes, free-form feedback, nested objects, arrays, or arbitrary strings.

The browser sends with `credentials: "omit"`. The application does not persist IP addresses or user agents. Hosting infrastructure can still create ordinary request/access logs under its own retention controls; those logs are outside this aggregate table and must not be joined to these signals.

## Storage and access boundary

The browser never receives database privileges for this feature:

```text
explicit local consent
  → strict browser enum contract
  → POST /api/quality-signal (same origin, no credentials)
  → strict server validation
  → server-only Supabase secret
  → service-role-only SECURITY INVOKER RPC
  → gigscapes_private.quality_signal_daily_aggregates
```

There is no raw-event table. The RPC atomically increments one daily aggregate row. Row-level security is enabled, the private schema/table and public RPC are revoked from `PUBLIC`, `anon`, and `authenticated`, and only `service_role` receives the required privileges. The RPC uses `SECURITY INVOKER` with an empty `search_path`. Rows older than 180 days are deleted during a successful increment.

## Event and feedback behavior

The current contract covers posting review, completed/blocked tailoring, export attempts/completions/failures, fit feedback, and export feedback. Feedback is visible only after consent, contains no text box, accepts one allowlisted answer/reason, and guards repeated clicks in the mounted experience. Guidance and feedback remain outside the résumé preview and all export formats.

The local evaluator accepts only valid contract rows and publishes breakdowns only for cohorts of at least 10. Smaller cohorts contribute only to unlabeled suppressed-group and suppressed-event totals.

## Apply in Supabase SQL Editor

Paste and run the complete contents of:

`supabase/migrations/20260825222730_quality_signal_daily_aggregates.sql`

Do not expose `gigscapes_private` through the Data API schema list. Do not grant the RPC to browser roles. Do not substitute a browser publishable key for `SUPABASE_SECRET_KEY` in the server function.

## Privilege and schema verification

Run this after applying the migration. Every browser-role privilege result must be `false`; the two service-role results and `row_level_security` must be `true`. `policy_count` should be `0`, because browser roles have no table privileges and the service role performs the aggregate write.

```sql
select
  has_schema_privilege('anon', 'gigscapes_private', 'usage') as anon_schema_usage,
  has_schema_privilege('authenticated', 'gigscapes_private', 'usage') as authenticated_schema_usage,
  has_table_privilege('anon', 'gigscapes_private.quality_signal_daily_aggregates', 'select,insert,update,delete') as anon_table_access,
  has_table_privilege('authenticated', 'gigscapes_private.quality_signal_daily_aggregates', 'select,insert,update,delete') as authenticated_table_access,
  has_function_privilege(
    'anon',
    'public.record_quality_signal(smallint,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text)',
    'execute'
  ) as anon_rpc_execute,
  has_function_privilege(
    'authenticated',
    'public.record_quality_signal(smallint,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text)',
    'execute'
  ) as authenticated_rpc_execute,
  has_table_privilege('service_role', 'gigscapes_private.quality_signal_daily_aggregates', 'select,insert,update,delete') as service_table_access,
  has_function_privilege(
    'service_role',
    'public.record_quality_signal(smallint,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text,text)',
    'execute'
  ) as service_rpc_execute,
  (
    select relrowsecurity
    from pg_class
    where oid = 'gigscapes_private.quality_signal_daily_aggregates'::regclass
  ) as row_level_security,
  (
    select count(*)
    from pg_policies
    where schemaname = 'gigscapes_private'
      and tablename = 'quality_signal_daily_aggregates'
  ) as policy_count;
```

Test the atomic increment without retaining a synthetic row:

```sql
begin;

select public.record_quality_signal(
  1,
  'export_completed',
  'app',
  'public_listing',
  'general-professional',
  'direct',
  'reviewed_complete',
  'final',
  'pass',
  'ats-core-v1',
  'docx',
  'completed',
  'not_applicable',
  '90-100',
  'under_5s',
  'not_applicable',
  'not_applicable'
);

select event_count
from gigscapes_private.quality_signal_daily_aggregates
where day_bucket = (timezone('utc', now()))::date
  and event_name = 'export_completed'
  and export_format = 'docx';

rollback;
```

## Release gates

Before production release:

1. Capture the remaining service-role, RLS, and policy-count privilege-query results. Migration application plus the anonymous denial checks are complete.
2. Confirm `gigscapes_private` is not an exposed Data API schema.
3. Confirm the Vercel function has only server-side `SUPABASE_URL` and `SUPABASE_SECRET_KEY`.
4. Add an operator-reviewed Vercel Firewall/rate-limit rule for `/api/quality-signal` to reduce aggregate poisoning; Origin validation is not bot authentication.
5. Run signed-out and signed-in smoke tests with sharing off, on, and disabled again; confirm no product action depends on signal delivery.
6. Verify anonymous and authenticated clients cannot select the table or execute the RPC.
7. Review runtime logs and confirm no request payload or dimension values are logged.
