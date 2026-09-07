# Service-provider register

Last reviewed: 2026-09-06

## Supabase

- Purpose: authentication, user profile workspace, public listing database, private daily quality aggregates.
- Data: email/auth identifiers; criteria; saved/dismissed listing IDs; public listings; optional aggregate signals.
- Controls: RLS; authenticated own-row policies; anonymous revocation on profiles; `security_invoker` public view; service-role-only quality function.
- Public policy: <https://supabase.com/privacy>

## OpenAI

- Purpose: primary provider for extracting supplied job postings; reading opt-in résumé images; analyzing, tailoring, and truth-checking résumé drafts; generating and evidence-checking candidate-controlled cover letters.
- Data: supplied posting content or screenshots; résumé or compressed rendered résumé pages; verified candidate evidence; application assessment; generated résumé or cover-letter response; minimized existing draft when a paragraph is regenerated.
- Controls: server-side API key, authenticated Gigscapes endpoints, request-size caps, untrusted-input delimiters, structured tools, evidence validation, `store: false` on Responses API requests, no response caching.
- Data-controls reference: <https://platform.openai.com/docs/guides/your-data>
- Owner check: verify the active API project, organization settings, Zero Data Retention eligibility if applicable, contractual terms, and any abuse-monitoring or legal exceptions.

## Anthropic

- Purpose: fallback provider for the same AI-processing operations when the OpenAI request fails.
- Data: supplied posting content or screenshots; résumé; verified candidate evidence; application assessment; generated résumé or cover-letter response; minimized existing draft when a paragraph is regenerated.
- Controls: invoked only after a failed primary request; server-side API key, authenticated Gigscapes endpoints, request-size caps, untrusted-input delimiters, structured tools, evidence validation, no response caching.
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
