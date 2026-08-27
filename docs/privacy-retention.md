# Privacy retention register

Last reviewed: 2026-08-27

| Record | Current retention behavior | User control | Owner verification |
| --- | --- | --- | --- |
| Browser résumé | Until overwritten, browser data is cleared, or scoped deletion runs | Edit or clear locally | None |
| Account-synced base résumé | Only after explicit opt-in; remains until the separate synced-copy deletion control or account deletion | Turn sync off per browser, resolve conflicts, or delete the remote copy while retaining the local copy | Apply and verify `private_documents` migration before enabling production sync |
| Browser evidence/template choices | Until browser data is cleared or scoped deletion runs | Clear locally | None |
| Browser cover-letter drafts | Target-scoped local storage until replaced, individually removed, browser data is cleared, or scoped deletion runs | Remove one draft or clear current account's private browser data | None |
| Processing acknowledgement | Until policy version changes, browser data is cleared, or scoped deletion runs | Clear locally | None |
| Supabase auth/profile | Until account/record deletion under operator process | Contact privacy operator; product account-deletion UI is not yet implemented | Define request SLA and deletion runbook owner |
| Saved/dismissed listing IDs | In own profile row until changed or account deletion | UI changes saved/dismissed state | Define account deletion process |
| Custom posting and tailored résumé draft in app | Active React page/session state; no intended profile write | Navigate/reset/cancel | Confirm server function does not add payload persistence |
| Cover-letter request and response | Request-time server processing only; no intended application database write; target-specific response persists locally only | Cancel generation, remove target draft, or clear private browser data | Confirm provider/API retention against active Anthropic account settings |
| Quality daily aggregates | Migration deletes buckets older than 180 days when recording executes | Disable future signals | Confirm scheduled/traffic-independent cleanup strategy |
| Anthropic API inputs/outputs | Provider-published commercial/API default and exceptions apply | Contact operator for a request | Verify active plan/data settings and record DPA terms |
| Vercel Web Analytics reports | Varies by plan/reporting window | Aggregate only; no person-level product control | Record current plan/reporting window |
| Vercel operational logs | Varies by product and plan | Contact operator | Record current retention and any Log Drain destination |

Retention statements on the public notice must remain conditional where the repository cannot prove a provider setting. Never substitute a marketing promise for a verified contract or dashboard setting.
