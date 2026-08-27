# Privacy incident-response checklist

## Immediate containment

1. Stop the affected request path using the narrowest reversible control.
2. Rotate any exposed server-only key; never rotate a public publishable key as a substitute for fixing authorization.
3. Preserve relevant metadata without copying résumé, posting, token, or AI response bodies into tickets or chat.
4. Confirm whether the issue affects browser-local data, Supabase rows, Anthropic requests, Vercel logs/analytics, or exports.

## Assessment

- Record detection time, affected deployment SHA, route, provider, time window, and coarse count.
- Determine whether personal information was accessed, changed, disclosed, lost, or retained beyond policy.
- Identify affected jurisdictions and whether there is a real risk of significant harm.
- Consult qualified privacy/legal counsel for notification duties. This runbook is not a legal opinion.

## Eradication and recovery

- Patch the narrow cause and add a regression test.
- Re-run focused security tests, the full suite, export verification, production build, and signed-out/signed-in browser smoke tests.
- Check Supabase Security/Performance advisors and Vercel deployment/log health.
- Restore service only from a verified commit and record the exact deployed SHA.

## Communication and follow-up

- Notify the accountable privacy owner and providers through their incident channels.
- Notify affected people and regulators when required, using factual scope and useful protective steps.
- Record decisions, evidence, retention/deletion actions, and the owner of every follow-up.
- Update the data map, PIA, retention register, provider register, public notice, and processing acknowledgement version when the incident changes disclosed practices, including résumé and cover-letter scopes.

## Operational ownership still required

Voynich Tech and `hello@voynichtech.com` are the public operator/privacy contact. The internal incident commander, backup contact, counsel path, and notification SLA must still be assigned and kept outside this public repository.
