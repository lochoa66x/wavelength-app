# P4.H1 — Exporter reliability and deployment-skew recovery

## Detailed execution prompt

Act as the senior product engineer responsible for Gigscapes’ evidence-first document export boundary. Diagnose and hotfix every résumé and cover-letter DOCX/PDF download path so an already-open browser tab cannot fail with a raw hashed-module URL after a new deployment. Preserve Gigscapes’ truth, privacy, and export-authorization contracts while making recovery understandable to a non-technical job seeker.

### Why this is the next priority

Production testers reached valuable, evidence-safe résumé and cover-letter outputs but encountered failures such as:

- `Failed to fetch dynamically imported module: https://gigscapes.com/assets/coverLetterDocx-<hash>.js`
- the equivalent cover-letter PDF module failure;
- a generic résumé PDF failure with no diagnosis;
- a résumé DOCX stale-exporter warning that did not protect unsaved tailored wording before refresh.

The most likely cause is deployment skew: the browser still holds an older application document whose lazy exporter URL no longer exists after a new build. This is not a résumé-content, AI-provider, or PDF-layout defect. Fix the loading and recovery boundary without weakening content validation or pulling heavy export libraries into the public landing bundle.

### User outcome

A user with a valid tailored résumé or cover-letter draft must experience one of two outcomes:

1. the selected DOCX/PDF exporter is ready and the download proceeds normally; or
2. Gigscapes explains that the open tab is out of date, protects the user’s work, offers an explicit refresh action, and never exposes a raw asset URL, chunk hash, stack trace, or JavaScript error.

No click may silently do nothing. No stale exporter failure may trigger an automatic reload.

### Scope

Cover these four production paths through one shared contract:

- tailored résumé → DOCX;
- tailored résumé → selectable/searchable PDF, including its print fallback;
- evidence-first cover letter → DOCX;
- evidence-first cover letter → selectable/searchable PDF.

Also cover proactive loading after a private result becomes available, error classification, recovery copy, accessible status UI, privacy-safe telemetry categories, regression tests, build output, export parity, and release documentation.

### Non-goals and invariants

- Do not change résumé or cover-letter wording, AI prompts, model/provider routing, evidence classification, fit/readiness logic, content hashes, export authorization, templates, presentation tokens, database schema, Supabase policies, job sources, analytics consent, or account behavior.
- Do not auto-refresh or auto-regenerate. A tailored résumé result is not guaranteed to survive refresh; the user must be told to copy its text first if they want to preserve that exact wording.
- Do not treat a browser print fallback as recovery for a missing exporter module or stale authorization. It may run only after the PDF module loaded successfully and direct rendering/downloading—not validation or module loading—failed.
- Do not make exporter libraries part of `/` or the initial public app route. Warm them only after a tailored résumé is mounted or a cover-letter plan exists.
- Do not log the error object, URL, résumé, letter, posting, identity, or free-form content. Log and emit only an allowlisted error category and bounded timing/outcome metadata already supported by the privacy contract.

### Required architecture

#### 1. Shared cached exporter loaders

Create one small module that owns all dynamic imports. Each loader must:

- cache one successful in-flight/resolved promise so repeated clicks cannot create duplicate imports;
- clear its cache after rejection so a deliberate retry is possible;
- expose a non-throwing `preload()` result with only `ready` or `failed` plus the in-memory error for local classification;
- preload each exporter’s heavy nested dependency (`docx` or `jspdf`), not merely its thin wrapper chunk;
- keep résumé and cover-letter exporter entry chunks lazy.

Expose loaders and grouped preload functions for all four paths. Components must no longer import exporter modules directly.

#### 2. Shared safe error taxonomy

Classify exporter failures into a fixed enum:

- `stale_exporter`: dynamic-module fetch, module-script import, ChunkLoad, or loading-chunk failures;
- `invalid_content`: identity, trusted export context, schema, render-plan, content-hash, or authorization mismatch;
- `browser_download`: Blob/Object URL/download permission or browser handoff failure;
- `serialization`: DOCX/jsPDF/packer/paragraph/run serialization failure;
- `unknown`: bounded fallback for everything else.

Map every category to candidate-facing copy without interpolating the original error. A stale notice must carry `refreshRequired: true`; all others must not.

#### 3. Draft-aware recovery copy

For a tailored résumé stale failure, say all of the following plainly:

- Gigscapes was updated while the result was open;
- the saved base résumé is safe;
- the user should copy the tailored text before refreshing if they want to preserve the exact wording;
- after refreshing, regenerate the draft and retry the download.

For a cover-letter stale failure, state that the saved résumé and browser-saved target-specific cover-letter draft are safe, then ask the user to refresh and retry.

Render an explicit **Refresh Gigscapes** button. The button may call `location.reload()` only after the user presses it. Do not hide or replace the copy-text controls.

#### 4. Proactive detection

- When résumé actions mount for a tailored result, warm both résumé DOCX and PDF exporters.
- When a cover-letter plan exists, warm both cover-letter DOCX and PDF exporters.
- If warm-up detects deployment skew, show the same accessible recovery notice before the user clicks download.
- Ignore ordinary warm-up failures until classified; do not produce unhandled promise rejections, loops, repeated imports, or state updates after unmount.

#### 5. PDF fallback boundary

Split résumé PDF export into two phases:

1. load the exporter;
2. create/download the direct PDF.

If phase 1 fails, show the shared notice and stop. If phase 2 fails with `stale_exporter` or `invalid_content`, show the shared notice and stop. Only other phase-2 failures may open the existing browser print fallback. If that fallback fails, classify it through the same shared notice contract.

Cover-letter PDF has no print fallback; it must use the same safe notice as every other exporter.

#### 6. Accessible UI and privacy-safe diagnostics

- Render errors with `role="alert"` and success/info messages with `role="status"`.
- Keep the recovery button keyboard reachable and clearly labeled.
- Do not place recovery instructions inside the résumé/letter preview or exported document.
- Console diagnostics may contain only artifact, format, and allowlisted category—not the Error object.
- Existing aggregate quality telemetry may receive the category but no URL or document content.

### Required tests

Add focused automated coverage for:

- every stale-module signature, including a realistic hashed Gigscapes asset URL;
- no raw URL, asset path, hash, JavaScript exception name, `undefined`, `null`, or object serialization in candidate copy;
- tailored-résumé copy-before-refresh guidance;
- cover-letter browser-draft safety guidance;
- successful loader promise deduplication;
- cache reset and successful retry after a rejected import;
- non-throwing preload failure;
- all four components using the centralized loaders;
- both exporter groups preloading at the correct private-result boundary;
- explicit refresh button and accessible status roles;
- no direct exporter import or raw `error.message` in download handlers;
- résumé PDF module-load failure skipping the print fallback;
- existing identity, readiness, authorization, selectable-text, pagination, canonical-parity, and cover-letter integrity checks remaining unchanged.

### Verification gate

Run, in this order:

1. focused exporter/recovery/component tests;
2. `npm run verify:exports`;
3. `npm run verify:cover-letters`;
4. the complete `npm test` suite;
5. `npm run build`;
6. `git diff --check`;
7. inspect the build manifest/output to confirm exporter wrappers plus `docx`/`jspdf` remain lazy and are absent from the landing import graph;
8. local desktop and 390 px signed-out route smoke with no console exception or horizontal overflow;
9. hands-on authenticated stale-tab test in Preview or Production: keep a valid result open across a new deployment, confirm the safe recovery notice, copy-before-refresh path, explicit refresh, regeneration, and successful retry for the affected format.

For representative generated files, retain the existing DOCX/PDF parity, selectable-text, page-count, visual-render, and no-object-artifact gates. Do not claim Microsoft Word, Google Docs, ATS-parser, or authenticated production coverage unless actually performed.

### Release and rollback

- Commit and deploy only after all local gates pass and release authorization is explicit.
- After deployment, record the exact commit, Vercel deployment, aliases, public smoke, and authenticated stale-tab result.
- Optional platform hardening: on an eligible Vercel plan, evaluate Skew Protection as defense in depth. A Vite app requires manual deployment-ID handling, so do not make this hotfix depend on that feature and do not substitute it for candidate-safe recovery. See [Vercel Skew Protection](https://vercel.com/docs/skew-protection) and [Vite advanced build base handling](https://vite.dev/guide/build.html#advanced-base-options).
- Roll back the UI/loader commit if exports regress. No database or user-data rollback should be necessary because this hotfix must introduce no migration or persistence change.

### Definition of done

The task is complete only when all four exporters use the shared loader and recovery contract, stale deployments cannot leak raw technical errors, résumé wording is protected before explicit refresh, cover-letter draft persistence is explained accurately, PDF fallback cannot mask a stale module or invalid authorization, all verification gates pass, and the pipeline/release checklist record exact evidence and remaining hands-on limits.
