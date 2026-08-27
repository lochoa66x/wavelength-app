# Gigscapes privacy data map

Last reviewed: 2026-08-27
Policy version: `2026-08-27.2`

This map describes the implementation in this repository. It is not a claim about provider systems beyond their published documentation or the operator's configured accounts.

| Flow | Data | Browser | Gigscapes server | Supabase | Anthropic | Vercel |
| --- | --- | --- | --- | --- | --- | --- |
| Public discovery | Search term, location, workplace filters, public listing IDs | Guest preferences may be local | Public listing request | `public.public_listings` exposes an allowlisted discovery projection | No | Page view after URL sanitization |
| Authentication | Email, Supabase session | Supabase client manages the session | Auth exchange | Auth user and profile | No | `/auth/callback` analytics is suppressed |
| Account workspace | Search criteria, saved/dismissed listing IDs, onboarding state | UI state | Authenticated profile request | Own `profiles` row | No | Route-only page view |
| Base résumé | Résumé text | Local storage, keyed by Supabase user ID; browser-only remains the default | Sent only for a requested tailoring operation | Optional `private_documents` copy only after explicit sync opt-in; own-user RLS and revision checks; legacy profile `resume_text` is cleared | Included in requested tailoring call | Not included in analytics; API response is `no-store` |
| Candidate evidence | Confirmed answers, target key | Local storage, max five request records/reusable records | Sent only with a requested tailoring call | No intended persistence | Included in requested tailoring call | Not included in analytics |
| Custom job intake | Pasted text, validated public URL contents, or compressed screenshots | React state for the active workflow | Authenticated `/api/job-intake`; no application database write | Auth verification only | Included in extraction call | Not included in analytics; response is `no-store` |
| Tailoring | Résumé, reviewed job, verified evidence | Generated draft in React state; export initiated locally | Authenticated `/api/tailor` | Trusted listing read when a listing ID is used | Analysis, draft, and truth-repair calls | Operational metadata only; response is `no-store` |
| Cover-letter generation | Résumé, reviewed job, verified evidence, application assessment, voice/length choice; a minimized current draft for requested paragraph regeneration | Target-specific draft in user-ID-scoped local storage; edits and exports stay local | Authenticated `/api/cover-letter`; no application database write | Trusted listing read when a listing ID is used | Generation and at most one evidence-repair call | Coarse duration/outcome/count metadata only; response is `no-store` |
| Optional quality signals | Fixed enums/bands and coarse counts | Consent flag local, off by default | `/api/quality-signal` with strict allowlist | Daily private aggregate, service-role only | No | Hosting log metadata; no résumé text |
| Web Analytics | Route, referrer, coarse device/geography as documented by Vercel | Vercel client; no Gigscapes cookie | Vercel intake | No | No | Query/hash stripped; auth callback dropped |

## Local storage inventory

- `gigscapes:resume:v1:<user-id>` — résumé text.
- `gigscapes:resume-sync:v1:<encoded-user-id>` — versioned per-browser opt-in, known revision/hash, and pending flag; no résumé text.
- `gigscapes:candidate-evidence:v1:<encoded-user-id>:<target>` — application evidence.
- `gigscapes:reusable-candidate-evidence:v1:<encoded-user-id>` — user-confirmed reusable evidence.
- `gigscapes:resume-template:v1:<encoded-user-id>:<target>` — presentation choice.
- `gigscapes:cover-letter:v1:<encoded-user-id>:<target>` — target-specific cover-letter plan, exact citations, voice/length choice, and local verification state.
- `gigscapes:private-processing-ack:v1` — policy version, scopes, acknowledgement timestamp; no résumé content.
- `gigscapes:guest-preferences:v1` — non-private discovery preferences.
- `gigscapes:quality-signal-consent:v1` — optional quality-signal choice.
- Supabase SDK-managed auth/session storage — not removed by the résumé-data control.

## Deletion boundary

`clearPrivateBrowserData` removes only the signed-in account's résumé, candidate evidence, reusable evidence, template selections, target-specific cover-letter drafts, sync preference, and processing acknowledgement. It deliberately does not call `localStorage.clear()` and does not remove auth state, another account's data, guest search preferences, quality-signal consent, saved jobs, an account-synced résumé, or provider-retained request copies. Remote deletion is a separate two-step control; stopping sync on one browser leaves the remote row intact.
