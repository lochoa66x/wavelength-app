# Bring-your-own-posting state contract

Updated: 2026-08-25

## Purpose

Gigscapes can tailor multiple postings in one authenticated workspace without allowing asynchronous work from an earlier posting to contaminate the next one. URL, screenshots, and pasted text are separate source modes under the same contract.

## Session model

`src/customJobSession.js` owns three values:

- `sourceId`: changes whenever the user chooses a new source or leaves the flow.
- `requestId`: changes whenever extraction or tailoring starts, retries, or is invalidated.
- `mode`: `url`, `screenshots`, or `paste`.

Every request carries the current IDs, mode, and an `AbortSignal`. A response may update React state only when all values still match and the signal is not aborted. Starting a new source or request aborts the previous controller before issuing another request.

## Reset boundary

A new posting clears job-specific input, uploaded files, extracted facts, source conflicts, screenshot confirmation, target-scoped evidence, tailored output, status, and errors. It does not delete or replace:

- the signed-in account;
- the locally saved base résumé;
- reusable candidate evidence that already passed the account/scope/confirmation filters;
- template preferences for unrelated targets.

## User paths

- Switching an intake tab starts a new source session.
- **Change source** restarts the current mode with a clean source.
- **Use another posting** starts clean pasted-text intake after a completed result.
- Back navigation invalidates active work before returning to matches.

Screenshot confirmation is considered only when the active brief declares screenshot provenance. A URL or pasted posting can never be blocked by confirmation state from a previous screenshot set.

## Verification

`src/customJobSession.test.js` covers cross-mode invalidation, retries, disposal, abort propagation, and flow wiring. The production release gate also includes a real second-posting smoke test when an approved authenticated session is available; otherwise that production-only path is recorded as unverified rather than simulated with private data.
