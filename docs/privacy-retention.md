# Privacy retention register

Last reviewed: 2026-08-27

| Record | Current retention behavior | User control | Owner verification |
| --- | --- | --- | --- |
| Browser résumé | Until overwritten, browser data is cleared, or scoped deletion runs | Edit or clear locally | None |
| Browser evidence/template choices | Until browser data is cleared or scoped deletion runs | Clear locally | None |
| Processing acknowledgement | Until policy version changes, browser data is cleared, or scoped deletion runs | Clear locally | None |
| Supabase auth/profile | Until account/record deletion under operator process | Contact privacy operator; product account-deletion UI is not yet implemented | Define request SLA and deletion runbook owner |
| Saved/dismissed listing IDs | In own profile row until changed or account deletion | UI changes saved/dismissed state | Define account deletion process |
| Custom posting and tailored draft in app | Active React page/session state; no intended profile write | Navigate/reset/cancel | Confirm server function does not add payload persistence |
| Quality daily aggregates | Migration deletes buckets older than 180 days when recording executes | Disable future signals | Confirm scheduled/traffic-independent cleanup strategy |
| Anthropic API inputs/outputs | Provider-published commercial/API default and exceptions apply | Contact operator for a request | Verify active plan/data settings and record DPA terms |
| Vercel Web Analytics reports | Varies by plan/reporting window | Aggregate only; no person-level product control | Record current plan/reporting window |
| Vercel operational logs | Varies by product and plan | Contact operator | Record current retention and any Log Drain destination |

Retention statements on the public notice must remain conditional where the repository cannot prove a provider setting. Never substitute a marketing promise for a verified contract or dashboard setting.
