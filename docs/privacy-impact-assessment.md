# Privacy impact assessment — foundation release

Date: 2026-08-27
Status: operator facts verified; cover-letter scope added and awaiting production release verification

## Purpose and necessity

Gigscapes finds public jobs and creates editable résumé and cover-letter drafts using evidence supplied by the person. A résumé contains identity, contact, employment, education, and skills data. The job posting is necessary to compare requirements. Confirmed evidence is optional and limited to five request/reusable records. Cover-letter generation reuses the reviewed posting, canonical résumé facts, confirmed evidence, and application assessment; a minimized current draft is sent only when the person explicitly regenerates wording.

## Material risks and controls

| Risk | Severity | Control | Residual issue |
| --- | --- | --- | --- |
| User does not realize an AI provider receives private content | High | One-time, versioned, scope-specific disclosure immediately before job intake, tailoring, and cover-letter generation; cancel retains work | Operator must keep provider wording current |
| Résumé leaks into analytics or logs | High | No custom résumé events; the only market-search dimensions are country and results/empty/failed outcome; `beforeSend` strips query/hash and suppresses auth callback; APIs log only stage/status/counts; private responses are `no-store` | Verify Vercel project log retention and drain configuration |
| Shared-device exposure | High | User-ID-scoped local keys, honest browser-only copy, scoped deletion control | Browser profile itself remains a security boundary |
| Unauthorized profile access | High | RLS, own-row authenticated policies, anon revocation, server-only secret key | Run Supabase advisors after every schema change |
| Unauthorized synced-résumé access or silent overwrite | High | Sync is opt-in; authenticated-only grants; own-user RLS for every operation; bounded payload/hash validation; revision compare-and-swap; explicit conflict choice; separate local and remote deletion | Apply the vault migration and complete anonymous/User A/User B production verification before calling sync operational |
| AI fabricates claims | High | Evidence-first prompt, deterministic validation/repair/fallback, user review before export | Model behavior remains probabilistic; exports need user review |
| Cover letter silently overstates motivation or fit | High | Every substantive paragraph carries exact résumé/posting citations; generic flattery, unsupported motivation, placeholders, and unsupported numbers are rejected; paragraph edits must be rechecked before export | Candidate still owns final review and submission |
| Excessive retention | Medium | No app database write for intake/tailoring payloads, local deletion, 180-day quality aggregate cleanup | Provider/hosting retention must be verified against contracted plan |
| Children provide résumé data | Medium | Public policy states a minimum age of 16 and the release verifier rejects an invalid configuration | Age assertion is policy-based rather than age-verification technology |
| Privacy contact is fake or unreachable | High | Release verifier requires Voynich Tech, Canada, and `hello@voynichtech.com` in public configuration | Operator must keep the monitored mailbox and escalation path current |

## PIPEDA-oriented principles

- Accountability: a verified operator and reachable privacy contact are mandatory release facts.
- Identifying purposes: discovery, account workspace, job extraction, résumé and cover-letter generation, local editing/export, optional user-enabled cross-device base-résumé sync, optional aggregate quality evaluation.
- Consent: account action is explicit; AI processing has just-in-time acknowledgement; optional quality signals are off by default.
- Limiting collection/use/disclosure: request payloads are purpose-bound; analytics routes are sanitized; and the optional market-search event carries only country plus results/empty/failed outcome, never search, city, résumé, posting, contact, or free-form content.
- Safeguards: RLS, server-only credentials, authorization headers, input caps, SSRF protection, no-store responses, minimized logs.
- Openness/access: public `/privacy` route, provider links, local deletion control, contact route once configured.

## Verified operator facts

1. Operator/legal name: Voynich Tech.
2. Monitored privacy email: `hello@voynichtech.com`.
3. Operating jurisdiction: Canada.
4. Minimum permitted age: 16.

## Remaining operational confirmations

1. Vercel operational-log retention for the active plan.
2. Anthropic commercial/API data settings for the active account.
3. Incident commander, backup contact, and counsel/notification path.
