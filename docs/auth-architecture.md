# Guest-first Auth architecture

## Boundary

`/app` is public and mounts immediately. Supabase session validation runs in parallel; its absence, expiry, network failure, or clock skew cannot replace public discovery with a loading screen or redirect. `useProfile` returns without a database request until a verified session has a user ID.

Guests can browse, search, filter, paginate, read summaries and attribution, and follow original provider links. Their versioned local preference record contains only keyword/category and geographic/workplace filters. Dismissed listings are memory-only for guests.

Saved jobs, synchronized preferences, résumé storage/editing, posting intake, screenshots, pasted posting text, tailoring, evidence, exports, copied tailored text, and workspace views require an account. Résumés and evidence remain account-keyed in browser storage by default; server requests include a current bearer token and the endpoint validates it again.

P3.1 adds an explicit, reversible base-résumé sync option after the local copy loads. The browser never enables sync silently. `public.private_documents` permits authenticated CRUD only for rows where `auth.uid() = user_id`; separate SELECT, INSERT, UPDATE, and DELETE policies protect the browser path. A revision compare-and-swap contract prevents last-write-wins replacement: divergent local and remote copies require the person to choose. Cover letters, evidence, template choices, and generated target documents remain browser-local in this phase.

## Central action gate

`src/accountActions.js` owns the allowlist, contextual copy, schema validation, TTL, storage, safe return paths, and continuation routing. UI components call `requestAccountAction(action, options)` from `AuthProvider`.

- A verified session executes the callback immediately.
- A guest receives one labelled modal. Escape, close, backdrop click, and focus containment are supported.
- The pending record is version 1, lives in `sessionStorage`, expires after 15 minutes, and is removed when invalid, cancelled, completed, or consumed.
- The record contains only action, optional public listing ID, `/app` return path, and creation timestamp. Unknown fields invalidate it.
- Because email clients often open magic links in a new tab, the callback URL mirrors only those non-sensitive allowlisted fields. The callback validates them with the same schema/TTL before reconstructing `sessionStorage`. No résumé/posting text, screenshots, OCR, email, evidence, session, access token, refresh token, or secret is put in storage or the callback query.
- Actions needing sensitive input return to the authenticated screen and request that input again.

## Magic links

`signInWithOtp` sends a magic link with `shouldCreateUser: true`; this does not expose whether an address already exists. The success screen does not echo the email. The send button is disabled during the request, successful forms cannot immediately resend, and a session-scoped 30-second cooldown handles repeated UI submissions. Provider errors are mapped to user-safe copy.

The callback accepts only `/app` paths, restores a valid pending action once, and uses replace navigation. Invalid, expired, or already-used links clear pending state and offer both a fresh link and public browsing. Email OTP/code entry is not implemented or enabled.

## Supabase and server boundary

The browser has only the URL and publishable key. `SUPABASE_SECRET_KEY` is read exclusively below `api/` by a server-only client created after JWT authentication.

The public browser query names every public field. The migration creates `public.public_listings` with `security_invoker = true`, explicit `anon`/`authenticated` grants, and a public-row SELECT policy. It revokes client access to operational listing columns. During the code/migration rollout window, a missing-view error may fall back to the same explicit columns on the existing anonymous-readable table.

Profiles have RLS enabled, no `anon` grants, and same-user policies using `(select auth.uid()) = id`. The schema uses the profile primary key as its ownership key; this is the equivalent of a separate `user_id` ownership predicate. `private_documents` uses an indexed `user_id` ownership key, explicit authenticated grants, and four own-user RLS policies; UPDATE has both `USING` and `WITH CHECK`, with a matching SELECT policy. No `auth.role()`, editable `user_metadata`, or `SECURITY DEFINER` bypass is introduced.

## Manual Supabase configuration

No Dashboard setting was changed by the implementation. Before release, confirm:

1. Site URL is the production origin.
2. Redirect allowlist contains exact production and development callback URLs, for example `https://your-domain.example/auth/callback` and `http://localhost:5173/auth/callback`. Add preview wildcards only where required.
3. The magic-link email template uses `{{ .RedirectTo }}` when a redirect option is supplied.
4. Email provider/SMTP limits and delivery are suitable for production. The local UI cooldown is not a replacement for provider rate limits.
5. Apply the checked-in migration through the normal CLI/release workflow, then test grants and RLS as `anon`, User A, and User B.
