# Guest-first Auth smoke test

Run this on desktop and at a mobile viewport (390 × 844 minimum). Use a private/incognito window for guest checks and two test accounts for ownership checks.

## Public discovery

1. Clear site storage and open `/app`. Confirm listings/search render without a sign-in redirect or full-page Auth loader.
2. Search for a recognized role/technology and a broad category. Change country, province/state, city, workplace type, and work arrangement. Refresh and confirm only non-sensitive preferences persist.
3. Load another listing page, open an original provider link, and verify visible source attribution.
4. Simulate an unavailable/expired session. Confirm public search remains usable and the account warning does not replace results.

## Account gates

As a guest, try save, saved jobs, add/edit résumé, URL import, screenshot import, pasted posting, tailor, evidence follow-up (when reachable), DOCX, PDF, and copied text. Confirm one contextual dialog appears, focus remains inside it, Escape closes it, and no private request runs first.

Request a magic link for save and tailoring:

1. Confirm the button disables while sending and the success copy says to check email without disclosing account existence.
2. Open the link in the same tab and then repeat with an email client/new tab. Confirm the allowlisted action/public listing resumes once.
3. Revisit the callback URL. Confirm the action does not repeat.
4. Tamper with the action, listing, timestamp, `next`, and absolute/protocol-relative URLs. Confirm the app falls back to `/app`.
5. Use an expired/already-used link. Confirm pending state clears and both “Request a new link” and public browsing work.

## Private boundaries

1. As Guest, query `public_listings`; verify only the documented public columns. Confirm `profiles` SELECT/UPDATE are denied.
2. As User A, save a job and preferences, add a local résumé, tailor, answer evidence, and export preliminary/final fixtures as appropriate.
3. As User B, verify User A's profile/saved jobs, résumé storage key, and evidence keys cannot be read or changed.
4. Call `/api/tailor`, `/api/job-intake`, and `/api/listing-enrichment` with no token and an invalid token. Confirm controlled 401 JSON and no privileged work.
5. Sign out from a private screen. Confirm private state clears and public discovery remains usable.

## Trusted export regression

Run `npm run verify:exports`, then manually verify final export needs canonical posting verification and a real identity; incomplete/stale evidence produces a labelled preliminary DOCX/PDF; direct PDF is selectable Letter text; no output contains `[object Object]`, `undefined`, `null`, metadata, IDs, tokens, or storage keys.
