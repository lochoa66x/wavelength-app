# Privacy impact assessment — foundation release

Date: 2026-08-27
Status: implementation complete; production release blocked pending verified operator facts

## Purpose and necessity

Gigscapes finds public jobs and creates an editable résumé draft using evidence supplied by the person. A résumé contains identity, contact, employment, education, and skills data. The job posting is necessary to compare requirements. Confirmed evidence is optional and limited to five request/reusable records.

## Material risks and controls

| Risk | Severity | Control | Residual issue |
| --- | --- | --- | --- |
| User does not realize an AI provider receives private content | High | One-time, versioned, scope-specific disclosure immediately before job intake and tailoring; cancel retains work | Operator must keep provider wording current |
| Résumé leaks into analytics or logs | High | No custom résumé events; `beforeSend` strips query/hash and suppresses auth callback; APIs log only stage/status/counts; private responses are `no-store` | Verify Vercel project log retention and drain configuration |
| Shared-device exposure | High | User-ID-scoped local keys, honest browser-only copy, scoped deletion control | Browser profile itself remains a security boundary |
| Unauthorized profile access | High | RLS, own-row authenticated policies, anon revocation, server-only secret key | Run Supabase advisors after every schema change |
| AI fabricates claims | High | Evidence-first prompt, deterministic validation/repair/fallback, user review before export | Model behavior remains probabilistic; exports need user review |
| Excessive retention | Medium | No app database write for intake/tailoring payloads, local deletion, 180-day quality aggregate cleanup | Provider/hosting retention must be verified against contracted plan |
| Children provide résumé data | Medium | Production gate requires an explicit minimum-age policy | Owner decision outstanding |
| Privacy contact is fake or unreachable | High | Release verifier rejects missing/invalid public configuration | Operator name/contact/jurisdiction outstanding |

## PIPEDA-oriented principles

- Accountability: a verified operator and reachable privacy contact are mandatory release facts.
- Identifying purposes: discovery, account workspace, job extraction, tailoring, export, optional aggregate quality evaluation.
- Consent: account action is explicit; AI processing has just-in-time acknowledgement; optional quality signals are off by default.
- Limiting collection/use/disclosure: request payloads are purpose-bound and analytics are route-only after sanitization.
- Safeguards: RLS, server-only credentials, authorization headers, input caps, SSRF protection, no-store responses, minimized logs.
- Openness/access: public `/privacy` route, provider links, local deletion control, contact route once configured.

## Required owner sign-off before production

1. Legal/operator name.
2. Monitored privacy email.
3. Operating jurisdiction.
4. Minimum age.
5. Vercel operational-log retention for the active plan.
6. Anthropic commercial/API data settings for the active account.
