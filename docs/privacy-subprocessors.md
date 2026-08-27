# Service-provider register

Last reviewed: 2026-08-27

## Supabase

- Purpose: authentication, user profile workspace, public listing database, private daily quality aggregates.
- Data: email/auth identifiers; criteria; saved/dismissed listing IDs; public listings; optional aggregate signals.
- Controls: RLS; authenticated own-row policies; anonymous revocation on profiles; `security_invoker` public view; service-role-only quality function.
- Public policy: <https://supabase.com/privacy>

## Anthropic

- Purpose: extract supplied job postings; analyze, tailor, and truth-check résumé drafts.
- Data: supplied posting content or screenshots; résumé; verified candidate evidence; generated response.
- Controls: server-side API key, authenticated Gigscapes endpoints, request-size caps, untrusted-input delimiters, structured tools, evidence validation, no response caching.
- Retention reference: <https://privacy.anthropic.com/en/articles/7996868-how-long-do-you-store-personal-data>
- Owner check: verify the active commercial/API plan, data settings, contractual terms, and any exceptions.

## Vercel

- Purpose: hosting, server functions, operational logs, aggregate Web Analytics.
- Data: requests and operational metadata; analytics route/referrer/coarse device/geography as documented by Vercel.
- Controls: analytics query/hash stripping; auth-callback suppression; no custom résumé events; private endpoint no-store/referrer headers; minimized application logs.
- Analytics privacy: <https://vercel.com/docs/analytics/privacy-policy>
- Public policy: <https://vercel.com/legal/privacy-notice>
- Owner check: verify project plan, analytics reporting window, operational log retention, and any Drains.

This register must be reviewed when a provider, model, region, data setting, or plan changes.
